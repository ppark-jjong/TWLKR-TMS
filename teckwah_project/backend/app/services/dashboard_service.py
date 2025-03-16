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
from app.utils.logger import log_info, log_error, log_warning
from app.utils.exceptions import OptimisticLockException, PessimisticLockException


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

    def get_dashboard_list_by_date(
        self, start_date: datetime, end_date: datetime
    ) -> List[DashboardResponse]:
        """날짜별 대시보드 조회 (ETA 기준)"""
        try:
            log_info(f"대시보드 목록 조회 시작: {start_date} ~ {end_date}")
            # ETA 기준으로 데이터 조회
            dashboards = self.repository.get_dashboards_by_date_range(
                start_date, end_date
            )

            # 디버깅: 데이터 샘플 로깅
            if dashboards and len(dashboards) > 0:
                sample = dashboards[0]
                log_info(
                    f"첫 번째 대시보드 데이터 샘플: ID={sample.dashboard_id}, "
                    f"SLA={getattr(sample, 'sla', None)}, "
                    f"Status={getattr(sample, 'status', None)}"
                )

                # 필드 존재 여부 확인
                model_fields = [
                    attr
                    for attr in dir(sample)
                    if not attr.startswith("_") and not callable(getattr(sample, attr))
                ]
                log_info(f"모델 필드 목록: {model_fields}")

                # 필요한 필드 특별 체크
                required_fields = [
                    "type",
                    "department",
                    "warehouse",
                    "order_no",
                    "sla",
                    "eta",
                    "depart_time",
                    "region",
                    "driver_name",
                    "customer",
                    "status",
                ]

                missing_fields = [
                    field for field in required_fields if field not in model_fields
                ]
                if missing_fields:
                    log_error(None, f"모델에 누락된 필드: {missing_fields}")

            # 응답 객체로 변환
            responses = [DashboardResponse.model_validate(d) for d in dashboards]

            # 응답 검증
            if responses and len(responses) > 0:
                sample_resp = responses[0].model_dump()
                log_info(f"응답 객체 샘플: {sample_resp}")

                missing_resp_fields = [
                    field for field in required_fields if field not in sample_resp
                ]
                if missing_resp_fields:
                    log_error(None, f"응답에 누락된 필드: {missing_resp_fields}")

            return responses
        except Exception as e:
            log_error(e, "대시보드 목록 조회 실패")
            raise

    def get_dashboard_detail(self, dashboard_id: int) -> DashboardDetail:
        """대시보드 상세 정보 조회"""
        try:
            dashboard = self.repository.get_dashboard_detail(dashboard_id)
            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다",
                )

            # 필드 검증 및 기본값 설정
            if not hasattr(dashboard, "sla") or dashboard.sla is None:
                dashboard.sla = "표준"
            if (
                not hasattr(dashboard, "status")
                or dashboard.status not in STATUS_TEXT_MAP
            ):
                dashboard.status = "WAITING"
            if not hasattr(dashboard, "driver_name"):
                dashboard.driver_name = None
            if not hasattr(dashboard, "driver_contact"):
                dashboard.driver_contact = None
            if not hasattr(dashboard, "version") or dashboard.version is None:
                dashboard.version = 1
            if not hasattr(dashboard, "customer") or dashboard.customer is None:
                dashboard.customer = ""
            
            # remarks 필드 방어적 처리 추가
            if hasattr(dashboard, "remarks") and dashboard.remarks:
                for remark in dashboard.remarks:
                    if not hasattr(remark, "formatted_content") or remark.formatted_content is None:
                        remark.formatted_content = f"{remark.created_by}: {remark.content}"
                    
            log_info(
                f"대시보드 상세 조회 결과: ID={dashboard.dashboard_id}, customer={dashboard.customer}"
            )

            # 필드 존재 여부 로깅
            model_fields = dir(dashboard)
            if "customer" not in model_fields:
                log_error(None, f"customer 필드 누락됨: ID={dashboard.dashboard_id}")

            return DashboardDetail.model_validate(dashboard)
        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 상세 조회 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="상세 정보 조회 중 오류가 발생했습니다",
            )

    def create_dashboard(
    self, data: DashboardCreate, department: str, user_id: str = None
) -> Tuple[DashboardDetail, bool]:  # 반환 타입 수정: (대시보드 객체, 우편번호 오류 여부)
        """대시보드 생성 (메모 포함) - 우편번호 처리 로직 개선"""
        try:
            # 우편번호 형식 검증
            if data.postal_code and not (data.postal_code.isdigit() and len(data.postal_code) == 5):
                log_warning(f"유효하지 않은 우편번호 형식: {data.postal_code}")
                # 형식이 잘못되어도 계속 진행

            # 연락처 형식 검증
            if data.contact and not bool(
                re.match(r"^\d{2,3}-\d{3,4}-\d{4}$", data.contact)
            ):
                log_warning(f"올바르지 않은 연락처 형식: {data.contact}")
                # 잘못된 형식도 계속 진행

            # ETA가 현재 시간 이후인지 검증
            eta_kst = data.eta.astimezone(self.kr_timezone)
            if eta_kst <= datetime.now(self.kr_timezone):
                log_warning("ETA가 현재 시간 이전으로 설정됨, 현재 시간 + 1시간으로 자동 조정")
                eta_kst = datetime.now(self.kr_timezone) + timedelta(hours=1)
                data.eta = eta_kst

            # 대시보드 데이터 준비
            dashboard_data = data.model_dump(exclude={"remark"})
            dashboard_data["department"] = department
            dashboard_data["eta"] = eta_kst
            dashboard_data["status"] = "WAITING"
            dashboard_data["version"] = 1

            # 현재 시간 설정
            current_time = datetime.now(self.kr_timezone)
            dashboard_data["create_time"] = current_time

            # 대시보드 생성 - 수정된 반환 값 처리
            dashboard, postal_code_error = self.repository.create_dashboard(dashboard_data, current_time)
                
            # 메모 저장 처리
            remark_content = getattr(data, "remark", None)
            if remark_content and self.remark_repository and user_id:
                log_info(f"메모 생성: dashboard_id={dashboard.dashboard_id}")
                
                # 메모 형식 지정
                formatted_content = f"{user_id}: {remark_content}"
                
                # 메모 저장
                self.remark_repository.create_remark(
                    dashboard_id=dashboard.dashboard_id,
                    content=formatted_content,
                    user_id=user_id
                )
                log_info(f"메모 저장 완료: dashboard_id={dashboard.dashboard_id}")
            
            # 생성된 대시보드 상세 정보 조회
            detail = self.get_dashboard_detail(dashboard.dashboard_id)
            
            # 대시보드 상세 정보와 우편번호 오류 여부 반환
            return detail, postal_code_error

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 생성 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 생성 중 오류가 발생했습니다",
            )
    def update_status(
        self,
        dashboard_id: int,
        status: str,
        user_id: str,
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
                
                # 상태 업데이트 (버전 검증 없이)
                updated = self.repository.update_dashboard_status_without_version(
                    dashboard_id, status, current_time
                )
                
                if not updated:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="대시보드를 찾을 수 없습니다",
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

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "상태 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="상태 업데이트 중 오류가 발생했습니다",
            )

    def update_dashboard_fields(
        self, dashboard_id: int, fields_update: FieldsUpdate, user_id: str
    ) -> DashboardDetail:
        """대시보드 필드 업데이트 (비관적 락 적용)"""
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
                # 필드 업데이트 (버전 필드는 DB에서 자동 증가)
                updated = self.repository.update_dashboard_fields_without_version(
                    dashboard_id, fields
                )
                
                if not updated:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="대시보드를 찾을 수 없습니다",
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

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "필드 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="필드 업데이트 중 오류가 발생했습니다",
            )

    def assign_driver(
        self, assignment: DriverAssignment, user_id: str
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
            acquired_ids = self.repository.acquire_locks_for_multiple_dashboards(
                assignment.dashboard_ids, user_id, "ASSIGN"
            )
            
            if not acquired_ids or len(acquired_ids) != len(assignment.dashboard_ids):
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail="일부 대시보드에 대한 락 획득에 실패했습니다. 다른 사용자가 수정 중입니다.",
                )

            try:
                # 비관적 락 획득 후 배차 처리
                updated_dashboards = self.repository.assign_driver_without_version(
                    assignment.dashboard_ids,
                    assignment.driver_name,
                    assignment.driver_contact
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

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "배차 처리 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=MESSAGES["DASHBOARD"]["ASSIGN_ERROR"],
            )

    def delete_dashboards(self, dashboard_ids: List[int]) -> bool:
        """대시보드 삭제 (관리자 전용)"""
        try:
            if not dashboard_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="삭제할 대시보드 ID를 지정해주세요",
                )

            result = self.repository.delete_dashboards(dashboard_ids)
            return result

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 삭제 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="삭제 처리 중 오류가 발생했습니다",
            )

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 (ETA 기준) - 캐싱 적용"""
        try:
            current_time = time.time()

            # 방어적 프로그래밍: 속성이 없으면 초기화
            if not hasattr(self, "_date_range_cache"):
                self._date_range_cache = None
                self._cache_timestamp = None
                self._cache_ttl = 3600  # 1시간 캐시

            # 캐시가 유효한 경우 캐시된 값 반환
            if (
                self._date_range_cache
                and hasattr(self, "_cache_timestamp")
                and self._cache_timestamp
                and current_time - self._cache_timestamp
                < getattr(self, "_cache_ttl", 3600)
            ):
                log_info("날짜 범위 캐시 사용")
                return self._date_range_cache

            # 캐시가 없거나 만료된 경우 새로 조회
            log_info("날짜 범위 DB 조회 시작")

            # 레포지토리 메서드 호출
            result = self.repository.get_date_range()

            # 결과 검증 및 캐싱
            oldest_date, latest_date = result
            if oldest_date and latest_date:
                self._date_range_cache = (oldest_date, latest_date)
                self._cache_timestamp = current_time
                self._cache_ttl = 3600  # 캐시 유효시간 1시간
                log_info(f"날짜 범위 캐싱됨: {oldest_date} ~ {latest_date}")
                return oldest_date, latest_date
            else:
                # 데이터가 없는 경우 기본값 반환 및 캐싱
                now = datetime.now(self.kr_timezone)
                result = (now - timedelta(days=30), now)
                self._date_range_cache = result
                self._cache_timestamp = current_time
                self._cache_ttl = 3600  # 캐시 유효시간 1시간
                log_info(f"날짜 범위 기본값 캐싱됨: {result[0]} ~ {result[1]}")
                return result

        except Exception as e:
            log_error(e, "날짜 범위 조회 실패")
            now = datetime.now(self.kr_timezone)
            return now - timedelta(days=30), now

    def search_dashboards_by_order_no(self, order_no: str) -> List[DashboardResponse]:
        """주문번호로 대시보드 검색 서비스"""
        try:
            log_info(f"주문번호로 대시보드 검색 서비스: {order_no}")

            # 주문번호가 비어있으면 빈 리스트 반환
            if not order_no or not order_no.strip():
                return []

            # 레포지토리 메소드 호출하여 주문번호로 검색
            dashboards = self.repository.search_dashboards_by_order_no(order_no)

            # 데이터 검증
            for dash in dashboards:
                # 필드 검증 및 기본값 설정
                if not hasattr(dash, "sla") or dash.sla is None:
                    dash.sla = "표준"
                if not hasattr(dash, "status") or dash.status not in STATUS_TEXT_MAP:
                    dash.status = "WAITING"
                if not hasattr(dash, "driver_name"):
                    dash.driver_name = None
                if not hasattr(dash, "driver_contact"):
                    dash.driver_contact = None
                if not hasattr(dash, "version") or dash.version is None:
                    dash.version = 1

            # 응답 객체로 변환
            return [DashboardResponse.model_validate(d) for d in dashboards]

        except Exception as e:
            log_error(e, "주문번호 검색 서비스 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="주문번호 검색 중 오류가 발생했습니다",
            )

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 (ETA 기준) - 캐싱 적용"""
        try:
            current_time = time.time()

            # 방어적 프로그래밍: 속성이 없으면 초기화
            if not hasattr(self, "_date_range_cache"):
                self._date_range_cache = None
                self._cache_timestamp = None
                self._cache_ttl = 3600  # 1시간 캐시

            # 캐시가 유효한 경우 캐시된 값 반환
            if (
                self._date_range_cache
                and hasattr(self, "_cache_timestamp")
                and self._cache_timestamp
                and current_time - self._cache_timestamp
                < getattr(self, "_cache_ttl", 3600)
            ):
                log_info("날짜 범위 캐시 사용")
                return self._date_range_cache

            # 캐시가 없거나 만료된 경우 새로 조회
            log_info("날짜 범위 DB 조회 시작")

            # 레포지토리 메서드 호출
            result = self.repository.get_date_range()

            # 결과 검증 및 캐싱
            oldest_date, latest_date = result
            if oldest_date and latest_date:
                self._date_range_cache = (oldest_date, latest_date)
                self._cache_timestamp = current_time
                self._cache_ttl = 3600  # 캐시 유효시간 1시간
                log_info(f"날짜 범위 캐싱됨: {oldest_date} ~ {latest_date}")
                return oldest_date, latest_date
            else:
                # 데이터가 없는 경우 기본값 반환 및 캐싱
                now = datetime.now(self.kr_timezone)
                result = (now - timedelta(days=30), now)
                self._date_range_cache = result
                self._cache_timestamp = current_time
                self._cache_ttl = 3600  # 캐시 유효시간 1시간
                log_info(f"날짜 범위 기본값 캐싱됨: {result[0]} ~ {result[1]}")
                return result

        except Exception as e:
            log_error(e, "날짜 범위 조회 실패")
            now = datetime.now(self.kr_timezone)
            return now - timedelta(days=30), now

    def search_dashboards_by_order_no(self, order_no: str) -> List[DashboardResponse]:
        """주문번호로 대시보드 검색 서비스"""
        try:
            log_info(f"주문번호로 대시보드 검색 서비스: {order_no}")

            # 주문번호가 비어있으면 빈 리스트 반환
            if not order_no or not order_no.strip():
                return []

            # 레포지토리 메소드 호출하여 주문번호로 검색
            dashboards = self.repository.search_dashboards_by_order_no(order_no)

            # 데이터 검증
            for dash in dashboards:
                # 필드 검증 및 기본값 설정
                if not hasattr(dash, "sla") or dash.sla is None:
                    dash.sla = "표준"
                if not hasattr(dash, "status") or dash.status not in STATUS_TEXT_MAP:
                    dash.status = "WAITING"
                if not hasattr(dash, "driver_name"):
                    dash.driver_name = None
                if not hasattr(dash, "driver_contact"):
                    dash.driver_contact = None
                if not hasattr(dash, "version") or dash.version is None:
                    dash.version = 1

            # 응답 객체로 변환
            return [DashboardResponse.model_validate(d) for d in dashboards]

        except Exception as e:
            log_error(e, "주문번호 검색 서비스 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="주문번호 검색 중 오류가 발생했습니다",
            )