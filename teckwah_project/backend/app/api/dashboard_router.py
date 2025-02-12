# backend/app/api/dashboard_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session

from app.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardResponse,
    DashboardDetail,
    StatusUpdate,
    RemarkUpdate,
    DriverAssignment,
    DashboardQuery,
)
from app.services.dashboard_service import DashboardService
from app.config.database import get_db
from app.api.deps import get_current_user_department

router = APIRouter()


@router.post("/", response_model=DashboardResponse)
async def create_dashboard(
    data: DashboardCreate,
    db: Session = Depends(get_db),
    user_department: str = Depends(get_current_user_department),
):
    """대시보드 생성 API"""
    service = DashboardService(db)
    return service.create_dashboard(data, user_department)


@router.get("/list", response_model=List[DashboardResponse])
async def get_dashboard_list(
    query: DashboardQuery,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user_department),
):
    """대시보드 목록 조회 API"""
    service = DashboardService(db)
    return service.get_dashboard_list(query.date)


@router.get("/{dashboard_id}", response_model=DashboardDetail)
async def get_dashboard_detail(
    dashboard_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user_department),
):
    """대시보드 상세 조회 API"""
    service = DashboardService(db)
    return service.get_dashboard_detail(dashboard_id)


@router.patch("/{dashboard_id}/status", response_model=DashboardDetail)
async def update_status(
    dashboard_id: int,
    status_update: StatusUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user_department),
):
    """상태 업데이트 API"""
    service = DashboardService(db)
    return service.update_status(dashboard_id, status_update)


@router.patch("/{dashboard_id}/remark", response_model=DashboardDetail)
async def update_remark(
    dashboard_id: int,
    remark_update: RemarkUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user_department),
):
    """메모 업데이트 API"""
    service = DashboardService(db)
    return service.update_remark(dashboard_id, remark_update)


@router.post("/assign", response_model=List[DashboardResponse])
async def assign_driver(
    assignment: DriverAssignment,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user_department),
):
    """배차 정보 업데이트 API"""
    service = DashboardService(db)
    return service.assign_driver(assignment)


@router.delete("/")
async def delete_dashboards(
    dashboard_ids: List[int],
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user_department),
):
    """대시보드 삭제 API"""
    service = DashboardService(db)
    success = service.delete_dashboards(dashboard_ids)
    return {"success": success, "message": "삭제가 완료되었습니다"}
