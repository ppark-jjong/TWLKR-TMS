"""시각화 관련 서비스"""
from datetime import datetime
from typing import Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.visualization_schema import (
    DeliveryStatusResponse,
    HourlyVolumeResponse,
    Period,
    StatusCount,
    HourlyCount
)
from app.repositories.dashboard_repository import DashboardRepository
from app.utils.logger_util import Logger

class VisualizationService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = DashboardRepository(db)

    async def get_delivery_status(self, start_date: str, end_date: str) -> DeliveryStatusResponse:
        """배송 현황 통계 조회"""
        try:
            stats = await self.repository.get_status_analysis(start_date, end_date)
            
            total = sum(item["count"] for item in stats)
            status_counts = []
            
            for item in stats:
                ratio = (item["count"] / total * 100) if total > 0 else 0
                status_counts.append(
                    StatusCount(
                        status=item["status"],
                        count=item["count"],
                        ratio=round(ratio, 2)
                    )
                )

            return DeliveryStatusResponse(
                total=total,
                status_counts=status_counts,
                period=Period(start_date=start_date, end_date=end_date)
            )
        except Exception as e:
            Logger.error(f"배송 현황 통계 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="배송 현황 통계 조회 중 오류가 발생했습니다."
            )

    async def get_hourly_volume(self, start_date: str, end_date: str) -> HourlyVolumeResponse:
        """시간대별 접수량 조회"""
        try:
            stats = await self.repository.get_hourly_analysis(start_date, end_date)
            
            hourly_counts = [
                HourlyCount(hour=hour, count=count)
                for hour, count in stats.items()
            ]

            return HourlyVolumeResponse(
                total=sum(item.count for item in hourly_counts),
                hourly_counts=sorted(hourly_counts, key=lambda x: x.hour),
                period=Period(start_date=start_date, end_date=end_date)
            )
        except Exception as e:
            Logger.error(f"시간대별 접수량 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="시간대별 접수량 조회 중 오류가 발생했습니다."
            )