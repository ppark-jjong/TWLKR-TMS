# backend/app/repositories/dashboard_repository.py
from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, or_
from sqlalchemy.exc import SQLAlchemyError
from app.models.dashboard_model import Dashboard
from app.models.postal_code_model import PostalCode, PostalCodeDetail
from app.utils.logger import log_error, log_info


class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_dashboards_by_date_range(
        self, start_time: datetime, end_time: datetime
    ) -> List[Dashboard]:
        """기간별 대시보드 조회 - ETA 날짜 기준"""
        try:
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
            log_info(f"대시보드 다중 조회: {dashboard_ids}")
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
            log_info(f"대시보드 생성 시작")

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

    def update_dashboard_status(
        self, dashboard_id: int, status: str, current_time: datetime
    ) -> Optional[Dashboard]:
        """상태 업데이트"""
        try:
            dashboard = self.get_dashboard_detail(dashboard_id)
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
            log_error(e, "상태 업데이트 실패", {"id": dashboard_id, "status": status})
            raise

    def update_dashboard_remark(
        self, dashboard_id: int, remark: str
    ) -> Optional[Dashboard]:
        """메모 업데이트"""
        try:
            dashboard = self.get_dashboard_detail(dashboard_id)
            if dashboard:
                dashboard.remark = remark
                self.db.commit()
                self.db.refresh(dashboard)
            return dashboard

        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "메모 업데이트 실패", {"id": dashboard_id})
            raise

    def assign_driver(
        self, dashboard_ids: List[int], driver_name: str, driver_contact: str
    ) -> List[Dashboard]:
        """배차 처리"""
        try:
            log_info(f"배차 처리: {len(dashboard_ids)}건")

            # 대상 대시보드 조회
            dashboards = self.get_dashboards_by_ids(dashboard_ids)
            if not dashboards:
                return []

            # 배차 정보 일괄 업데이트
            for dashboard in dashboards:
                dashboard.driver_name = driver_name
                dashboard.driver_contact = driver_contact

            self.db.commit()

            # 업데이트된 대시보드 다시 조회하여 반환
            return self.get_dashboards_by_ids(dashboard_ids)

        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "배차 처리 실패", {"ids": dashboard_ids})
            raise

    def delete_dashboards(self, dashboard_ids: List[int]) -> bool:
        """대시보드 삭제 (관리자 전용)"""
        try:
            log_info(f"대시보드 삭제 요청: {dashboard_ids}")

            result = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .delete(synchronize_session=False)
            )
            self.db.commit()

            log_info(f"대시보드 삭제 완료: {result}건")
            return bool(result)

        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "대시보드 삭제 실패", {"ids": dashboard_ids})
            raise

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """ETA 기준 조회 가능 날짜 범위"""
        try:
            log_info("ETA 날짜 범위 조회")

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
