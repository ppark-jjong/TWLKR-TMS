# backend/app/services/dashboard_service.py
import re
import time
import pytz
from datetime import datetime, timezone, timedelta
from typing import List, Tuple, Optional, Dict, Any
from fastapi import HTTPException, status
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.dashboard_remark_repository import DashboardRemarkRepository
from app.repositories.dashboard_lock_repository import DashboardLockRepository
from app.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardResponse,
    DashboardDetail,
    DriverAssignment,
    FieldsUpdate,
)
from app.utils.datetime_helper import KST, get_date_range_from_datetime
from app.utils.constants import (
    MESSAGES,
    STATUS_TEXT_MAP,
    TYPE_TEXT_MAP,
    WAREHOUSE_TEXT_MAP,
    DEPARTMENT_TEXT_MAP,
)
from app.utils.logger import log_info, log_error
from app.utils.exceptions import PessimisticLockException

class DashboardService:
    def __init__(
        self, 
        repository: DashboardRepository, 
        remark_repository: Optional[DashboardRemarkRepository] = None,
        lock_repository: Optional[DashboardLockRepository] = None
    ):
        self.repository = repository
        self.remark_repository = remark_repository
        self.lock_repository = lock_repository
        self.kr_timezone = pytz.timezone("Asia/Seoul")
        self._date_range_cache = None
        self._cache_timestamp = None
        self._cache_ttl = 3600  # 캐시 유효시간 1시간

    def get_dashboard_list_by_date(self, start_date: datetime, end_date: datetime) -> List[DashboardResponse]:
        """ETA 기준으로 날짜 범위 내 대시보드 목록 조회"""
        try:
            dashboards = self.repository.get_dashboard_list_by_date(start_date, end_date)
            return [DashboardResponse.model_validate(d) for d in dashboards]
        except Exception as e:
            log_error(e, "대시보드 목록 조회 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="목록 조회 중 오류가 발생했습니다",
            )

    def get_dashboard_detail(self, dashboard_id: int) -> DashboardDetail:
        """대시보드 상세 정보 조회 (메모 포함)"""
        try:
            # 대시보드 정보 조회
            dashboard = self.repository.get_dashboard_detail(dashboard_id)
            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다",
                )

            # 메모 목록 조회
            remarks = []
            if self.remark_repository:
                remarks = self.remark_repository.get_remarks_by_dashboard_id(dashboard_id)

            # DashboardDetail 모델로 변환
            detail = DashboardDetail.model_validate(dashboard)
            detail.remarks = [RemarkResponse.model_validate(r) for r in remarks]

            return detail
        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 상세 조회 실패", {"id": dashboard_id})
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="상세 정보 조회 중 오류가 발생했습니다",
            )

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 (캐싱 적용)"""
        try:
            current_time = time.time()

            # 캐시가 유효한 경우 캐시된 값 반환
            if (
                self._date_range_cache is not None
                and self._cache_timestamp is not None
                and current_time - self._cache_timestamp < self._cache_ttl
            ):
                return self._date_range_cache

            # 캐시가 없거나 만료된 경우 새로 조회
            oldest_date, latest_date = self.repository.get_date_range()

            # 결과 캐싱
            self._date_range_cache = (oldest_date, latest_date)
            self._cache_timestamp = current_time

            return oldest_date, latest_date
        except Exception as e:
            log_error(e, "날짜 범위 조회 실패")
            now = datetime.now(self.kr_timezone)
            return now - timedelta(days=30), now

    def create_dashboard(
        self, dashboard_data: DashboardCreate, department: str, user_id: Optional[str] = None
    ) -> DashboardDetail:
        """대시보드 생성 (메모 포함)"""
        try:
            # Pydantic 모델을 딕셔너리로 변환
            data_dict = dashboard_data.model_dump()

            # 부서 및 현재 시간 설정
            now = datetime.now(self.kr_timezone)
            data_dict["department"] = department
            data_dict["create_time"] = now
            data_dict["status"] = "WAITING"  # 초기 상태는 항상 대기

            # 메모 내용 추출 후 제거 (별도 처리를 위해)
            remark_content = data_dict.pop("remark", None)
            
            # 대시보드 생성
            dashboard = self.repository.create_dashboard(data_dict)
            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="대시보드 생성에 실패했습니다",
                )

            # 메모 내용이 있는 경우 메모 생성
            if remark_content and self.remark_repository:
                self.remark_repository.create_remark(
                    dashboard.dashboard_id, remark_content, user_id or "시스템"
                )

            # 생성된 대시보드 상세 정보 반환
            return self.get_dashboard_detail(dashboard.dashboard_id)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 생성 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 생성 중 오류가 발생했습니다",
            )

    def update_dashboard_fields(
        self, 
        dashboard_id: int, 
        fields_update: FieldsUpdate, 
        user_id: str,
        client_version: Optional[int] = None  # 클라이언트 버전 파라미터는 호환성을 위해 유지
    ) -> DashboardDetail:
        """대시보드 필드 업데이트 (비관적 락 적용)"""
        try:
            # 필드 값 유효성 검증
            fields = fields_update.model_dump(exclude_unset=True)

            # 우편번호 검증
            if "postal_code" in fields and (
                not fields["postal_code"].isdigit() or len(fields["postal_code"]) != 5
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="유효하지 않은 우편번호입니다",
                )

            # 연락처 검증
            if "contact" in fields and not bool(
                re.match(r"^\d{2,3}-\d{3,4}-\d{4}$", fields["contact"])
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="올바른 연락처 형식이 아닙니다",
                )

            # ETA 검증
            if "eta" in fields and fields["eta"] <= datetime.now(self.kr_timezone):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ETA는 현재 시간 이후여야 합니다",
                )

            # 비관적 락 획득 시도
            try:
                lock = self.lock_repository.acquire_lock(dashboard_id, user_id, "EDIT")
                if not lock:
                    raise PessimisticLockException("다른 사용자가 수정 중입니다")
            except PessimisticLockException as e:
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=f"다른 사용자가 수정 중입니다: {e.locked_by if hasattr(e, 'locked_by') else ''}",
                )

            try:
                # FOR UPDATE 락 획득 (데이터베이스 레벨 잠금)
                dashboard = self.repository.acquire_lock_for_update(dashboard_id)
                if not dashboard:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="대시보드를 찾을 수 없습니다",
                    )
                
                # 필드 업데이트
                updated_dashboard = self.repository.update_dashboard_fields(dashboard_id, fields)
                if not updated_dashboard:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="대시보드를 찾을 수 없습니다",
                    )
                
                # 변경 사항 커밋
                self.repository.db.commit()
                
                # 상세 정보 반환
                return self.get_dashboard_detail(dashboard_id)
                
            except Exception as e:
                # 오류 발생 시 롤백
                self.repository.db.rollback()
                raise
            finally:
                # 락 해제 (예외 발생 여부와 무관하게 실행)
                try:
                    self.lock_repository.release_lock(dashboard_id, user_id)
                except Exception as e:
                    log_error(e, "락 해제 실패", {"id": dashboard_id})

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "필드 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="필드 업데이트 중 오류가 발생했습니다",
            )

    def update_status(
        self,
        dashboard_id: int,
        status: str,
        user_id: str,
        client_version: Optional[int] = None,  # 클라이언트 버전 파라미터는 호환성을 위해 유지
        is_admin: bool = False,
    ) -> DashboardDetail:
        """상태 업데이트 (비관적 락 적용)"""
        try:
            # 상태 유효성 검증
            if status not in STATUS_TEXT_MAP.keys():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"유효하지 않은 상태입니다: {status}",
                )

            # 현재 시간 (KST)
            current_time = datetime.now(self.kr_timezone)

            # 비관적 락 획득 시도
            try:
                lock = self.lock_repository.acquire_lock(dashboard_id, user_id, "STATUS")
                if not lock:
                    raise HTTPException(
                        status_code=status.HTTP_423_LOCKED,
                        detail="현재 다른 사용자가 상태 변경 중입니다",
                    )
            except PessimisticLockException as e:
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=f"다른 사용자가 상태 변경 중입니다: {e.locked_by if hasattr(e, 'locked_by') else ''}",
                )

            try:
                # FOR UPDATE 락 획득 (데이터베이스 레벨 잠금)
                dashboard = self.repository.acquire_lock_for_update(dashboard_id)
                if not dashboard:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="대시보드를 찾을 수 없습니다",
                    )
                
                # 관리자가 아닐 경우, 상태 변경 규칙 검증
                if not is_admin:
                    # 배차 정보 확인
                    if not dashboard.driver_name or not dashboard.driver_contact:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="배차 담당자가 할당되지 않아 상태를 변경할 수 없습니다",
                        )
                    
                    # 상태 변경 규칙 검증
                    allowed_transitions = {
                        "WAITING": ["IN_PROGRESS", "CANCEL"],
                        "IN_PROGRESS": ["COMPLETE", "ISSUE", "CANCEL"],
                        "COMPLETE": [],
                        "ISSUE": [],
                        "CANCEL": [],
                    }
                    
                    if status not in allowed_transitions.get(dashboard.status, []):
                        status_text_map = {
                            "WAITING": "대기",
                            "IN_PROGRESS": "진행",
                            "COMPLETE": "완료",
                            "ISSUE": "이슈",
                            "CANCEL": "취소",
                        }
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"{status_text_map[dashboard.status]} 상태에서는 "
                            f"{status_text_map[status]}(으)로 변경할 수 없습니다",
                        )
                
                # 상태 업데이트
                updated_dashboard = self.repository.update_dashboard_status(
                    dashboard_id, status, current_time
                )
                if not updated_dashboard:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="대시보드를 찾을 수 없습니다",
                    )
                
                # 변경 사항 커밋
                self.repository.db.commit()
                
                # 상세 정보 반환
                return self.get_dashboard_detail(dashboard_id)
                
            except Exception as e:
                # 오류 발생 시 롤백
                self.repository.db.rollback()
                raise
            finally:
                # 락 해제 (예외 발생 여부와 무관하게 실행)
                try:
                    self.lock_repository.release_lock(dashboard_id, user_id)
                except Exception as e:
                    log_error(e, "락 해제 실패", {"id": dashboard_id})

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "상태 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="상태 업데이트 중 오류가 발생했습니다",
            )

    def assign_driver(
        self, 
        assignment: DriverAssignment, 
        user_id: str,
        client_versions: Optional[Dict[int, int]] = None  # 클라이언트 버전 딕셔너리는 호환성을 위해 유지
    ) -> List[DashboardResponse]:
        """배차 처리 (비관적 락 적용)"""
        try:
            log_info("배차 처리 시작", {"dashboard_ids": assignment.dashboard_ids})

            # 연락처 형식 검증
            if not bool(
                re.match(r"^\d{2,3}-\d{3,4}-\d{4}$", assignment.driver_contact)
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="올바른 연락처 형식이 아닙니다",
                )

            # 여러 대시보드에 대한 락 획득 시도
            acquired_ids = []
            try:
                # 1. 애플리케이션 레벨 락 획득
                acquired_ids = self.lock_repository.acquire_locks_for_multiple_dashboards(
                    assignment.dashboard_ids, user_id, "ASSIGN"
                )
                
                if not acquired_ids or len(acquired_ids) != len(assignment.dashboard_ids):
                    missing_ids = set(assignment.dashboard_ids) - set(acquired_ids)
                    raise HTTPException(
                        status_code=status.HTTP_423_LOCKED,
                        detail=f"일부 대시보드({missing_ids})에 대한 락 획득에 실패했습니다. 다른 사용자가 수정 중입니다.",
                    )
                
                # 2. 데이터베이스 레벨 락 획득
                locked_dashboards = self.repository.acquire_locks_for_update(assignment.dashboard_ids)
                
                # 3. 배차 정보 업데이트
                updated_dashboards = self.repository.assign_driver(
                    assignment.dashboard_ids,
                    assignment.driver_name,
                    assignment.driver_contact
                )
                
                if len(updated_dashboards) != len(assignment.dashboard_ids):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="일부 대시보드를 찾을 수 없습니다",
                    )
                
                # 4. 변경 사항 커밋
                self.repository.db.commit()
                
                return [DashboardResponse.model_validate(d) for d in updated_dashboards]
                
            except Exception as e:
                # 오류 발생 시 롤백
                self.repository.db.rollback()
                raise
            finally:
                # 모든 락 해제 
                for dashboard_id in acquired_ids:
                    try:
                        self.lock_repository.release_lock(dashboard_id, user_id)
                    except Exception as e:
                        log_error(e, "락 해제 실패", {"id": dashboard_id})

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "배차 처리 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=MESSAGES["DASHBOARD"]["ASSIGN_ERROR"],
            )

    def delete_dashboards(self, dashboard_ids: List[int]) -> int:
        """대시보드 삭제 (관리자 전용)"""
        try:
            log_info(f"대시보드 삭제 요청: {dashboard_ids}")
            deleted = self.repository.delete_dashboards(dashboard_ids)
            self.repository.db.commit()
            return deleted
        except Exception as e:
            self.repository.db.rollback()
            log_error(e, "대시보드 삭제 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="삭제 처리 중 오류가 발생했습니다",
            )

    def search_dashboards_by_order_no(self, order_no: str) -> List[DashboardResponse]:
        """주문번호로 대시보드 검색"""
        try:
            dashboards = self.repository.search_dashboards_by_order_no(order_no)
            return [DashboardResponse.model_validate(d) for d in dashboards]
        except Exception as e:
            log_error(e, "주문번호 검색 실패", {"order_no": order_no})
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="주문번호 검색 중 오류가 발생했습니다",
            )

    def get_dashboard_with_status_check(self, dashboard_id: int) -> DashboardDetail:
        """대시보드 정보 조회 및 상태 확인 (낙관적 락 의존도 제거)"""
        try:
            # 대시보드 조회
            dashboard = self.get_dashboard_detail(dashboard_id)
            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다"
                )
            
            # 락 정보 확인
            lock_info = None
            if self.lock_repository:
                lock_info = self.lock_repository.get_lock_info(dashboard_id)
            
            # 락 정보가 있으면 읽기 전용 모드로 제공
            is_locked = lock_info is not None
            
            # 상세 정보에 락 상태 추가
            dashboard_dict = dashboard.model_dump()
            dashboard_dict["is_locked"] = is_locked
            if is_locked:
                dashboard_dict["locked_by"] = lock_info.locked_by
                dashboard_dict["lock_type"] = lock_info.lock_type
                dashboard_dict["lock_expires_at"] = lock_info.expires_at.isoformat()
            
            return DashboardDetail.model_validate(dashboard_dict)
            
        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 상태 확인 실패", {"id": dashboard_id})
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 상태 확인 중 오류가 발생했습니다",
            )