"""시각화 관련 API 라우터"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.user_model import User
from app.schemas.visualization_schema import (
    DeliveryStatusResponse,
    HourlyVolumeResponse
)
from app.services.visualization_service import VisualizationService
from app.services.auth_service import get_current_user
from app.utils.logger_util import Logger

router = APIRouter(prefix="/visualization", tags=["시각화"])

def get_visualization_service(db: Session = Depends(get_db)) -> VisualizationService:
    """VisualizationService 의존성 주입"""
    return VisualizationService(db)

@router.get("/delivery-status", response_model=DeliveryStatusResponse)
async def get_delivery_status(
    start_date: str = Query(..., description="시작일 (YYYY-MM-DD)"),
    end_date: str = Query(..., description="종료일 (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    service: VisualizationService = Depends(get_visualization_service)
):
    """배송 현황 조회 (상태별 건수 및 비율)"""
    try:
        # 날짜 형식 검증
        try:
            datetime.strptime(start_date, "%Y-%m-%d")
            datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)"
            )

        Logger.info(f"배송 현황 조회 시도: {start_date} ~ {end_date}")
        result = await service.get_delivery_status(start_date, end_date)
        return result

    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"배송 현황 조회 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="배송 현황 조회 중 오류가 발생했습니다."
        )

@router.get("/hourly-volume", response_model=HourlyVolumeResponse)
async def get_hourly_volume(
    start_date: str = Query(..., description="시작일 (YYYY-MM-DD)"),
    end_date: str = Query(..., description="종료일 (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    service: VisualizationService = Depends(get_visualization_service)
):
    """시간대별 접수량 조회"""
    try:
        # 날짜 형식 검증
        try:
            datetime.strptime(start_date, "%Y-%m-%d")
            datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용하세요."
            )

        Logger.info(f"시간대별 접수량 조회 시도: {start_date} ~ {end_date}")
        result = await service.get_hourly_volume(start_date, end_date)
        return result

    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"시간대별 접수량 조회 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="시간대별 접수량 조회 중 오류가 발생했습니다."
        )