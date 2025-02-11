"""시각화 관련 서비스"""
from datetime import datetime, date
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.visualization_schema import (
    DeliveryStatusResponse,
    HourlyVolumeResponse,
    Period,
    StatusCount,
    HourlyCount
)
from sqlalchemy import func, and_
from app.models.dashboard_model import Dashboard
from app.repositories.visualization_repository import VisualizationRepository
from app.utils.logger_util import Logger

class VisualizationService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = VisualizationRepository(db)


    async def get_delivery_status(self, start_date: str, end_date: str) -> DeliveryStatusResponse:
        """
        배송 현황 통계 조회
        
        Args:
            start_date: 시작일 (YYYY-MM-DD)
            end_date: 종료일 (YYYY-MM-DD)
            
        Returns:
            DeliveryStatusResponse: 배송 현황 통계 데이터
            
        Raises:
            HTTPException: 날짜 검증 실패 또는 조회 실패 시
        """
        try:
            # 날짜 범위 검증
            self._validate_date_range(start_date, end_date)
            
            Logger.info(f"배송 현황 통계 조회 시작: {start_date} ~ {end_date}")
            
            # 데이터 조회
            stats = await self.repository.get_delivery_status(
                datetime.strptime(start_date, "%Y-%m-%d").date(),
                datetime.strptime(end_date, "%Y-%m-%d").date()
            )
            
            # 데이터 없음 처리
            if not stats or stats.get("total", 0) == 0:
                return DeliveryStatusResponse(
                    total=0,
                    status_counts=[],
                    period=Period(start_date=start_date, end_date=end_date)
                )

            # 응답 데이터 생성
            status_counts = []
            for item in stats.get("status_counts", []):
                status_counts.append(
                    StatusCount(
                        status=item["status"],
                        count=item["count"],
                        ratio=round(item["count"] / stats["total"] * 100, 2)
                    )
                )

            return DeliveryStatusResponse(
                total=stats["total"],
                status_counts=status_counts,
                period=Period(start_date=start_date, end_date=end_date)
            )

        except HTTPException:
            raise
        except Exception as e:
            Logger.error(f"배송 현황 통계 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="배송 현황 통계 조회 중 오류가 발생했습니다."
            )

    async def get_hourly_volume(self, start_date: date, end_date: date) -> Dict[str, Any]:
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

            # 24시간 전체 데이터 초기화
            hourly_counts = {str(hour).zfill(2): 0 for hour in range(24)}
            
            # 조회된 데이터 매핑
            for row in result:
                hour = str(int(row.hour)).zfill(2)
                hourly_counts[hour] = row.count

            return {
                "hourly_counts": hourly_counts,
                "total": sum(hourly_counts.values())
            }
        except Exception as e:
            Logger.error(f"시간대별 접수량 조회 중 오류 발생: {str(e)}")
            raise