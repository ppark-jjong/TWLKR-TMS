# backend/app/repositories/download_repository.py
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from main.server.models.dashboard_model import Dashboard
from main.server.utils.logger import log_info, log_error
from main.server.utils.datetime import localize_to_kst, get_kst_now


class DownloadRepository:
    """다운로드 전용 저장소 - 다운로드용 데이터 조회 기능 제공"""

    def __init__(self, db: Session):
        self.db = db

    def get_dashboard_data_by_create_time(
        self, start_time: datetime, end_time: datetime
    ) -> List[Dashboard]:
        """create_time 기준으로 날짜 범위 내 대시보드 데이터 조회 (다운로드용)"""
        try:
            log_info(f"다운로드용 대시보드 데이터 조회: {start_time} ~ {end_time}")

            # 다운로드에 필요한 모든 관련 데이터를 함께 로드 (eager loading)
            query = (
                self.db.query(Dashboard)
                .options(joinedload(Dashboard.postal_code_info))
                .options(joinedload(Dashboard.remarks))
                .filter(Dashboard.create_time.between(start_time, end_time))
                .order_by(Dashboard.create_time)
            )

            result = query.all()
            log_info(f"다운로드용 데이터 조회 결과: {len(result)}건")
            return result
        except Exception as e:
            log_error(e, "다운로드용 데이터 조회 실패")
            return []

    def get_create_time_date_range(self) -> Tuple[datetime, datetime]:
        """다운로드 가능한 날짜 범위 조회 (create_time 기준)"""
        try:
            log_info("다운로드 가능 날짜 범위 조회")

            # 가장 빠른 날짜와 가장 늦은 날짜 조회
            from sqlalchemy import func

            result = self.db.query(
                func.min(Dashboard.create_time).label("oldest_date"),
                func.max(Dashboard.create_time).label("latest_date"),
            ).first()

            # 결과 검증 및 기본값 설정
            now = get_kst_now()
            oldest_date = result.oldest_date or now - timedelta(days=30)
            latest_date = result.latest_date or now

            # 시간대 정보 없는 경우 KST로 변환
            oldest_date = localize_to_kst(oldest_date)
            latest_date = localize_to_kst(latest_date)

            log_info(f"다운로드 가능 날짜 범위: {oldest_date} ~ {latest_date}")
            return oldest_date, latest_date
        except Exception as e:
            log_error(e, "다운로드 가능 날짜 범위 조회 실패")
            # 실패 시 기본값으로 현재 날짜 기준 30일 범위 반환
            now = get_kst_now()
            return now - timedelta(days=30), now
