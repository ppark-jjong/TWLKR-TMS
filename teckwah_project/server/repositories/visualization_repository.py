# teckwah_project/server/repositories/visualization_repository.py
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_, text
from datetime import datetime, timedelta
from typing import List, Tuple, Optional

from server.models.dashboard_model import Dashboard
from server.utils.logger import log_info, log_error


class VisualizationRepository:
    """시각화 저장소 구현"""

    def __init__(self, db: Session):
        self.db = db

    def get_raw_delivery_data(
        self, start_time: datetime, end_time: datetime
    ) -> List[Tuple]:
        """배송 현황 데이터 조회 (create_time 기준)"""
        try:
            log_info(f"배송 현황 데이터 조회: {start_time} ~ {end_time}")

            # 부서별, 상태별 데이터 조회
            query = (
                self.db.query(
                    Dashboard.department, Dashboard.status, Dashboard.create_time
                )
                .filter(Dashboard.create_time.between(start_time, end_time))
                .order_by(Dashboard.create_time)
            )

            result = query.all()
            log_info(f"배송 현황 데이터 조회 결과: {len(result)}건")
            return result
        except Exception as e:
            log_error(e, "배송 현황 데이터 조회 실패")
            return []

    def get_raw_hourly_data(
        self, start_time: datetime, end_time: datetime
    ) -> List[Tuple]:
        """시간대별 접수량 데이터 조회 (create_time 기준)"""
        try:
            log_info(f"시간대별 접수량 데이터 조회: {start_time} ~ {end_time}")

            # 부서별, 생성 시간 데이터 조회
            query = (
                self.db.query(Dashboard.department, Dashboard.create_time)
                .filter(Dashboard.create_time.between(start_time, end_time))
                .order_by(Dashboard.create_time)
            )

            result = query.all()
            log_info(f"시간대별 접수량 데이터 조회 결과: {len(result)}건")
            return result
        except Exception as e:
            log_error(e, "시간대별 접수량 데이터 조회 실패")
            return []

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 (create_time 기준)"""
        try:
            log_info("시각화 날짜 범위 조회")

            # 가장 오래된 데이터와 최신 데이터의 날짜 조회
            result = self.db.query(
                func.min(Dashboard.create_time).label("oldest_date"),
                func.max(Dashboard.create_time).label("latest_date"),
            ).first()

            # 결과 검증 및 기본값 설정
            now = datetime.utcnow()
            oldest_date = (
                result.oldest_date
                if result and result.oldest_date
                else now - timedelta(days=30)
            )
            latest_date = result.latest_date if result and result.latest_date else now

            log_info(f"시각화 날짜 범위 조회 결과: {oldest_date} ~ {latest_date}")
            return oldest_date, latest_date
        except Exception as e:
            log_error(e, "시각화 날짜 범위 조회 실패")
            # 기본값 반환
            now = datetime.utcnow()
            return now - timedelta(days=30), now

    def get_department_summary(self) -> List[Tuple]:
        """부서별 요약 데이터 조회"""
        try:
            log_info("부서별 요약 데이터 조회")

            # 부서별 건수 및 상태 분포 조회
            query = (
                self.db.query(
                    Dashboard.department,
                    func.count(Dashboard.dashboard_id).label("count"),
                    Dashboard.status,
                    func.count(Dashboard.status).label("status_count"),
                )
                .group_by(Dashboard.department, Dashboard.status)
                .order_by(Dashboard.department, Dashboard.status)
            )

            result = query.all()
            log_info(f"부서별 요약 데이터 조회 결과: {len(result)}건")
            return result
        except Exception as e:
            log_error(e, "부서별 요약 데이터 조회 실패")
            return []
