# backend/app/api/dashboard_router.py

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from backend.app.schemas.dashboard_schema import (
    DashboardCreate, DashboardResponse, DashboardDetailResponse,
    DashboardStatusUpdate, DashboardRemarkUpdate, DashboardDriverUpdate,
    DateQuery, DashboardDepartment
)
from app.api.deps import get_current_user_department
from app.repositories.dashboard_repository import DashboardRepository
from app.services.dashboard_service import DashboardService
from app.config.database import get_db

router = APIRouter()

def get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    repository = DashboardRepository(db)
    return DashboardService(repository)

@router.post("/", response_model=DashboardResponse)
async def create_dashboard(
    dashboard_data: DashboardCreate,
    service: DashboardService = Depends(get_dashboard_service),
    user_department: str = Depends(get_current_user_department)
):
    """대시보드 생성"""
    return service.create_dashboard(dashboard_data, user_department)

@router.get("/list", response_model=List[DashboardResponse])
async def get_dashboard_list(
    date_query: DateQuery,
    department: Optional[DashboardDepartment] = None,
    service: DashboardService = Depends(get_dashboard_service)
):
    """날짜별 대시보드 목록 조회"""
    return service.get_dashboard_list(date_query.date, department.value if department else None)

@router.get("/{dashboard_id}", response_model=DashboardDetailResponse)
async def get_dashboard_detail(
    dashboard_id: int,
    service: DashboardService = Depends(get_dashboard_service)
):
    """대시보드 상세 정보 조회"""
    return service.get_dashboard_detail(dashboard_id)

@router.patch("/{dashboard_id}/status", response_model=DashboardDetailResponse)
async def update_dashboard_status(
    dashboard_id: int,
    status_update: DashboardStatusUpdate,
    service: DashboardService = Depends(get_dashboard_service)
):
    """대시보드 상태 업데이트"""
    return service.update_dashboard_status(dashboard_id, status_update)

@router.patch("/{dashboard_id}/remark", response_model=DashboardDetailResponse)
async def update_dashboard_remark(
    dashboard_id: int,
    remark_update: DashboardRemarkUpdate,
    service: DashboardService = Depends(get_dashboard_service)
):
    """대시보드 메모 업데이트"""
    return service.update_dashboard_remark(dashboard_id, remark_update)

@router.post("/assign", response_model=List[DashboardResponse])
async def assign_driver(
    driver_update: DashboardDriverUpdate,
    service: DashboardService = Depends(get_dashboard_service)
):
    """배차 정보 업데이트"""
    return service.update_driver_info(driver_update)

@router.delete("/")
async def delete_dashboards(
    dashboard_ids: List[int] = Query(..., description="삭제할 대시보드 ID 목록"),
    service: DashboardService = Depends(get_dashboard_service)
):
    """대시보드 삭제"""
    if not dashboard_ids:
        raise HTTPException(status_code=400, detail="삭제할 대시보드를 선택해주세요")
    
    success = service.delete_dashboards(dashboard_ids)
    if not success:
        raise HTTPException(status_code=400, detail="대시보드 삭제에 실패했습니다")
    
    return {"message": "대시보드가 성공적으로 삭제되었습니다"}