# backend/app/api/visualization_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.schemas.visualization_schema import (
    DateRange,
    DeliveryStatusResponse,
    HourlyOrdersResponse,
    ChartType,
)
from app.services.visualization_service import VisualizationService
from app.repositories.visualization_repository import VisualizationRepository
from app.config.database import get_db
from app.api.deps import get_current_user_department
from app.utils.logger import log_error

router = APIRouter()


@router.get("/delivery_status", response_model=DeliveryStatusResponse)
async def get_delivery_status(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db),
    current_department: str = Depends(get_current_user_department),
):
    """배송 현황 데이터 조회 API"""
    try:
        repository = VisualizationRepository(db)
        service = VisualizationService(repository)
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

        return service.get_delivery_status(start, end)
    except Exception as e:
        log_error(e, "배송 현황 데이터 조회 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="배송 현황 데이터 조회 중 오류가 발생했습니다",
        )


@router.get("/hourly_orders", response_model=HourlyOrdersResponse)
async def get_hourly_orders(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db),
    current_department: str = Depends(get_current_user_department),
):
    """시간별 접수량 데이터 조회 API"""
    try:
        repository = VisualizationRepository(db)
        service = VisualizationService(repository)
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

        return service.get_hourly_orders(start, end)
    except Exception as e:
        log_error(e, "시간별 접수량 데이터 조회 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="시간별 접수량 데이터 조회 중 오류가 발생했습니다",
        )


@router.get("/oldest-date")
async def get_oldest_data_date(
    db: Session = Depends(get_db),
    current_department: str = Depends(get_current_user_department),
):
    """가장 오래된 데이터 날짜 조회 API"""
    try:
        repository = VisualizationRepository(db)
        service = VisualizationService(repository)
        oldest_date = service.get_oldest_data_date()
        return {
            "success": True,
            "message": "가장 오래된 데이터 날짜 조회 성공",
            "data": {"oldest_date": oldest_date.strftime("%Y-%m-%d")},
        }
    except Exception as e:
        log_error(e, "가장 오래된 데이터 날짜 조회 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터 조회 중 오류가 발생했습니다",
        )
