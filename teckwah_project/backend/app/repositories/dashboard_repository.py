# backend/app/repositories/dashboard_repository.py
from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from sqlalchemy.exc import SQLAlchemyError
from app.models.dashboard_model import Dashboard
from app.models.postal_code_model import PostalCode, PostalCodeDetail
from app.utils.logger import log_error, log_info


class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_dashboards_by_date(self, target_date: datetime) -> List[Dashboard]:
        """하루 단위 대시보드 조회 - ETA 날짜 기준"""
        try:
            # 하루 단위로 조회 (00:00:00 ~ 23:59:59)
            start_time = target_date.replace(hour=0, minute=0, second=0)
            end_time = target_date.replace(hour=23, minute=59, second=59)

            log_info(f"ETA 기준 대시보드 조회: {start_time} ~ {end_time}")

            result = (
                self.db.query(Dashboard)
                .filter(and_(Dashboard.eta >= start_time, Dashboard.eta <= end_time))
                .order_by(Dashboard.eta.asc())  # ETA 기준 오름차순 정렬
                .all()
            )
            return result if result else []

        except SQLAlchemyError as e:
            log_error(e, "대시보드 조회 실패", {"start": start_time, "end": end_time})
            return []

    def get_dashboards_by_date_range(
        self, start_time: datetime, end_time: datetime
    ) -> List[Dashboard]:
        """기간별 대시보드 조회 - ETA 날짜 기준"""
        try:
            # 시작일자 00:00:00 ~ 종료일자 23:59:59
            start_time = start_date.replace(hour=0, minute=0, second=0)
            end_time = end_date.replace(hour=23, minute=59, second=59)

            log_info(f"ETA 기준 기간별 대시보드 조회: {start_time} ~ {end_time}")

            result = (
                self.db.query(Dashboard)
                .filter(and_(Dashboard.eta >= start_time, Dashboard.eta <= end_time))
                .order_by(Dashboard.eta.asc())  # ETA 기준 오름차순 정렬
                .all()
            )
            return result if result else []

        except SQLAlchemyError as e:
            log_error(e, "대시보드 조회 실패", {"start": start_time, "end": end_time})
            return []

    def get_dashboard_by_id(self, dashboard_id: int) -> Optional[Dashboard]:
        """대시보드 단일 조회"""
        try:
            result = self.db.query(
                func.min(Dashboard.eta).label("oldest_date"),
                func.max(Dashboard.eta).label("latest_date"),
            ).first()

            oldest_date = result.oldest_date if result.oldest_date else datetime.now()
            latest_date = result.latest_date if result.latest_date else datetime.now()

            log_info(f"조회 가능 날짜 범위: {oldest_date} ~ {latest_date}")
            return oldest_date, latest_date
        except SQLAlchemyError as e:
            log_error(e, "ETA 날짜 범위 조회 실패")
            raise

    def get_dashboard_detail(self, dashboard_id: int) -> Optional[Dashboard]:
        """대시보드 상세 정보 조회"""
        try:
            log_info(f"대시보드 상세 조회: {dashboard_id}")
            return (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .first()
            )
        except SQLAlchemyError as e:
            log_error(e, "대시보드 조회 실패", {"id": dashboard_id})
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
            log_error(e, "대시보드 다중 조회 실패", {"ids": dashboard_ids})
            raise

    def create_dashboard(self, dashboard_data: dict) -> Dashboard:
        """대시보드 생성"""
        try:
            dashboard = Dashboard(**dashboard_data)
            self.db.add(dashboard)

            # postal_code_detail 정보 연결 위해 flush
            self.db.flush()

            # 거리/시간 정보 조회 시도
            postal_detail = (
                self.db.query(PostalCodeDetail)
                .filter(
                    and_(
                        PostalCodeDetail.postal_code == dashboard.postal_code,
                        PostalCodeDetail.warehouse == dashboard.warehouse,
                    )
                )
                .first()
            )

            # 정보가 있으면 업데이트
            if postal_detail:
                dashboard.distance = postal_detail.distance
                dashboard.duration_time = postal_detail.duration_time

            self.db.commit()
            self.db.refresh(dashboard)
            return dashboard

        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "대시보드 생성 실패", dashboard_data)
            raise

    def update_status_with_time(
        self, dashboard: Dashboard, new_status: str, current_time: datetime
    ) -> None:
        """상태 변경에 따른 시간 처리"""
        old_status = dashboard.status
        dashboard.status = new_status

        # 시간 필드 처리
        if new_status == "IN_PROGRESS" and old_status != "IN_PROGRESS":
            dashboard.depart_time = current_time
            dashboard.complete_time = None
        elif new_status in ["COMPLETE", "ISSUE"]:
            dashboard.complete_time = current_time
        elif new_status in ["WAITING", "CANCEL"]:
            dashboard.depart_time = None
            dashboard.complete_time = None

    def update_dashboard_status(
        self, dashboard_id: int, status: str, current_time: datetime
    ) -> Optional[Dashboard]:
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
            if not dashboards:
                return []

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
            # 관리자는 모든 상태의 대시보드 삭제 가능
            result = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .delete(synchronize_session=False)
            )
            self.db.commit()
            return bool(result)
        except SQLAlchemyError as e:
            log_error(e, "날짜 범위 조회 실패")
            raise
