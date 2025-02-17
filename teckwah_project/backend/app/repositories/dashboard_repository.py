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

    def get_dashboard_detail(self, dashboard_id: int) -> Optional[Dashboard]:
        """대시보드 상세 정보 조회"""
        try:
            log_info(f"대시보드 상세 조회: {dashboard_id}")
            dashboard = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .first()
            )
            log_info("대시보드 상세 조회 완료" if dashboard else "대시보드 데이터 없음")
            return dashboard
        except Exception as e:
            log_error(e, "대시보드 상세 조회 실패", {"dashboard_id": dashboard_id})
            raise

    def get_dashboards_by_ids(self, dashboard_ids: List[int]) -> List[Dashboard]:
        """대시보드 ID 리스트로 여러 대시보드 조회"""
        try:
            log_info(f"대시보드 다중 조회: {dashboard_ids}")
            dashboards = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .all()
            )
            log_info(f"대시보드 다중 조회 완료: {len(dashboards)}건")
            return dashboards
        except Exception as e:
            log_error(e, "대시보드 다중 조회 실패", {"dashboard_ids": dashboard_ids})
            raise

    def get_dashboards_by_date(self, target_date: datetime) -> List[Dashboard]:
        """날짜별 대시보드 조회"""
        try:
            log_info(f"대시보드 조회 시작: {target_date}")
            start_date = target_date.replace(hour=0, minute=0, second=0)
            end_date = target_date.replace(hour=23, minute=59, second=59)

            dashboards = (
                self.db.query(Dashboard)
                .filter(and_(Dashboard.eta >= start_date, Dashboard.eta <= end_date))
                .order_by(Dashboard.create_time.desc())
                .all()
            )
            log_info(f"대시보드 조회 완료: {len(dashboards)}건")
            return dashboards
        except Exception as e:
            log_error(e, "대시보드 조회 실패", {"target_date": target_date})
            raise

    def get_postal_code_data(self, postal_code: str) -> Optional[PostalCode]:
        try:
            log_info(f"우편번호 데이터 조회 시작: {postal_code}")
            data = (
                self.db.query(PostalCode)
                .filter(PostalCode.postal_code == postal_code)
                .first()
            )

            if data:
                log_info(
                    "우편번호 데이터 조회 성공",
                    {
                        "postal_code": data.postal_code,
                        "city": data.city,
                        "district": data.district,
                        "distance": data.distance,
                        "duration_time": data.duration_time,
                    },
                )
            else:
                log_info(f"우편번호 데이터 없음: {postal_code}")

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
            self.db.rollback()
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
        elif new_status == "WAITING":
            dashboard.depart_time = None
            dashboard.complete_time = None

    def update_dashboard_status(
        self, dashboard_id: int, status: str, current_time: datetime
    ) -> Optional[Dashboard]:
        """상태 업데이트"""
        try:
            log_info(f"상태 업데이트 시작: {dashboard_id} -> {status}")
            dashboard = self.get_dashboard_detail(dashboard_id)
            if dashboard:
                self.update_status_with_time(dashboard, status, current_time)
                self.db.commit()
                self.db.refresh(dashboard)
                log_info("상태 업데이트 완료")
                return dashboard
            return None
        except Exception as e:
            self.db.rollback()
            log_error(e, "상태 업데이트 실패", {"dashboard_id": dashboard_id})
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
            return None
        except Exception as e:
            self.db.rollback()
            log_error(e, "메모 업데이트 실패", {"dashboard_id": dashboard_id})
            raise

    def assign_driver(
        self, dashboard_ids: List[int], driver_name: str, driver_contact: str
    ) -> List[Dashboard]:
        """배차 처리"""
        try:
            log_info("배차 처리 시작", {"dashboard_ids": dashboard_ids})
            dashboards = self.get_dashboards_by_ids(dashboard_ids)

            for dashboard in dashboards:
                # 단순히 운전자 정보만 업데이트
                dashboard.driver_name = driver_name
                dashboard.driver_contact = driver_contact

            self.db.commit()
            log_info("배차 처리 완료")
            return dashboards
        except Exception as e:
            self.db.rollback()
            log_error(e, "배차 처리 실패")
            raise

    def delete_dashboards(self, dashboard_ids: List[int]) -> bool:
        """대시보드 삭제"""
        try:
            log_info("대시보드 삭제 시작", {"dashboard_ids": dashboard_ids})
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
            log_info(f"대시보드 삭제 완료: {result}건")
            return bool(result)
        except Exception as e:
            self.db.rollback()
            log_error(e, "대시보드 삭제 실패")
            raise
