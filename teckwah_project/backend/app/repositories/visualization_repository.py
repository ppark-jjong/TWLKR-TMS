# backend/app/repositories/visualization_repository.py
from datetime import datetime
from typing import List, Tuple
from sqlalchemy import func, and_, extract
from sqlalchemy.orm import Session
from app.models.dashboard_model import Dashboard
from app.utils.logger import log_error, log_info


class VisualizationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_status_counts(
        self, start_date: datetime, end_date: datetime
    ) -> List[Tuple[str, int]]:
        """배송 상태별 건수 조회"""
        try:
            log_info(
                "배송 상태별 건수 조회 시작",
                {"start_date": start_date, "end_date": end_date},
            )
            result = (
                self.db.query(
                    Dashboard.status, func.count(Dashboard.dashboard_id).label("count")
                )
                .filter(and_(Dashboard.eta >= start_date, Dashboard.eta <= end_date))
                .group_by(Dashboard.status)
                .all()
            )

            log_info(f"배송 상태별 건수 조회 완료: {len(result)}건")
            return result

        except Exception as e:
            log_error(e, "배송 상태별 건수 조회 실패")
            raise

    def get_hourly_counts(
        self, start_date: datetime, end_date: datetime
    ) -> List[Tuple[int, int]]:
        """시간대별 접수량 조회"""
        try:
            log_info(
                "시간대별 접수량 조회 시작",
                {"start_date": start_date, "end_date": end_date},
            )
            result = (
                self.db.query(
                    extract("hour", Dashboard.create_time).label("hour"),
                    func.count(Dashboard.dashboard_id).label("count"),
                )
                .filter(
                    and_(
                        Dashboard.create_time >= start_date,
                        Dashboard.create_time <= end_date,
                    )
                )
                .group_by("hour")
                .order_by("hour")
                .all()
            )

            log_info(f"시간대별 접수량 조회 완료: {len(result)}건")
            return result

        except Exception as e:
            log_error(e, "시간대별 접수량 조회 실패")
            raise

    def get_oldest_data_date(self) -> datetime:
        """가장 오래된 데이터 날짜 조회"""
        try:
            result = self.db.query(func.min(Dashboard.create_time)).scalar()

            if result is None:
                return datetime.now()

            log_info(f"가장 오래된 데이터 날짜 조회 완료: {result}")
            return result

        except Exception as e:
            log_error(e, "가장 오래된 데이터 날짜 조회 실패")
            raise
