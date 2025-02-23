from datetime import datetime
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard_schema import DashboardCreate, StatusUpdate, DriverAssignment
from app.utils.datetime_helper import get_date_range, get_date_range_from_datetime, KST
from app.utils.logger import log_info, log_error

class DashboardService:
    def __init__(self, repository: DashboardRepository):
        self.repository = repository

    def get_dashboard_list_by_date(self, target_date: str) -> List[Dashboard]:
        """날짜별 대시보드 조회"""
        try:
            log_info(f"대시보드 목록 조회 시작: {target_date}")
            start_time, end_time = get_date_range(target_date)
            
            dashboards = self.repository.get_dashboards_by_date(start_time, end_time)
            if not dashboards:
                log_info("조회된 데이터가 없습니다")
            else:
                log_info(f"대시보드 목록 조회 완료: {len(dashboards)}건")
                
            return dashboards

        except Exception as e:
            log_error(e, "대시보드 목록 조회 실패")
            return []

    def get_dashboard_list_by_date_range(
        self, start_date: str, end_date: str
    ) -> List[Dashboard]:
        """기간별 대시보드 조회"""
        try:
            log_info(f"대시보드 목록 조회 시작: {start_date} ~ {end_date}")
            start_time, _ = get_date_range(start_date)
            _, end_time = get_date_range(end_date)
            
            dashboards = self.repository.get_dashboards_by_date_range(start_time, end_time)
            if not dashboards:
                log_info("조회된 데이터가 없습니다")
            else:
                log_info(f"대시보드 목록 조회 완료: {len(dashboards)}건")
                
            return dashboards

        except Exception as e:
            log_error(e, "대시보드 목록 조회 실패")
            return []

    def create_dashboard(
        self, data: DashboardCreate, user_department: str
    ) -> Dashboard:
        """대시보드 생성"""
        try:
            dashboard_data = data.model_dump()
            dashboard_data["department"] = user_department
            dashboard_data["eta"] = data.eta.astimezone(KST)

            return self.repository.create_dashboard(dashboard_data)

        except Exception as e:
            log_error(e, "대시보드 생성 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 생성 중 오류가 발생했습니다"
            )

    def update_status(
        self, dashboard_id: int, status_update: StatusUpdate
    ) -> Dashboard:
        """상태 업데이트"""
        try:
            current_time = datetime.now(KST)
            updated_dashboard = self.repository.update_dashboard_status(
                dashboard_id, status_update.status, current_time
            )
            
            if not updated_dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다"
                )
                
            return updated_dashboard

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "상태 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="상태 업데이트 중 오류가 발생했습니다"
            )

    def assign_driver(self, assignment: DriverAssignment) -> List[Dashboard]:
        """배차 처리"""
        try:
            dashboards = self.repository.get_dashboards_by_ids(assignment.dashboard_ids)
            if not dashboards:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="선택한 대시보드를 찾을 수 없습니다"
                )

            updated_dashboards = self.repository.assign_driver(
                assignment.dashboard_ids,
                assignment.driver_name,
                assignment.driver_contact
            )
            return updated_dashboards

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "배차 처리 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="배차 처리 중 오류가 발생했습니다"
            )

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회"""
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