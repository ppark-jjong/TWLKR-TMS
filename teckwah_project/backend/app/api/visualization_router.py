# backend/app/api/visualization_router.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta, datetime

from app.schemas.visualization_schema import (
    VisualizationType, DateRangeQuery, VisualizationResponse,
    DeliveryStatusResponse, HourlyOrderResponse
)
from app.repositories.visualization_repository import VisualizationRepository
from app.services.visualization_service import VisualizationService
from app.database import get_db
from app.api.deps import verify_token, get_current_user_id

router = APIRouter()

def get_visualization_service(db: Session = Depends(get_db)) -> VisualizationService:
    repository = VisualizationRepository(db)
    return VisualizationService(repository)

@router.post("/{viz_type}", response_model=VisualizationResponse)
async def get_visualization_data(
    viz_type: VisualizationType,
    date_range: DateRangeQuery,
    service: VisualizationService = Depends(get_visualization_service),
    _: str = Depends(verify_token)  # JWT 토큰 검증
):
    """시각화 데이터 조회 API"""
    try:
        # 날짜 범위 검증 (1개월 이내)
        today = date.today()
        if (date_range.end_date - date_range.start_date).days > 31:
            raise HTTPException(
                status_code=400,
                detail="조회 기간은 1개월을 초과할 수 없습니다"
            )
        
        # 미래 데이터 조회 제한
        if date_range.end_date > today:
            raise HTTPException(
                status_code=400,
                detail="미래 날짜는 조회할 수 없습니다"
            )

        # 시작일과 종료일의 시간을 각각 00:00:00과 23:59:59로 설정
        start_datetime = datetime.combine(date_range.start_date, datetime.min.time())
        end_datetime = datetime.combine(date_range.end_date, datetime.max.time())

        return service.get_visualization_data(
            viz_type,
            start_datetime,
            end_datetime
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"데이터 조회 중 오류가 발생했습니다: {str(e)}")