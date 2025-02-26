# backend/app/api/visualization_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.services.visualization_service import VisualizationService
from app.repositories.visualization_repository import VisualizationRepository
from app.config.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_info, log_error
from app.utils.datetime_helper import get_date_range
from app.schemas.visualization_schema import (
    DeliveryStatusResponse,
    HourlyOrdersResponse,
)

router = APIRouter()


def get_visualization_service(db: Session = Depends(get_db)) -> VisualizationService:
    """VisualizationService 의존성 주입"""
    repository = VisualizationRepository(db)
    return VisualizationService(repository)


@router.get("/delivery_status", response_model=DeliveryStatusResponse)
async def get_delivery_status(
    start_date: str,
    end_date: str,
    service: VisualizationService = Depends(get_visualization_service),
    current_user: TokenData = Depends(get_current_user),
):
    """배송 현황 데이터 조회 API"""
    try:
        log_info(f"배송 현황 데이터 조회 요청: {start_date} ~ {end_date}")

        try:
            start_dt, _ = get_date_range(start_date)
            _, end_dt = get_date_range(end_date)
        except ValueError:
            log_error(None, f"날짜 형식 오류: {start_date}, {end_date}")
            return DeliveryStatusResponse(
                success=False,
                message="날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)",
                data=None,
            )

        data = service.get_delivery_status(start_dt, end_dt)
        oldest_date, latest_date = service.get_date_range()

        message_text = (
            "조회된 데이터가 없습니다"
            if data["total_count"] == 0
            else "데이터를 조회했습니다"
        )

        return DeliveryStatusResponse(
            success=True,
            message=message_text,
            data=data,
            date_range={
                "oldest_date": oldest_date.strftime("%Y-%m-%d"),
                "latest_date": latest_date.strftime("%Y-%m-%d"),
            },
        )

    except Exception as e:
        log_error(e, "배송 현황 데이터 조회 실패")
        return DeliveryStatusResponse(
            success=False, message="데이터 조회 중 오류가 발생했습니다", data=None
        )


@router.get("/hourly_orders", response_model=HourlyOrdersResponse)
async def get_hourly_orders(
    start_date: str,
    end_date: str,
    service: VisualizationService = Depends(get_visualization_service),
    current_user: TokenData = Depends(get_current_user),
):
    """시간대별 접수량 데이터 조회 API"""
    try:
        log_info(f"시간대별 접수량 데이터 조회 요청: {start_date} ~ {end_date}")

        try:
            start_dt, _ = get_date_range(start_date)
            _, end_dt = get_date_range(end_date)
        except ValueError:
            log_error(None, f"날짜 형식 오류: {start_date}, {end_date}")
            return HourlyOrdersResponse(
                success=False,
                message="날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)",
                data=None,
            )

        data = service.get_hourly_orders(start_dt, end_dt)
        oldest_date, latest_date = service.get_date_range()

        message_text = (
            "조회된 데이터가 없습니다"
            if data["total_count"] == 0
            else "데이터를 조회했습니다"
        )

        return HourlyOrdersResponse(
            success=True,
            message=message_text,
            data=data,
            date_range={
                "oldest_date": oldest_date.strftime("%Y-%m-%d"),
                "latest_date": latest_date.strftime("%Y-%m-%d"),
            },
        )

    except Exception as e:
        log_error(e, "시간대별 접수량 데이터 조회 실패")
        return HourlyOrdersResponse(
            success=False, message="데이터 조회 중 오류가 발생했습니다", data=None
        )
