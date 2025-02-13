# backend/app/repositories/dashboard_repository.py
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.models.dashboard_model import Dashboard
from app.models.postal_code_model import PostalCode
from app.utils.logger import log_error, log_info


class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_dashboards_by_date(self, target_date: datetime) -> List[Dashboard]:
        """날짜별 대시보드 조회"""
        try:
            log_info(f"대시보드 조회 시작: {target_date}")
            start_date = target_date.replace(hour=0, minute=0, second=0)
            end_date = target_date.replace(hour=23, minute=59, second=59)

            log_info(f"조회 기간: {start_date} ~ {end_date}")

            dashboards = (
                self.db.query(Dashboard)
                .filter(and_(Dashboard.eta >= start_date, Dashboard.eta <= end_date))
                .order_by(Dashboard.create_time.desc())
                .all()
            )

            log_info(f"조회된 대시보드 수: {len(dashboards)}")
            return dashboards

        except Exception as e:
            log_error(
                e,
                "대시보드 조회 실패",
                {
                    "target_date": target_date,
                    "start_date": start_date,
                    "end_date": end_date,
                },
            )
            raise

    def get_postal_code_data(self, postal_code: str) -> Optional[PostalCode]:
        """우편번호 데이터 조회"""
        try:
            log_info(f"우편번호 데이터 조회: {postal_code}")
            data = (
                self.db.query(PostalCode)
                .filter(PostalCode.postal_code == postal_code)
                .first()
            )
            if data:
                log_info("우편번호 데이터 조회 성공")
            else:
                log_info("우편번호 데이터 없음")
            return data
        except Exception as e:
            log_error(e, "우편번호 데이터 조회 실패", {"postal_code": postal_code})
            raise

    def create_dashboard(self, dashboard_data: dict) -> Dashboard:
        """대시보드 생성"""
        try:
            log_info("대시보드 생성 시작", dashboard_data)
            dashboard = Dashboard(**dashboard_data)
            self.db.add(dashboard)
            self.db.commit()
            self.db.refresh(dashboard)
            log_info(f"대시보드 생성 완료: {dashboard.dashboard_id}")
            return dashboard
        except Exception as e:
            log_error(e, "대시보드 생성 실패", dashboard_data)
            self.db.rollback()
            raise

    def get_dashboard_detail(self, dashboard_id: int) -> Optional[Dashboard]:
        """대시보드 상세 정보 조회"""
        try:
            log_info(f"대시보드 상세 조회: {dashboard_id}")
            dashboard = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .first()
            )
            if dashboard:
                log_info("대시보드 상세 조회 성공")
            else:
                log_info("대시보드 데이터 없음")
            return dashboard
        except Exception as e:
            log_error(e, "대시보드 상세 조회 실패", {"dashboard_id": dashboard_id})
            raise

    def update_dashboard_status(
        self, dashboard_id: int, status: str, current_time: datetime
    ) -> Optional[Dashboard]:
        """상태 업데이트"""
        try:
            log_info(f"상태 업데이트 시작: {dashboard_id} -> {status}")
            dashboard = self.get_dashboard_detail(dashboard_id)
            if dashboard:
                dashboard.status = status
                if status == "IN_PROGRESS":
                    dashboard.depart_time = current_time
                elif status in ["COMPLETE", "ISSUE"]:
                    dashboard.complete_time = current_time

                self.db.commit()
                self.db.refresh(dashboard)
                log_info("상태 업데이트 완료")
            return dashboard
        except Exception as e:
            log_error(
                e,
                "상태 업데이트 실패",
                {"dashboard_id": dashboard_id, "status": status},
            )
            self.db.rollback()
            raise

    def update_dashboard_remark(
        self, dashboard_id: int, remark: str
    ) -> Optional[Dashboard]:
        """메모 업데이트"""
        try:
            log_info(f"메모 업데이트 시작: {dashboard_id}")
            dashboard = self.get_dashboard_detail(dashboard_id)
            if dashboard:
                dashboard.remark = remark
                self.db.commit()
                self.db.refresh(dashboard)
                log_info("메모 업데이트 완료")
            return dashboard
        except Exception as e:
            log_error(
                e,
                "메모 업데이트 실패",
                {"dashboard_id": dashboard_id, "remark": remark},
            )
            self.db.rollback()
            raise

    def assign_driver(
        self, dashboard_ids: List[int], driver_name: str, driver_contact: str
    ) -> List[Dashboard]:
        """배차 정보 업데이트"""
        try:
            log_info(
                "배차 정보 업데이트 시작",
                {"dashboard_ids": dashboard_ids, "driver_name": driver_name},
            )
            dashboards = (
                self.db.query(Dashboard)
                .filter(
                    and_(
                        Dashboard.dashboard_id.in_(dashboard_ids),
                        Dashboard.status == "WAITING",
                    )
                )
                .all()
            )

            for dashboard in dashboards:
                dashboard.driver_name = driver_name
                dashboard.driver_contact = driver_contact

            self.db.commit()
            log_info(f"배차 정보 업데이트 완료: {len(dashboards)}건")
            return dashboards
        except Exception as e:
            log_error(
                e,
                "배차 정보 업데이트 실패",
                {"dashboard_ids": dashboard_ids, "driver_name": driver_name},
            )
            self.db.rollback()
            raise

    def delete_dashboards(self, dashboard_ids: List[int]) -> bool:
        """대시보드 삭제"""
        try:
            log_info(f"대시보드 삭제 시작: {dashboard_ids}")
            delete_count = (
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
            log_info(f"대시보드 삭제 완료: {delete_count}건")
            return True
        except Exception as e:
            log_error(e, "대시보드 삭제 실패", {"dashboard_ids": dashboard_ids})
            self.db.rollback()
            raise
