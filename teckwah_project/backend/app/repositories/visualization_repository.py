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
        """배송 상태별 집계
        - eta 기간 내 전체 건수 및 상태별 건수 조회
        - 집계 쿼리 최적화
        """
        try:
            log_info(f"상태별 집계 조회: {start_date} ~ {end_date}")
            # 단일 쿼리로 집계 처리
            result = (
                self.db.query(
                    Dashboard.status, func.count(Dashboard.dashboard_id).label("count")
                )
                .filter(and_(Dashboard.eta >= start_date, Dashboard.eta <= end_date))
                .group_by(Dashboard.status)
                .all()
            )

            log_info(f"상태별 집계 완료: {len(result)}개 상태")
            return result

        except Exception as e:
            log_error(e, "상태별 집계 조회 실패")
            raise

    def get_hourly_counts(
        self, start_date: datetime, end_date: datetime
    ) -> List[Tuple[int, int]]:
        """시간대별 접수량 집계
        - create_time 기준 시간별 그룹핑
        - 24시간 전체 시간대 처리
        """
        try:
            log_info(f"시간대별 집계 조회: {start_date} ~ {end_date}")

            # 시간대별 집계를 단일 쿼리로 처리
            result = (
                self.db.query(
                    extract("hour", Dashboard.create_time).label("hour"),
                    func.count(Dashboard.dashboard_id).label("count"),
                )
                .filter(and_(Dashboard.eta >= start_date, Dashboard.eta <= end_date))
                .group_by("hour")
                .order_by("hour")
                .all()
            )

            log_info(f"시간대별 집계 완료: {len(result)}개 시간대")
            return result

        except Exception as e:
            log_error(e, "시간대별 집계 조회 실패")
            raise

    def get_department_counts(
        self, start_date: datetime, end_date: datetime
    ) -> List[Tuple[str, int]]:
        """부서별 집계 (추가 분석용)"""
        try:
            return (
                self.db.query(
                    Dashboard.department,
                    func.count(Dashboard.dashboard_id).label("count"),
                )
                .filter(and_(Dashboard.eta >= start_date, Dashboard.eta <= end_date))
                .group_by(Dashboard.department)
                .all()
            )
        except Exception as e:
            log_error(e, "부서별 집계 조회 실패")
            raise

    def get_warehouse_counts(
        self, start_date: datetime, end_date: datetime
    ) -> List[Tuple[str, int]]:
        """창고별 집계 (추가 분석용)"""
        try:
            return (
                self.db.query(
                    Dashboard.warehouse,
                    func.count(Dashboard.dashboard_id).label("count"),
                )
                .filter(and_(Dashboard.eta >= start_date, Dashboard.eta <= end_date))
                .group_by(Dashboard.warehouse)
                .all()
            )
        except Exception as e:
            log_error(e, "창고별 집계 조회 실패")
            raise

    def validate_date_range(self, start_date: datetime, end_date: datetime) -> bool:
        """날짜 범위 검증 (1개월 초과 체크)"""
        days_diff = (end_date - start_date).days
        return days_diff <= 31
