# backend/app/repositories/visualization_repository.py

from datetime import datetime, date
from typing import List, Tuple
from sqlalchemy import func, and_
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.dashboard_model import Dashboard
from app.utils.logger import log_error, log_info
from app.utils.error_handler import handle_database_error

class VisualizationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_status_counts(self, start_date: date, end_date: date) -> List[Tuple[str, int]]:
        """기간 내 상태별 대시보드 개수 조회"""
        try:
            log_info("상태별 대시보드 개수 조회", {
                "start_date": start_date,
                "end_date": end_date
            })
            
            start_datetime = datetime.combine(start_date, datetime.min.time())
            end_datetime = datetime.combine(end_date, datetime.max.time())
            
            result = (self.db.query(
                Dashboard.status,
                func.count(Dashboard.dashboard_id).label('count')
            )
            .filter(
                and_(
                    Dashboard.eta >= start_datetime,
                    Dashboard.eta <= end_datetime
                )
            )
            .group_by(Dashboard.status)
            .all())
            
            log_info(f"상태별 대시보드 조회 완료: {len(result)}개 상태")
            return result
            
        except SQLAlchemyError as e:
            handle_database_error(e, "상태별 대시보드 개수 조회 실패", {
                "start_date": start_date,
                "end_date": end_date
            })

    def get_hourly_counts(self, start_date: date, end_date: date) -> List[Tuple[int, int]]:
        """기간 내 시간대별 접수량 조회"""
        try:
            log_info("시간대별 접수량 조회", {
                "start_date": start_date,
                "end_date": end_date
            })
            
            start_datetime = datetime.combine(start_date, datetime.min.time())
            end_datetime = datetime.combine(end_date, datetime.max.time())
            
            result = (self.db.query(
                func.extract('hour', Dashboard.create_time).label('hour'),
                func.count(Dashboard.dashboard_id).label('count')
            )
            .filter(
                and_(
                    Dashboard.eta >= start_datetime,
                    Dashboard.eta <= end_datetime
                )
            )
            .group_by(func.extract('hour', Dashboard.create_time))
            .order_by('hour')
            .all())
            
            log_info(f"시간대별 접수량 조회 완료: {len(result)}개 시간대")
            return result
            
        except SQLAlchemyError as e:
            handle_database_error(e, "시간대별 접수량 조회 실패", {
                "start_date": start_date,
                "end_date": end_date
            })