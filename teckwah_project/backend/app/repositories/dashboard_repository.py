from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status

from app.models.dashboard_model import Dashboard
from app.models.postal_code_model import PostalCode
from app.utils.logger import log_error, log_info


class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_dashboards_by_date(self, target_date: datetime) -> List[Dashboard]:
        """하루 단위 대시보드 조회"""
        try:
            start_time = target_date.replace(hour=0, minute=0, second=0)
            end_time = target_date.replace(hour=23, minute=59, second=59)

            result = (
                self.db.query(Dashboard)
                .filter(and_(Dashboard.eta >= start_time, Dashboard.eta <= end_time))
                .order_by(Dashboard.create_time.desc())
                .all()
            )
            return result if result else []  # 빈 리스트 반환

        except SQLAlchemyError as e:
            log_error(e, "대시보드 조회 실패", {"target_date": target_date})
            return []  # 에러 발생시에도 빈 리스트 반환

    def get_dashboards_by_date_range(
        self, start_date: datetime, end_date: datetime
    ) -> List[Dashboard]:
        """기간별 대시보드 조회"""
        try:
            start_time = start_date.replace(hour=0, minute=0, second=0)
            end_time = end_date.replace(hour=23, minute=59, second=59)

            result = (
                self.db.query(Dashboard)
                .filter(and_(Dashboard.eta >= start_time, Dashboard.eta <= end_time))
                .order_by(Dashboard.create_time.desc())
                .all()
            )
            return result if result else []  # 빈 리스트 반환

        except SQLAlchemyError as e:
            log_error(e, "대시보드 조회 실패", {"start": start_date, "end": end_date})
            return []  # 에러 발생시에도 빈 리스트 반환

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """ETA 기준 조회 가능 날짜 범위 조회"""
        try:
            result = self.db.query(
                func.min(Dashboard.eta).label("oldest_date"),
                func.max(Dashboard.eta).label("latest_date"),
            ).first()

            oldest_date = result.oldest_date if result.oldest_date else datetime.now()
            latest_date = result.latest_date if result.latest_date else datetime.now()

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
            log_error(e, "대시보드 상세 조회 실패", {"dashboard_id": dashboard_id})
            raise

    def get_dashboards_by_ids(self, dashboard_ids: List[int]) -> List[Dashboard]:
        """대시보드 ID 리스트로 여러 대시보드 조회"""
        try:
            return (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .all()
            )
        except SQLAlchemyError as e:
            log_error(e, "대시보드 다중 조회 실패", {"dashboard_ids": dashboard_ids})
            raise

    def create_dashboard(self, dashboard_data: dict) -> Dashboard:
        """대시보드 생성"""
        try:
            dashboard = Dashboard(**dashboard_data)
            self.db.add(dashboard)

            try:
                self.db.flush()  # 우편번호 트리거 실행을 위한 flush

                # 우편번호 정보 검증
                if not dashboard.city or not dashboard.district:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="유효하지 않은 우편번호입니다",
                    )

                self.db.commit()
                self.db.refresh(dashboard)
                return dashboard

            except Exception as e:
                self.db.rollback()
                raise

        except SQLAlchemyError as e:
            log_error(e, "대시보드 생성 실패", dashboard_data)
            raise

    def update_status_with_time(
        self, dashboard: Dashboard, new_status: str, current_time: datetime
    ) -> None:
        """상태 변경에 따른 시간 처리"""
        old_status = dashboard.status
        dashboard.status = new_status

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
            dashboard = self.get_dashboard_detail(dashboard_id)
            if dashboard:
                self.update_status_with_time(dashboard, status, current_time)
                self.db.commit()
                self.db.refresh(dashboard)
                return dashboard
            return None
        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "상태 업데이트 실패", {"dashboard_id": dashboard_id})
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
            return None
        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "메모 업데이트 실패", {"dashboard_id": dashboard_id})
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

    def delete_dashboards(self, dashboard_ids: List[int]) -> bool:
        """대시보드 삭제 (관리자 전용)"""
        try:
            result = (
                self.db.query(Dashboard)
                .filter(
                    and_(
                        Dashboard.dashboard_id.in_(dashboard_ids),
                        Dashboard.status == "WAITING",
                    )
                )
                .delete(synchronize_session=False)
            )
            self.db.commit()
            return bool(result)
        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "대시보드 삭제 실패")
            raise
