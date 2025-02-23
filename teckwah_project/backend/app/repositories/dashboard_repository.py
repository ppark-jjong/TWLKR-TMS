from datetime import datetime
from typing import List, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status
from app.models.dashboard_model import Dashboard
from app.utils.logger import log_error, log_info
from app.utils.datetime_helper import KST

class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_dashboards_by_date(
        self, start_time: datetime, end_time: datetime
    ) -> List[Dashboard]:
        """하루 단위 대시보드 조회 (ETA 기준)"""
        try:
            result = (
                self.db.query(Dashboard)
                .filter(and_(Dashboard.eta >= start_time, Dashboard.eta <= end_time))
                .order_by(Dashboard.eta.asc())
                .all()
            )
            return result if result else []

        except SQLAlchemyError as e:
            log_error(e, "대시보드 조회 실패", {"start": start_time, "end": end_time})
            return []

    def get_dashboards_by_date_range(
        self, start_time: datetime, end_time: datetime
    ) -> List[Dashboard]:
        """기간별 대시보드 조회 (ETA 기준)"""
        try:
            result = (
                self.db.query(Dashboard)
                .filter(and_(Dashboard.eta >= start_time, Dashboard.eta <= end_time))
                .order_by(Dashboard.eta.asc())
                .all()
            )
            return result if result else []

        except SQLAlchemyError as e:
            log_error(e, "대시보드 조회 실패", {"start": start_time, "end": end_time})
            return []

    def create_dashboard(self, dashboard_data: dict) -> Dashboard:
        """대시보드 생성"""
        try:
            dashboard = Dashboard(**dashboard_data)
            self.db.add(dashboard)
            self.db.commit()
            self.db.refresh(dashboard)
            return dashboard
        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "대시보드 생성 실패")
            raise

    def get_dashboard_by_id(self, dashboard_id: int) -> Optional[Dashboard]:
        """대시보드 단일 조회"""
        try:
            return self.db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
        except SQLAlchemyError as e:
            log_error(e, "대시보드 조회 실패")
            raise

    def get_dashboards_by_ids(self, dashboard_ids: List[int]) -> List[Dashboard]:
        """대시보드 다중 조회"""
        try:
            return (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .all()
            )
        except SQLAlchemyError as e:
            log_error(e, "대시보드 다중 조회 실패")
            raise

    def update_dashboard_status(
        self, dashboard_id: int, status: str, current_time: datetime
    ) -> Dashboard:
        """상태 업데이트"""
        try:
            dashboard = self.get_dashboard_by_id(dashboard_id)
            if dashboard:
                old_status = dashboard.status
                dashboard.status = status

                # 상태 변경에 따른 시간 업데이트
                if status == "IN_PROGRESS" and old_status != "IN_PROGRESS":
                    dashboard.depart_time = current_time
                    dashboard.complete_time = None
                elif status in ["COMPLETE", "ISSUE"]:
                    dashboard.complete_time = current_time
                elif status in ["WAITING", "CANCEL"]:
                    dashboard.depart_time = None
                    dashboard.complete_time = None

                self.db.commit()
                self.db.refresh(dashboard)
            return dashboard
        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "상태 업데이트 실패")
            raise

    def assign_driver(
        self, dashboard_ids: List[int], driver_name: str, driver_contact: str
    ) -> List[Dashboard]:
        """배차 처리"""
        try:
            dashboards = self.get_dashboards_by_ids(dashboard_ids)
            for dashboard in dashboards:
                dashboard.driver_name = driver_name
                dashboard.driver_contact = driver_contact
            self.db.commit()
            return dashboards
        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "배차 처리 실패")
            raise

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """ETA 기준 조회 가능 날짜 범위"""
        try:
            result = self.db.query(
                func.min(Dashboard.eta).label("oldest_date"),
                func.max(Dashboard.eta).label("latest_date"),
            ).first()
            
            return result.oldest_date, result.latest_date
        except SQLAlchemyError as e:
            log_error(e, "날짜 범위 조회 실패")
            raise