# visualization_repository.py
from datetime import datetime
from typing import List, Tuple
from sqlalchemy import func, and_
from sqlalchemy.orm import Session
from app.models.dashboard_model import Dashboard
from app.utils.logger import log_error

class VisualizationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_raw_delivery_data(
        self, start_date: datetime, end_date: datetime
    ) -> List[Tuple]:
        """배송 현황 raw 데이터 조회 (ETA 기준으로 조회)"""
        try:
            result = (
                self.db.query(
                    Dashboard.department, 
                    Dashboard.status, 
                    Dashboard.create_time
                )
                .filter(and_(
                    Dashboard.eta >= start_date,
                    Dashboard.eta <= end_date
                ))
                .all()
            )
            return result
        except Exception as e:
            log_error(e, "배송 현황 데이터 조회 실패")
            raise

    def get_raw_hourly_data(
        self, start_date: datetime, end_date: datetime
    ) -> List[Tuple]:
        """시간대별 접수량 raw 데이터 조회 (ETA 기준으로 조회)"""
        try:
            result = (
                self.db.query(
                    Dashboard.department,
                    Dashboard.create_time
                )
                .filter(and_(
                    Dashboard.eta >= start_date,
                    Dashboard.eta <= end_date
                ))
                .all()
            )
            return result
        except Exception as e:
            log_error(e, "시간대별 접수량 데이터 조회 실패")
            raise

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 (ETA 기준)"""
        try:
            result = self.db.query(
                func.min(Dashboard.eta).label("oldest_date"),
                func.max(Dashboard.eta).label("latest_date"),
            ).first()

            return result.oldest_date, result.latest_date
        except Exception as e:
            log_error(e, "날짜 범위 조회 실패")
            raise