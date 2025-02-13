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
from app.models.dashboard_model import Dashboard
from sqlalchemy.orm import Session


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_all_dashboards(self):
        return self.db.query(Dashboard).all()

    def create_dashboard(self, dashboard_data: DashboardCreate):
        new_dashboard = Dashboard(**dashboard_data.dict())
        self.db.add(new_dashboard)
        self.db.commit()
        self.db.refresh(new_dashboard)
        return new_dashboard

    def create_dashboard(
        self, data: DashboardCreate, user_department: str
    ) -> DashboardResponse:
        try:
            # 우편번호 데이터 사전 검증
            postal_data = self.repository.get_postal_code_data(data.postal_code)
            if not postal_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="유효하지 않은 우편번호입니다",
                )

            dashboard_data = data.dict()
            dashboard_data["department"] = user_department

            # 트랜잭션 내에서 생성 및 검증
            dashboard = self.repository.create_dashboard(dashboard_data)

            # 트리거 작동 결과 검증
            if not all(
                [
                    dashboard.city,
                    dashboard.district,
                    dashboard.distance,
                    dashboard.duration_time,
                ]
            ):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="우편번호 데이터 매핑 실패",
                )

            return DashboardResponse.model_validate(dashboard)
        except Exception as e:
            log_error(e, "대시보드 생성 실패")
            raise

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
        try:
            # 배차 가능 상태 검증
            dashboards = self.repository.get_dashboards_by_ids(assignment.dashboard_ids)

            invalid_dashboards = []
            for dash in dashboards:
                if dash.status != "WAITING":
                    invalid_dashboards.append(
                        f"주문번호 {dash.order_no}: 대기 상태가 아님"
                    )
                elif dash.driver_name:
                    invalid_dashboards.append(f"주문번호 {dash.order_no}: 이미 배차됨")

            if invalid_dashboards:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"배차할 수 없는 주문이 있습니다:\n"
                    + "\n".join(invalid_dashboards),
                )

            # 배차 정보 업데이트
            updated_dashboards = self.repository.assign_driver(
                assignment.dashboard_ids,
                assignment.driver_name,
                assignment.driver_contact,
            )

            # 배차 결과 검증
            if len(updated_dashboards) != len(assignment.dashboard_ids):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="일부 배차가 실패했습니다",
                )

            return [DashboardResponse.model_validate(d) for d in updated_dashboards]

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "배차 처리 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="배차 처리 중 오류가 발생했습니다",
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
