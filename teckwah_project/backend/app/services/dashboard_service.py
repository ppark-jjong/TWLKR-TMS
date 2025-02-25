<<<<<<< HEAD
import re
import pytz
from datetime import datetime, timezone, timedelta
from typing import List, Tuple, Optional
=======
# backend/app/services/dashboard_service.py
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
>>>>>>> main
from fastapi import HTTPException, status
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardResponse,
    DashboardDetail,
    StatusUpdate,
    DriverAssignment,
)
from app.utils.datetime_helper import KST, get_date_range
from app.utils.constants import MESSAGES
from app.utils.logger import log_info, log_error


class DashboardService:
    def __init__(self, repository: DashboardRepository):
        self.repository = repository

    def get_dashboard_list_by_date(self, date: str) -> List[DashboardResponse]:
        """날짜별 대시보드 조회 (ETA 기준)"""
        try:
            log_info(f"대시보드 목록 조회 시작: {date}")
            start_time, end_time = get_date_range(date)
            dashboards = self.repository.get_dashboards_by_date(start_time, end_time)

<<<<<<< HEAD
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

            # 대시보드 데이터 준비 및 생성
            dashboard_data = data.model_dump()  # Pydantic v2 방식
            dashboard_data["department"] = user_department

            # KST 시간으로 변환
            if "eta" in dashboard_data:
                dashboard_data["eta"] = dashboard_data["eta"].astimezone(
                    self.kr_timezone
                )

            dashboard = self.repository.create_dashboard(dashboard_data)
            log_info(f"대시보드 생성 완료: {dashboard.dashboard_id}")
            return DashboardResponse.model_validate(dashboard)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 생성 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 생성 중 오류가 발생했습니다",
            )

    def get_dashboard_list_by_date(
        self, target_date: datetime
    ) -> List[DashboardResponse]:
        """날짜별 대시보드 조회 (일반 사용자용)"""
        try:
            log_info(f"대시보드 목록 조회 시작: {target_date}")
            # ETA 기준으로 데이터 조회
            dashboards = self.repository.get_dashboards_by_date(target_date)
=======
>>>>>>> main
            log_info(f"대시보드 목록 조회 완료: {len(dashboards)}건")
            return [DashboardResponse.model_validate(d) for d in dashboards]

        except Exception as e:
            log_error(e, "대시보드 목록 조회 실패")
            return []

    def get_dashboard_list_by_date_range(
        self, start_date: str, end_date: str
    ) -> List[DashboardResponse]:
        """기간별 대시보드 조회 (ETA 기준)"""
        try:
            log_info(f"대시보드 목록 조회 시작: {start_date} ~ {end_date}")
            start_time, _ = get_date_range(start_date)
            _, end_time = get_date_range(end_date)

            dashboards = self.repository.get_dashboards_by_date_range(
                start_time, end_time
            )
            log_info(f"대시보드 목록 조회 완료: {len(dashboards)}건")
            return [DashboardResponse.model_validate(d) for d in dashboards]

        except Exception as e:
            log_error(e, "대시보드 목록 조회 실패")
            return []

    def get_dashboard_detail(self, dashboard_id: int) -> DashboardDetail:
        """대시보드 상세 정보 조회"""
        try:
            dashboard = self.repository.get_dashboard_by_id(dashboard_id)
            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다",
                )
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
    ) -> DashboardResponse:
        """대시보드 생성"""
        try:
            # ETA가 현재 시간 이후인지 검증 (DB에서도 검증)
            eta_kst = data.eta.astimezone(KST)
            if eta_kst <= datetime.now(KST):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ETA는 현재 시간 이후여야 합니다",
                )

            dashboard_data = data.model_dump()
            dashboard_data["department"] = department
            dashboard_data["eta"] = eta_kst

            created = self.repository.create_dashboard(dashboard_data)
            return DashboardResponse.model_validate(created)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 생성 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=MESSAGES["DASHBOARD"]["CREATE_ERROR"],
            )

    def update_status(
        self, dashboard_id: int, status_update: StatusUpdate
    ) -> DashboardResponse:
        """상태 업데이트"""
        try:
            current_time = datetime.now(KST)
            updated = self.repository.update_dashboard_status(
                dashboard_id, status_update.status, current_time
            )

            if not updated:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다",
                )

            return DashboardResponse.model_validate(updated)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "상태 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=MESSAGES["DASHBOARD"]["STATUS_UPDATE_ERROR"],
            )

    def assign_driver(self, assignment: DriverAssignment) -> List[DashboardResponse]:
        """배차 처리"""
        try:
<<<<<<< HEAD
            log_info("배차 처리 시작", {"dashboard_ids": assignment.dashboard_ids})

            # 대기 상태 검증
            dashboards = self.repository.get_dashboards_by_ids(assignment.dashboard_ids)
            invalid_dashboards = []
            for dash in dashboards:
                if dash.status != "WAITING":
                    invalid_dashboards.append(f"{dash.order_no}")

            if invalid_dashboards:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"대기 상태가 아니어서 처리할 수 없습니다: {', '.join(invalid_dashboards)}",
                )

            # 배차 정보 업데이트
            updated_dashboards = self.repository.assign_driver(
=======
            updated = self.repository.assign_driver(
>>>>>>> main
                assignment.dashboard_ids,
                assignment.driver_name,
                assignment.driver_contact,
            )

            if len(updated) != len(assignment.dashboard_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="일부 대시보드를 찾을 수 없습니다",
                )

            return [DashboardResponse.model_validate(d) for d in updated]

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "배차 처리 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=MESSAGES["DASHBOARD"]["ASSIGN_ERROR"],
            )

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 (ETA 기준)"""
        try:
            oldest_date, latest_date = self.repository.get_date_range()
            if not oldest_date or not latest_date:
                now = datetime.now(KST)
                return now - timedelta(days=30), now

            return oldest_date.astimezone(KST), latest_date.astimezone(KST)

        except Exception as e:
            log_error(e, "날짜 범위 조회 실패")
            now = datetime.now(KST)
            return now - timedelta(days=30), now
