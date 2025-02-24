# backend/app/api/dashboard_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardResponse,
    DashboardDetail,
    DashboardListData,
    StatusUpdate,
    RemarkUpdate,
    DriverAssignment,
    DashboardResponse,
)
from app.schemas.common_schema import BaseResponse, DateRangeInfo
from app.services.dashboard_service import DashboardService
from app.config.database import get_db
from app.api.deps import get_current_user, check_admin_access
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_info, log_error
from app.repositories.dashboard_repository import DashboardRepository

router = APIRouter()


def get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    repository = DashboardRepository(db)
    return DashboardService(repository)


@router.get("/list", response_model=DashboardResponse)
async def get_dashboard_list(
    date: str,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 목록 조회 API"""
    try:
        log_info(f"대시보드 목록 조회 요청: {date}")
        items = service.get_dashboard_list_by_date(date)
        oldest_date, latest_date = service.get_date_range()

        response_data = DashboardListData(
            date_range=DateRangeInfo(
                oldest_date=oldest_date.strftime("%Y-%m-%d"),
                latest_date=latest_date.strftime("%Y-%m-%d"),
            ),
            items=items,
        )

        return DashboardResponse(
            success=True,
            message=(
                "조회된 데이터가 없습니다" if not items else "데이터를 조회했습니다"
            ),
            data=response_data,
        )
    except Exception as e:
        log_error(e, "대시보드 목록 조회 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터 조회 중 오류가 발생했습니다",
        )


@router.get("/admin/list", response_model=DashboardResponse)
async def get_admin_dashboard_list(
    start_date: str,
    end_date: str,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(check_admin_access),
):
    """관리자 대시보드 목록 조회 API"""
    try:
        log_info(f"관리자 대시보드 목록 조회 요청: {start_date} ~ {end_date}")
        items = service.get_dashboard_list_by_date_range(start_date, end_date)
        oldest_date, latest_date = service.get_date_range()

        response_data = DashboardListData(
            date_range=DateRangeInfo(
                oldest_date=oldest_date.strftime("%Y-%m-%d"),
                latest_date=latest_date.strftime("%Y-%m-%d"),
            ),
            items=items,
        )

        return DashboardResponse(
            success=True,
            message=(
                "조회된 데이터가 없습니다" if not items else "데이터를 조회했습니다"
            ),
            data=response_data,
        )
    except Exception as e:
        log_error(e, "관리자 대시보드 목록 조회 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터 조회 중 오류가 발생했습니다",
        )


@router.post("", response_model=DashboardResponse)
async def create_dashboard(
    dashboard: DashboardCreate,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 생성 API"""
    try:
        result = service.create_dashboard(dashboard, current_user.department)
        return DashboardResponse(
            success=True, message="대시보드가 생성되었습니다", data=result
        )
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, "대시보드 생성 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 생성 중 오류가 발생했습니다",
        )


@router.patch("/{dashboard_id}/status", response_model=DashboardResponse)
async def update_status(
    dashboard_id: int,
    status_update: StatusUpdate,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """상태 업데이트 API"""
    try:
        result = service.update_status(dashboard_id, status_update)
        return DashboardResponse(
            success=True,
            message=f"{status_update.status} 상태로 변경되었습니다",
            data=result,
        )
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, "상태 업데이트 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="상태 업데이트 중 오류가 발생했습니다",
        )


@router.post("/assign", response_model=BaseResponse[List[DashboardResponse]])
async def assign_driver(
    assignment: DriverAssignment,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """배차 정보 업데이트 API"""
    try:
        result = service.assign_driver(assignment)
        return BaseResponse(success=True, message="배차가 완료되었습니다", data=result)
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, "배차 처리 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="배차 처리 중 오류가 발생했습니다",
        )
