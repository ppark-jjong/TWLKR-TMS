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
from app.utils.exceptions import PessimisticLockException, OptimisticLockException


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

    # 기존 메서드들...

    def update_status(
        self,
        dashboard_id: int,
        status: str,
        user_id: str,
        client_version: Optional[int] = None,  # 클라이언트 버전 파라미터 추가
        is_admin: bool = False,
    ) -> DashboardDetail:
        """상태 업데이트 (비관적 락 + 낙관적 락 적용)"""
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
            except Exception as e:
                log_error(e, "상태 변경 락 획득 실패")
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail="락 획득에 실패했습니다. 잠시 후 다시 시도해주세요.",
                )

            try:
                # 대시보드 상세 정보 조회 (현재 상태 확인)
                dashboard = self.repository.get_dashboard_detail(dashboard_id)
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
                
                # 낙관적 락을 포함한 상태 업데이트
                updated_dashboard, conflict = self.repository.update_dashboard_status_with_version(
                    dashboard_id, 
                    status, 
                    current_time,
                    client_version  # 클라이언트 버전 전달
                )
                
                if updated_dashboard is None:
                    # 레코드가 없는 경우
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="대시보드를 찾을 수 없습니다",
                    )
                
                if conflict:
                    # 낙관적 락 충돌인 경우 - 현재 버전 정보와 함께 예외 발생
                    raise OptimisticLockException(
                        "다른 사용자가 이미 수정하여 버전이 변경되었습니다. 최신 데이터를 확인하세요.",
                        current_version=updated_dashboard.version
                    )
                
                # 업데이트된 대시보드 상세 정보 반환
                result = self.get_dashboard_detail(dashboard_id)
                return result
                
            finally:
                # 락 해제 (예외 발생 여부와 무관하게 실행)
                try:
                    self.lock_repository.release_lock(dashboard_id, user_id)
                except Exception as e:
                    log_error(e, "락 해제 실패", {"id": dashboard_id})

        except (HTTPException, OptimisticLockException):
            raise
        except Exception as e:
            log_error(e, "상태 업데이트 실패")
            raise HTTPException(
status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="상태 업데이트 중 오류가 발생했습니다",
            )

    def update_dashboard_fields(
        self, 
        dashboard_id: int, 
        fields_update: FieldsUpdate, 
        user_id: str,
        client_version: Optional[int] = None  # 클라이언트 버전 파라미터 추가
    ) -> DashboardDetail:
        """대시보드 필드 업데이트 (비관적 락 + 낙관적 락 적용)"""
        try:
            # 필드 값 유효성 검증
            fields = fields_update.model_dump(exclude_unset=True, exclude={"version"})

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
            except Exception as e:
                log_error(e, "필드 수정 락 획득 실패")
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail="락 획득에 실패했습니다. 잠시 후 다시 시도해주세요.",
                )

            try:
                # 낙관적 락을 포함한 필드 업데이트
                updated_dashboard, conflict = self.repository.update_dashboard_fields_with_version(
                    dashboard_id, 
                    fields,
                    client_version  # 클라이언트 버전 전달
                )
                
                if updated_dashboard is None:
                    # 레코드가 없는 경우
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="대시보드를 찾을 수 없습니다",
                    )
                
                if conflict:
                    # 낙관적 락 충돌인 경우 - 현재 버전 정보와 함께 예외 발생
                    raise OptimisticLockException(
                        "다른 사용자가 이미 수정하여 버전이 변경되었습니다. 최신 데이터를 확인하세요.",
                        current_version=updated_dashboard.version
                    )
                
                # 업데이트된 대시보드 상세 정보 반환
                result = self.get_dashboard_detail(dashboard_id)
                return result
                
            finally:
                # 락 해제 (예외 발생 여부와 무관하게 실행)
                try:
                    self.lock_repository.release_lock(dashboard_id, user_id)
                except Exception as e:
                    log_error(e, "락 해제 실패", {"id": dashboard_id})

        except (HTTPException, OptimisticLockException):
            raise
        except Exception as e:
            log_error(e, "필드 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="필드 업데이트 중 오류가 발생했습니다",
            )

    def assign_driver(
        self, 
        assignment: DriverAssignment, 
        user_id: str,
        client_versions: Optional[Dict[int, int]] = None  # 클라이언트 버전 딕셔너리 추가
    ) -> List[DashboardResponse]:
        """배차 처리 (비관적 락 + 낙관적 락 적용)"""
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
            acquired_ids = self.repository.acquire_locks_for_multiple_dashboards(
                assignment.dashboard_ids, user_id, "ASSIGN"
            )
            
            if not acquired_ids or len(acquired_ids) != len(assignment.dashboard_ids):
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail="일부 대시보드에 대한 락 획득에 실패했습니다. 다른 사용자가 수정 중입니다.",
                )

            try:
                # 낙관적 락을 포함한 배차 처리
                updated_dashboards, conflict_ids = self.repository.assign_driver_with_version(
                    assignment.dashboard_ids,
                    assignment.driver_name,
                    assignment.driver_contact,
                    client_versions  # 클라이언트 버전 딕셔너리 전달
                )
                
                # 낙관적 락 충돌이 있는 경우
                if conflict_ids:
                    # 충돌 발생한 대시보드 ID 목록 로깅
                    log_info(f"낙관적 락 충돌 발생: 대시보드 ID {conflict_ids}")
                    
                    # 충돌 정보 포함하여 예외 발생
                    raise OptimisticLockException(
                        f"일부 대시보드({len(conflict_ids)}개)에 대해 다른 사용자가 이미 수정하여 버전이 변경되었습니다.",
                        current_version=0  # 여러 건이므로 특정 버전 지정 불가
                    )
                
                if len(updated_dashboards) != len(assignment.dashboard_ids):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="일부 대시보드를 찾을 수 없습니다",
                    )

                return [DashboardResponse.model_validate(d) for d in updated_dashboards]
                
            finally:
                # 모든 락 해제 
                for dashboard_id in acquired_ids:
                    try:
                        self.lock_repository.release_lock(dashboard_id, user_id)
                    except Exception as e:
                        log_error(e, "락 해제 실패", {"id": dashboard_id})

        except (HTTPException, OptimisticLockException):
            raise
        except Exception as e:
            log_error(e, "배차 처리 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=MESSAGES["DASHBOARD"]["ASSIGN_ERROR"],
            )

    def get_dashboard_with_version_check(self, dashboard_id: int, client_version: int = None) -> Tuple[DashboardDetail, bool]:
        """
        대시보드 정보 조회 시 버전 확인
        
        Returns:
            Tuple[DashboardDetail, bool]: 대시보드 정보와 최신 버전 여부
        """
        dashboard = self.repository.get_dashboard_detail(dashboard_id)
        if not dashboard:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="대시보드를 찾을 수 없습니다"
            )
        
        # 클라이언트 버전과 서버 버전 비교
        # 클라이언트 버전이 없거나, 서버 버전과 정확히 일치하면 최신 상태
        is_latest = client_version is None or dashboard.version == client_version
        
        return self.get_dashboard_detail(dashboard_id), is_latest