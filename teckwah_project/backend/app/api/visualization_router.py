# backend/app/api/visualization_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from app.schemas.visualization_schema import ChartType, DateRange, VisualizationResponse
from app.services.visualization_service import VisualizationService
from app.config.database import get_db
from app.api.deps import get_current_user_department

router = APIRouter()


@router.post("/{chart_type}", response_model=VisualizationResponse)
async def get_visualization_data(
    chart_type: ChartType,
    date_range: DateRange,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user_department),
):
    """시각화 데이터 조회 API"""
    service = VisualizationService(db)

    start_datetime = datetime.combine(date_range.start_date, datetime.min.time())
    end_datetime = datetime.combine(date_range.end_date, datetime.max.time())

    return service.get_visualization_data(chart_type, start_datetime, end_datetime)
