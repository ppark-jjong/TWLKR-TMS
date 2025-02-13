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
)
from app.services.dashboard_service import DashboardService
from app.repositories.dashboard_repository import DashboardRepository
from app.config.database import get_db
from app.api.deps import get_current_user_department
from app.utils.logger import log_error

router = APIRouter()


@router.get("/list", response_model=List[DashboardResponse])
async def get_dashboard_list(
    date: str,
    db: Session = Depends(get_db),
    current_department: str = Depends(get_current_user_department),
):
    """대시보드 목록 조회 API"""
    try:
        repository = DashboardRepository(db)
        service = DashboardService(repository)
        return service.get_dashboard_list(date)
    except Exception as e:
        log_error(e, "대시보드 목록 조회 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 목록 조회 중 오류가 발생했습니다",
        )


@router.post("", response_model=DashboardResponse)
async def create_dashboard(
    dashboard: DashboardCreate,
    db: Session = Depends(get_db),
    current_department: str = Depends(get_current_user_department),
):
    """대시보드 생성 API"""
    try:
        repository = DashboardRepository(db)
        service = DashboardService(repository)
        return service.create_dashboard(dashboard, current_department)
    except Exception as e:
        log_error(e, "대시보드 생성 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 생성 중 오류가 발생했습니다",
        )


@router.get("/{dashboard_id}", response_model=DashboardDetail)
async def get_dashboard_detail(
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_department: str = Depends(get_current_user_department),
):
    """대시보드 상세 조회 API"""
    try:
        repository = DashboardRepository(db)
        service = DashboardService(repository)
        return service.get_dashboard_detail(dashboard_id)
    except Exception as e:
        log_error(e, "대시보드 상세 조회 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 상세 조회 중 오류가 발생했습니다",
        )


@router.patch("/{dashboard_id}/status", response_model=DashboardDetail)
async def update_status(
    dashboard_id: int,
    status_update: StatusUpdate,
    db: Session = Depends(get_db),
    current_department: str = Depends(get_current_user_department),
):
    """상태 업데이트 API"""
    try:
        repository = DashboardRepository(db)
        service = DashboardService(repository)
        return service.update_status(dashboard_id, status_update)
    except Exception as e:
        log_error(e, "상태 업데이트 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="상태 업데이트 중 오류가 발생했습니다",
        )


@router.patch("/{dashboard_id}/remark", response_model=DashboardDetail)
async def update_remark(
    dashboard_id: int,
    remark_update: RemarkUpdate,
    db: Session = Depends(get_db),
    current_department: str = Depends(get_current_user_department),
):
    """메모 업데이트 API"""
    try:
        repository = DashboardRepository(db)
        service = DashboardService(repository)
        return service.update_remark(dashboard_id, remark_update)
    except Exception as e:
        log_error(e, "메모 업데이트 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="메모 업데이트 중 오류가 발생했습니다",
        )


@router.post("/assign", response_model=List[DashboardResponse])
async def assign_driver(
    assignment: DriverAssignment,
    db: Session = Depends(get_db),
    current_department: str = Depends(get_current_user_department),
):
    """배차 정보 업데이트 API"""
    try:
        repository = DashboardRepository(db)
        service = DashboardService(repository)
        return service.assign_driver(assignment)
    except Exception as e:
        log_error(e, "배차 정보 업데이트 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="배차 정보 업데이트 중 오류가 발생했습니다",
        )


@router.delete("")
async def delete_dashboards(
    dashboard_ids: List[int],
    db: Session = Depends(get_db),
    current_department: str = Depends(get_current_user_department),
):
    """대시보드 삭제 API"""
    try:
        repository = DashboardRepository(db)
        service = DashboardService(repository)
        success = service.delete_dashboards(dashboard_ids)
        return {"success": success, "message": "선택한 항목이 삭제되었습니다"}
    except Exception as e:
        log_error(e, "대시보드 삭제 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 삭제 중 오류가 발생했습니다",
        )
