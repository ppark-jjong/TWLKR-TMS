# backend/app/services/dashboard_service.py
import re
import time
import pytz
from datetime import datetime, timezone, timedelta
from typing import List, Tuple, Optional, Dict, Any
from fastapi import HTTPException, status
from app.repositories.dashboard_repository import DashboardRepository
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
from app.utils.exceptions import OptimisticLockException, PessimisticLockException


class DashboardService:
    def __init__(self, repository: DashboardRepository):
        self.repository = repository
        self.kr_timezone = pytz.timezone("Asia/Seoul")
        self._date_range_cache = None
        self._cache_timestamp = None
        self._cache_ttl = 3600  # 캐시 유효시간 1시간

    def get_dashboard_list_by_date(
        self, start_date: datetime, end_date: datetime, is_admin: bool = False
    ) -> List[DashboardResponse]:
        """날짜별 대시보드 조회 (ETA 기준)"""
        try:
            log_info(f"대시보드 목록 조회 시작: {start_date} ~ {end_date}")
            # ETA 기준으로 데이터 조회c
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
        self, data: DashboardCreate, department: str
    ) -> DashboardDetail:
        """대시보드 생성"""
        try:
            # 우편번호 형식 검증 (5자리 숫자)
            if not data.postal_code.isdigit() or len(data.postal_code) != 5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"유효하지 않은 우편번호입니다: {data.postal_code}",
                )

            # 연락처 형식 검증
            if data.contact and not bool(
                re.match(r"^\d{2,3}-\d{3,4}-\d{4}$", data.contact)
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="올바른 연락처 형식이 아닙니다",
                )
            # order_no 추가 검증 (15자 제한)
            if len(data.order_no) > 15:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="주문번호는 15자를 초과할 수 없습니다",
                )

            # ETA가 현재 시간 이후인지 검증
            eta_kst = data.eta.astimezone(self.kr_timezone)
            if eta_kst <= datetime.now(self.kr_timezone):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ETA는 현재 시간 이후여야 합니다",
                )

            # 대시보드 데이터 준비 및 생성
            dashboard_data = data.model_dump()
            dashboard_data["department"] = department
            dashboard_data["eta"] = eta_kst
            dashboard_data["status"] = "WAITING"  # 초기 상태는 대기 상태
            dashboard_data["version"] = 1  # 초기 버전 설정

            # 현재 시간 (KST)을 create_time으로 설정
            current_time = datetime.now(self.kr_timezone)
            dashboard_data["create_time"] = current_time

            # SLA 필드가 비어있는 경우 기본값 설정
            if not dashboard_data.get("sla"):
                dashboard_data["sla"] = "표준"

            # 변경 포인트: current_time을 repository 메서드에 전달
            dashboard = self.repository.create_dashboard(dashboard_data, current_time)
            log_info(f"대시보드 생성 완료: {dashboard.dashboard_id}")
            return DashboardDetail.model_validate(dashboard)

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
        version: int,
        user_id: str,
        is_admin: bool = False,
    ) -> DashboardDetail:
        """상태 업데이트 (낙관적 락 + 비관적 락 적용)"""
        try:
            # 대시보드 조회 (비관적 락 적용)는 repository에서 이루어짐

            # 상태 유효성 검증
            if status not in STATUS_TEXT_MAP.keys():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"유효하지 않은 상태입니다: {status}",
                )

            # 현재 시간 (KST)
            current_time = datetime.now(self.kr_timezone)

            try:
                # 비관적 락 + 낙관적 락 적용한 상태 업데이트
                updated = self.repository.update_dashboard_status_with_lock(
                    dashboard_id, status, current_time, version, user_id
                )
                return DashboardDetail.model_validate(updated)
            except OptimisticLockException as e:
                # 낙관적 락 충돌 처리
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "message": "다른 사용자가 이미 데이터를 수정했습니다. 최신 데이터를 확인하세요.",
                        "current_version": e.current_version,
                    },
                )
            except PessimisticLockException as e:
                # 비관적 락 충돌 처리
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail={
                        "message": str(e.detail),
                        "locked_by": e.locked_by,
                    },
                )

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "상태 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=MESSAGES["DASHBOARD"]["STATUS_UPDATE_ERROR"],
            )

    def update_dashboard_fields(
        self, dashboard_id: int, fields_update: FieldsUpdate, user_id: str
    ) -> DashboardDetail:
        """대시보드 필드 업데이트 (낙관적 락 + 비관적 락 적용)"""
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

            try:
                # 필드 업데이트 (낙관적 락 + 비관적 락 적용)
                updated = self.repository.update_dashboard_fields_with_lock(
                    dashboard_id, fields, fields_update.version, user_id
                )
                return DashboardDetail.model_validate(updated)
            except OptimisticLockException as e:
                # 낙관적 락 충돌 처리
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "message": "다른 사용자가 이미 데이터를 수정했습니다. 최신 데이터를 확인하세요.",
                        "current_version": e.current_version,
                    },
                )
            except PessimisticLockException as e:
                # 비관적 락 충돌 처리
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail={
                        "message": str(e.detail),
                        "locked_by": e.locked_by,
                    },
                )

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
        """배차 처리 (낙관적 락 + 비관적 락 적용)"""
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

            try:
                # 비관적 락 + 낙관적 락 적용한 배차 처리
                updated_dashboards = self.repository.assign_driver_with_lock(
                    assignment.dashboard_ids,
                    assignment.driver_name,
                    assignment.driver_contact,
                    assignment.versions,
                    user_id,
                )

                if len(updated_dashboards) != len(assignment.dashboard_ids):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="일부 대시보드를 찾을 수 없습니다",
                    )

                return [DashboardResponse.model_validate(d) for d in updated_dashboards]
            except OptimisticLockException as e:
                # 낙관적 락 충돌 처리
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "message": "다른 사용자가 이미 데이터를 수정했습니다. 최신 데이터를 확인하세요.",
                        "current_version": e.current_version,
                    },
                )
            except PessimisticLockException as e:
                # 비관적 락 충돌 처리
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail={
                        "message": str(e.detail),
                        "locked_by": e.locked_by,
                    },
                )

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
