# backend/app/api/visualization_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.schemas.visualization_schema import (
    DeliveryStatusResponse,
    HourlyOrdersResponse,
    VisualizationDateRangeResponse,
    DeliveryStatusData,
    HourlyOrdersData,
)
from app.services.visualization_service import VisualizationService
from app.repositories.visualization_repository import VisualizationRepository
from app.config.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_error
from app.schemas.common_schema import BaseResponse, DateRangeInfo


router = APIRouter()


def get_visualization_service(db: Session = Depends(get_db)) -> VisualizationService:
    """VisualizationService 의존성 주입"""
    repository = VisualizationRepository(db)
    return VisualizationService(repository)


@router.get("/delivery_status", response_model=DeliveryStatusResponse)
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
        oldest_date, latest_date = service.get_date_range()
        message = (
            "데이터를 조회했습니다"
            if data.total_count > 0
            else "조회된 데이터가 없습니다"
        )

        return DeliveryStatusResponse(
            success=True,
            message=message,
            data=data,
            date_range=DateRangeInfo(
                oldest_date=oldest_date.strftime("%Y-%m-%d"),
                latest_date=latest_date.strftime("%Y-%m-%d"),
            ),
        )
    except ValueError as e:
        log_error(e, "날짜 형식 오류")
        return DeliveryStatusResponse(
            success=False,
            message="날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)",
            data={
                "type": "delivery_status",
                "total_count": 0,
                "department_breakdown": {},
            },
        )
    except Exception as e:
        log_error(e, "배송 현황 데이터 조회 실패")
        return DeliveryStatusResponse(
            success=True,
            message="조회된 데이터가 없습니다",
            data={
                "type": "delivery_status",
                "total_count": 0,
                "department_breakdown": {},
            },
        )


@router.get("/hourly_orders", response_model=HourlyOrdersResponse)
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
        message = (
            "데이터를 조회했습니다"
            if data.total_count > 0
            else "조회된 데이터가 없습니다"
        )

        return HourlyOrdersResponse(success=True, message=message, data=data)
    except ValueError as e:
        log_error(e, "날짜 형식 오류")
        return HourlyOrdersResponse(
            success=False,
            message="날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)",
            data={
                "type": "hourly_orders",
                "total_count": 0,
                "average_count": 0,
                "department_breakdown": {},
                "time_slots": [],
            },
        )
    except Exception as e:
        log_error(e, "시간별 접수량 데이터 조회 실패")
        return HourlyOrdersResponse(
            success=True,
            message="조회된 데이터가 없습니다",
            data={
                "type": "hourly_orders",
                "total_count": 0,
                "average_count": 0,
                "department_breakdown": {},
                "time_slots": [],
            },
        )
