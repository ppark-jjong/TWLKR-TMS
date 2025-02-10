"""시각화 관련 서비스"""
from datetime import datetime, timedelta
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
from app.repositories.visualization_repository import VisualizationRepository
from app.utils.logger_util import Logger

class VisualizationService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = VisualizationRepository(db)

    def _validate_date_range(self, start_date: str, end_date: str) -> None:
        """
        날짜 범위 유효성 검증
        
        Args:
            start_date: 시작일 (YYYY-MM-DD)
            end_date: 종료일 (YYYY-MM-DD)
            
        Raises:
            HTTPException: 날짜 형식이 잘못되었거나 범위가 유효하지 않을 경우
        """
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d")
            
            if start > end:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="시작일이 종료일보다 늦을 수 없습니다."
                )

            # 1개월 이내 데이터만 조회 가능
            today = datetime.now()
            one_month_ago = today - timedelta(days=30)
            
            if start < one_month_ago or end > today:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="조회 가능한 기간은 오늘부터 1개월 전까지입니다."
                )

        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)"
            )

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

    async def get_hourly_volume(self, start_date: str, end_date: str) -> HourlyVolumeResponse:
        """
        시간대별 접수량 조회
        
        Args:
            start_date: 시작일 (YYYY-MM-DD)
            end_date: 종료일 (YYYY-MM-DD)
            
        Returns:
            HourlyVolumeResponse: 시간대별 접수량 데이터
            
        Raises:
            HTTPException: 날짜 검증 실패 또는 조회 실패 시
        """
        try:
            # 날짜 범위 검증
            self._validate_date_range(start_date, end_date)
            
            Logger.info(f"시간대별 접수량 조회 시작: {start_date} ~ {end_date}")
            
            # 데이터 조회
            stats = await self.repository.get_hourly_volume(
                datetime.strptime(start_date, "%Y-%m-%d").date(),
                datetime.strptime(end_date, "%Y-%m-%d").date()
            )
            
            # 데이터 없음 처리
            if not stats or stats.get("total", 0) == 0:
                hourly_counts = [HourlyCount(hour=hour, count=0) for hour in range(24)]
                return HourlyVolumeResponse(
                    total=0,
                    hourly_counts=hourly_counts,
                    period=Period(start_date=start_date, end_date=end_date)
                )

            # 응답 데이터 생성
            hourly_counts = []
            for hour, count in stats.get("hourly_counts", {}).items():
                hourly_counts.append(
                    HourlyCount(
                        hour=int(hour),
                        count=count
                    )
                )

            # 시간 순으로 정렬
            hourly_counts.sort(key=lambda x: x.hour)

            return HourlyVolumeResponse(
                total=stats["total"],
                hourly_counts=hourly_counts,
                period=Period(start_date=start_date, end_date=end_date)
            )

        except HTTPException:
            raise
        except Exception as e:
            Logger.error(f"시간대별 접수량 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="시간대별 접수량 조회 중 오류가 발생했습니다."
            )