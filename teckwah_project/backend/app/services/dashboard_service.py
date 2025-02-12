# backend/app/services/dashboard_service.py
from datetime import datetime
from typing import List
from fastapi import HTTPException, status
from app.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardResponse,
    DashboardDetail,
    StatusUpdate,
    RemarkUpdate,
    DriverAssignment,
)
from app.repositories.dashboard_repository import DashboardRepository
from app.utils.logger import log_info, log_error


class DashboardService:
    def __init__(self, dashboard_repository: DashboardRepository):
        self.repository = dashboard_repository

    def create_dashboard(
        self, data: DashboardCreate, user_department: str
    ) -> DashboardResponse:
        """대시보드 생성"""
        try:
            # 부서 자동 설정
            dashboard_data = data.dict()
            dashboard_data["department"] = user_department

            dashboard = self.repository.create_dashboard(dashboard_data)
            return DashboardResponse.model_validate(dashboard)
        except Exception as e:
            log_error(e, "대시보드 생성 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 생성 중 오류가 발생했습니다",
            )

    def get_dashboard_list(self, target_date: datetime) -> List[DashboardResponse]:
        """날짜별 대시보드 조회"""
        try:
            dashboards = self.repository.get_dashboards_by_date(target_date)
            return [DashboardResponse.model_validate(d) for d in dashboards]
        except Exception as e:
            log_error(e, "대시보드 목록 조회 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 목록 조회 중 오류가 발생했습니다",
            )

    def get_dashboard_detail(self, dashboard_id: int) -> DashboardDetail:
        """대시보드 상세 정보 조회"""
        try:
            dashboard = self.repository.get_dashboard_detail(dashboard_id)
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
                detail="대시보드 상세 조회 중 오류가 발생했습니다",
            )

    def update_status(
        self, dashboard_id: int, status_update: StatusUpdate
    ) -> DashboardDetail:
        """상태 업데이트"""
        try:
            dashboard = self.repository.update_dashboard_status(
                dashboard_id, status_update.status, datetime.now()
            )
            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다",
                )
            return DashboardDetail.model_validate(dashboard)
        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "상태 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="상태 업데이트 중 오류가 발생했습니다",
            )

    def update_remark(
        self, dashboard_id: int, remark_update: RemarkUpdate
    ) -> DashboardDetail:
        """메모 업데이트"""
        try:
            dashboard = self.repository.update_dashboard_remark(
                dashboard_id, remark_update.remark
            )
            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다",
                )
            return DashboardDetail.model_validate(dashboard)
        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "메모 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="메모 업데이트 중 오류가 발생했습니다",
            )

    def assign_driver(self, assignment: DriverAssignment) -> List[DashboardResponse]:
        """배차 정보 업데이트"""
        try:
            dashboards = self.repository.assign_driver(
                assignment.dashboard_ids,
                assignment.driver_name,
                assignment.driver_contact,
            )
            return [DashboardResponse.model_validate(d) for d in dashboards]
        except Exception as e:
            log_error(e, "배차 정보 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="배차 정보 업데이트 중 오류가 발생했습니다",
            )

    def delete_dashboards(self, dashboard_ids: List[int]) -> bool:
        """대시보드 삭제"""
        try:
            return self.repository.delete_dashboards(dashboard_ids)
        except Exception as e:
            log_error(e, "대시보드 삭제 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 삭제 중 오류가 발생했습니다",
            )
