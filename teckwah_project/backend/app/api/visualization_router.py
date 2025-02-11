# backend/app/api/visualization_router.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.schemas.visualization_schema import (
    VisualizationType, DateRangeQuery, VisualizationResponse
)
from app.repositories.visualization_repository import VisualizationRepository
from app.services.visualization_service import VisualizationService
from app.database import get_db

router = APIRouter()

def get_visualization_service(db: Session = Depends(get_db)) -> VisualizationService:
    repository = VisualizationRepository(db)
    return VisualizationService(repository)

@router.post("/{viz_type}", response_model=VisualizationResponse)
async def get_visualization_data(
    viz_type: VisualizationType,
    date_range: DateRangeQuery,
    service: VisualizationService = Depends(get_visualization_service)
):
    """시각화 데이터 조회 API"""
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

    return service.get_visualization_data(
        viz_type,
        date_range.start_date,
        date_range.end_date
    )