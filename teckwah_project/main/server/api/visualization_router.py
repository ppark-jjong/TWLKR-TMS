# teckwah_project/main/server/api/visualization_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import Dict, Any
from pydantic import ValidationError

from app.services.visualization_service import VisualizationService
from app.repositories.visualization_repository import VisualizationRepository
from app.config.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_info, log_error
from app.utils.datetime_helper import get_date_range, get_kst_now
from app.schemas.visualization_schema import (
    DeliveryStatusResponse,
    HourlyOrdersResponse,
    VisualizationDateRangeResponse,
)
from app.utils.api_decorators import error_handler

router = APIRouter()


def get_visualization_service(db: Session = Depends(get_db)) -> VisualizationService:
    """VisualizationService 의존성 주입"""
    repository = VisualizationRepository(db)
    return VisualizationService(repository)


@router.post("/delivery_status", response_model=DeliveryStatusResponse)
@error_handler("배송 현황 데이터 조회")
async def get_delivery_status(
    date_range: Dict[str, str] = Body(...),
    service: VisualizationService = Depends(get_visualization_service),
    current_user: TokenData = Depends(get_current_user),
):
    """배송 현황 데이터 조회 API - create_time 기준으로 변경"""
    start_date = date_range.get("start_date")
    end_date = date_range.get("end_date")
    
    log_info(f"배송 현황 데이터 조회 요청: {start_date} ~ {end_date}")

    try:
        # 날짜 문자열을 datetime 객체로 변환 (KST 기준)
        start_dt, _ = get_date_range(start_date)
        _, end_dt = get_date_range(end_date)
    except ValueError as e:
        log_error(e, f"날짜 형식 오류: {start_date}, {end_date}")
        raise Exception("날짜 형식이 올바르지 않습니다")

    # create_time 기준으로 데이터 조회 변경
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


@router.post("/hourly_orders", response_model=HourlyOrdersResponse)
@error_handler("시간대별 접수량 데이터 조회")
async def get_hourly_orders(
    date_range: Dict[str, str] = Body(...),
    service: VisualizationService = Depends(get_visualization_service),
    current_user: TokenData = Depends(get_current_user),
):
    """시간대별 접수량 데이터 조회 API - create_time 기준"""
    start_date = date_range.get("start_date")
    end_date = date_range.get("end_date")
    
    log_info(f"시간대별 접수량 데이터 조회 요청: {start_date} ~ {end_date}")

    try:
        # 날짜 문자열을 datetime 객체로 변환 (KST 기준)
        start_dt, _ = get_date_range(start_date)
        _, end_dt = get_date_range(end_date)
    except ValueError as e:
        log_error(e, f"날짜 형식 오류: {start_date}, {end_date}")
        raise Exception("날짜 형식이 올바르지 않습니다")

    # create_time 기준으로 데이터 조회
    data = service.get_hourly_orders(start_dt, end_dt)
    oldest_date, latest_date = service.get_date_range()

    # 디버깅용 로그 추가
    log_info(f"시간대별 접수량 데이터 구조: {data.keys()}")

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


@router.get("/date_range", response_model=VisualizationDateRangeResponse)
@error_handler("조회 가능 날짜 범위 조회")
async def get_date_range_api(
    service: VisualizationService = Depends(get_visualization_service),
    current_user: TokenData = Depends(get_current_user),
):
    """조회 가능한 날짜 범위 조회 API"""
    log_info("조회 가능 날짜 범위 조회 요청")

    oldest_date, latest_date = service.get_date_range()

    return VisualizationDateRangeResponse(
        success=True,
        message="조회 가능 날짜 범위를 조회했습니다",
        date_range={
            "oldest_date": oldest_date.strftime("%Y-%m-%d"),
            "latest_date": latest_date.strftime("%Y-%m-%d"),
        },
    )