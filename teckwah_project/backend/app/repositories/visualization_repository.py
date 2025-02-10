from datetime import date
from typing import Dict, Any
from sqlalchemy import func, and_
from sqlalchemy.orm import Session
from app.models.dashboard_model import Dashboard  # models에서 import
from app.utils.logger_util import Logger

class VisualizationRepository:
    def __init__(self, db: Session):
        self.db = db

    async def get_delivery_status(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """배송 현황 통계"""
        try:
            result = (
                self.db.query(
                    Dashboard.status,
                    func.count(Dashboard.dashboard_id).label("count")
                )
                .filter(
                    and_(
                        func.date(Dashboard.eta) >= start_date,
                        func.date(Dashboard.eta) <= end_date
                    )
                )
                .group_by(Dashboard.status)
                .all()
            )

            total = sum(row.count for row in result)
            status_counts = {row.status: row.count for row in result}
            status_ratios = {
                status: (count / total * 100) if total > 0 else 0 
                for status, count in status_counts.items()
            }

            return {
                "total": total,
                "status_counts": status_counts,
                "status_ratios": status_ratios
            }
        except Exception as e:
            Logger.error(f"배송 현황 통계 조회 중 오류 발생: {str(e)}")
            raise

    async def get_hourly_orders(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """시간대별 접수량"""
        try:
            result = (
                self.db.query(
                    func.extract('hour', Dashboard.create_time).label('hour'),
                    func.count(Dashboard.dashboard_id).label('count')
                )
                .filter(
                    and_(
                        func.date(Dashboard.eta) >= start_date,
                        func.date(Dashboard.eta) <= end_date
                    )
                )
                .group_by('hour')
                .order_by('hour')
                .all()
            )

            hourly_counts = {hour: 0 for hour in range(24)}
            for row in result:
                hourly_counts[int(row.hour)] = row.count

            return {
                "hourly_counts": hourly_counts,
                "total": sum(hourly_counts.values())
            }
        except Exception as e:
            Logger.error(f"시간대별 접수량 조회 중 오류 발생: {str(e)}")
            raise
        

    async def get_sla_summary(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """SLA 통계"""
        try:
            result = (
                self.db.query(
                    Dashboard.status,
                    func.count(Dashboard.dashboard_id).label("count")
                )
                .filter(
                    and_(
                        func.date(Dashboard.eta) >= start_date,
                        func.date(Dashboard.eta) <= end_date
                    )
                )
                .group_by(Dashboard.status)
                .all()
            )

            total = sum(row.count for row in result)
            status_counts = {row.status: row.count for row in result}
            status_ratios = {
                status: (count / total * 100) if total > 0 else 0 
                for status, count in status_counts.items()
            }

            return {
                "total": total,
                "status_counts": status_counts,
                "status_ratios": status_ratios
            }
        except Exception as e:
            Logger.error(f"SLA 통계 조회 중 오류 발생: {str(e)}")
            raise

    async def get_status_summary(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """상태별 통계"""
        try:
            result = (
                self.db.query(
                    Dashboard.status,
                    func.count(Dashboard.dashboard_id).label("count")
                )
                .filter(
                    and_(
                        func.date(Dashboard.eta) >= start_date,
                        func.date(Dashboard.eta) <= end_date
                    )
                )
                .group_by(Dashboard.status)
                .all()
            )

            total = sum(row.count for row in result)
            status_counts = {row.status: row.count for row in result}
            status_ratios = {
                status: (count / total * 100) if total > 0 else 0 
                for status, count in status_counts.items()
            }

            return {
                "total": total,
                "status_counts": status_counts,
                "status_ratios": status_ratios
            }
        except Exception as e:
            Logger.error(f"상태별 통계 조회 중 오류 발생: {str(e)}")
            raise 