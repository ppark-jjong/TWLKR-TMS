# backend/app/repositories/visualization_repository.py

from datetime import datetime
from typing import List, Tuple, Dict, Any, Union
from sqlalchemy import func, and_, extract
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.models.dashboard_model import Dashboard
from app.utils.logger import log_error, log_info


class VisualizationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_raw_delivery_data(
        self, start_date: datetime, end_time: datetime
    ) -> List[Tuple]:
        """배송 현황 raw 데이터 조회 - create_time 기준"""
        try:
            log_info(f"배송 현황 데이터 조회: {start_date} ~ {end_time}")

            result = (
                self.db.query(
                    Dashboard.department, Dashboard.status, Dashboard.create_time
                )
                .filter(
                    and_(
                        Dashboard.create_time >= start_date,
                        Dashboard.create_time <= end_time,
                    )
                )
                .all()
            )

            log_info(f"배송 현황 데이터 조회 결과: {len(result)}건")

            # 데이터 검증 로깅
            if result:
                sample = result[0]
                log_info(
                    f"배송 현황 데이터 샘플: 부서={sample[0]}, 상태={sample[1]}, 시간={sample[2]}"
                )

                # 유효하지 않은 데이터 검사
                invalid_data = [
                    (i, row)
                    for i, row in enumerate(result)
                    if row[0] is None or row[1] is None or row[2] is None
                ]
                if invalid_data:
                    log_error(
                        None,
                        f"누락된 필드가 있는 데이터: {len(invalid_data)}건",
                        invalid_data[:5] if len(invalid_data) > 5 else invalid_data,
                    )

            return result
        except SQLAlchemyError as e:
            log_error(e, "배송 현황 데이터 조회 실패")
            raise

    def get_raw_hourly_data(
        self, start_date: datetime, end_date: datetime
    ) -> List[Tuple]:
        """시간대별 접수량 raw 데이터 조회 - create_time 기준"""
        try:
            log_info(f"시간대별 접수량 데이터 조회: {start_date} ~ {end_date}")

            result = (
                self.db.query(Dashboard.department, Dashboard.create_time)
                .filter(
                    and_(
                        Dashboard.create_time >= start_date,
                        Dashboard.create_time <= end_date,
                    )
                )
                .all()
            )

            log_info(f"시간대별 접수량 데이터 조회 결과: {len(result)}건")

            # 데이터 검증 로깅
            if result:
                sample = result[0]
                log_info(
                    f"시간대별 접수량 데이터 샘플: 부서={sample[0]}, 시간={sample[1]}"
                )

                # 유효하지 않은 데이터 검사
                invalid_data = [
                    (i, row)
                    for i, row in enumerate(result)
                    if row[0] is None or row[1] is None
                ]
                if invalid_data:
                    log_error(
                        None,
                        f"누락된 필드가 있는 데이터: {len(invalid_data)}건",
                        invalid_data[:5] if len(invalid_data) > 5 else invalid_data,
                    )

            return result
        except SQLAlchemyError as e:
            log_error(e, "시간대별 접수량 데이터 조회 실패")
            raise

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 - create_time 기준"""
        try:
            log_info("조회 가능 날짜 범위 조회")

            result = self.db.query(
                func.min(Dashboard.create_time).label("oldest_date"),
                func.max(Dashboard.create_time).label("latest_date"),
            ).first()

            oldest_date = result.oldest_date if result.oldest_date else datetime.now()
            latest_date = result.latest_date if result.latest_date else datetime.now()

            log_info(f"조회 가능 날짜 범위: {oldest_date} ~ {latest_date}")
            return oldest_date, latest_date

        except SQLAlchemyError as e:
            log_error(e, "날짜 범위 조회 실패")
            raise

    def has_data_in_date_range(self, start_date: datetime, end_date: datetime) -> bool:
        """특정 날짜 범위에 데이터가 있는지 확인"""
        try:
            log_info(f"데이터 존재 여부 확인: {start_date} ~ {end_date}")

            count = (
                self.db.query(func.count(Dashboard.dashboard_id))
                .filter(
                    and_(
                        Dashboard.create_time >= start_date,
                        Dashboard.create_time <= end_date,
                    )
                )
                .scalar()
            )

            has_data = count > 0
            log_info(f"데이터 존재 여부: {has_data} (건수: {count})")
            return has_data

        except SQLAlchemyError as e:
            log_error(e, "데이터 존재 여부 확인 실패")
            return False
