# backend/app/api/visualization_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.schemas.visualization_schema import (
    DeliveryStatusResponse,
    HourlyOrdersResponse,
    VisualizationBaseResponse,
)
from app.services.visualization_service import VisualizationService
from app.repositories.visualization_repository import VisualizationRepository
from app.config.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_error

router = APIRouter()


class DeliveryStatusResponseWithRange(
    DeliveryStatusResponse, VisualizationBaseResponse
):
    pass


class HourlyOrdersResponseWithRange(HourlyOrdersResponse, VisualizationBaseResponse):
    pass


@router.get("/delivery_status", response_model=DeliveryStatusResponseWithRange)
async def get_delivery_status(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """배송 현황 데이터 조회 API"""
    try:
        repository = VisualizationRepository(db)
        service = VisualizationService(repository)

        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

        data = service.get_delivery_status(start, end)
        oldest_date, latest_date = repository.get_date_range()

        return {
            **data.dict(),
            "date_range": {
                "oldest_date": oldest_date.strftime("%Y-%m-%d"),
                "latest_date": latest_date.strftime("%Y-%m-%d"),
            },
        }
    except Exception as e:
        log_error(e, "배송 현황 데이터 조회 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="배송 현황 데이터 조회 중 오류가 발생했습니다",
        )


@router.get("/hourly_orders", response_model=HourlyOrdersResponseWithRange)
async def get_hourly_orders(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """시간별 접수량 데이터 조회 API"""
    try:
        repository = VisualizationRepository(db)
        service = VisualizationService(repository)

        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

        data = service.get_hourly_orders(start, end)
        oldest_date, latest_date = repository.get_date_range()

        return {
            **data.dict(),
            "date_range": {
                "oldest_date": oldest_date.strftime("%Y-%m-%d"),
                "latest_date": latest_date.strftime("%Y-%m-%d"),
            },
        }
    except Exception as e:
        log_error(e, "시간별 접수량 데이터 조회 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="시간별 접수량 데이터 조회 중 오류가 발생했습니다",
        )
