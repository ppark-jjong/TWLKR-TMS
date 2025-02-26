# backend/app/api/dashboard_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardResponse,
    DashboardDetail,
    DashboardListResponse,
    StatusUpdate,
    RemarkUpdate,
    DriverAssignment,
    AdminDashboardListResponse,
    DashboardDetailResponse,
)
from app.schemas.common_schema import BaseResponse, DateRangeInfo
from app.services.dashboard_service import DashboardService
from app.config.database import get_db
from app.api.deps import get_current_user, check_admin_access
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_info, log_error
from app.repositories.dashboard_repository import DashboardRepository
from app.utils.datetime_helper import get_date_range

router = APIRouter()


def get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    repository = DashboardRepository(db)
    return DashboardService(repository)


@router.get("/list", response_model=DashboardListResponse)
async def get_dashboard_list(
    date: str,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 목록 조회 API - ETA 기준 하루 단위"""
    try:
        log_info(f"대시보드 목록 조회 요청: {date}")
        try:
            start_date, end_date = get_date_range(date)
        except ValueError:
            log_error(None, f"날짜 형식 오류: {date}")
            return DashboardListResponse(
                success=False,
                message="날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)",
                data={
                    "date_range": {
                        "oldest_date": datetime.now().strftime("%Y-%m-%d"),
                        "latest_date": datetime.now().strftime("%Y-%m-%d"),
                    },
                    "items": [],
                },
            )

        # 대시보드 목록 조회 (ETA 기준)
        items = service.get_dashboard_list_by_date(start_date, end_date)
        oldest_date, latest_date = service.get_date_range()

        # 응답 데이터 구성
        message_text = (
            "조회된 데이터가 없습니다" if not items else "데이터를 조회했습니다"
        )

        return DashboardListResponse(
            success=True,
            message=message_text,
            data={
                "date_range": {
                    "oldest_date": oldest_date.strftime("%Y-%m-%d"),
                    "latest_date": latest_date.strftime("%Y-%m-%d"),
                },
                "items": items,
            },
        )
    except Exception as e:
        log_error(e, "대시보드 목록 조회 실패")
        return DashboardListResponse(
            success=False,
            message="데이터 조회 중 오류가 발생했습니다",
            data={
                "date_range": {
                    "oldest_date": datetime.now().strftime("%Y-%m-%d"),
                    "latest_date": datetime.now().strftime("%Y-%m-%d"),
                },
                "items": [],
            },
        )


@router.get("/admin/list", response_model=AdminDashboardListResponse)
async def get_admin_dashboard_list(
    date: str,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(check_admin_access),
):
    """관리자 대시보드 목록 조회 API - ETA 기준 하루 단위"""
    try:
        log_info(f"관리자 대시보드 목록 조회 요청: {date}")
        try:
            start_date, end_date = get_date_range(date)
        except ValueError:
            log_error(None, f"날짜 형식 오류: {date}")
            return AdminDashboardListResponse(
                success=False,
                message="날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)",
                data={
                    "date_range": {
                        "oldest_date": datetime.now().strftime("%Y-%m-%d"),
                        "latest_date": datetime.now().strftime("%Y-%m-%d"),
                    },
                    "items": [],
                },
            )

        # 관리자용 대시보드 목록 조회 (ETA 기준)
        items = service.get_dashboard_list_by_date(start_date, end_date, is_admin=True)
        oldest_date, latest_date = service.get_date_range()

        # 응답 데이터 구성
        message_text = (
            "조회된 데이터가 없습니다" if not items else "데이터를 조회했습니다"
        )

        return AdminDashboardListResponse(
            success=True,
            message=message_text,
            data={
                "date_range": {
                    "oldest_date": oldest_date.strftime("%Y-%m-%d"),
                    "latest_date": latest_date.strftime("%Y-%m-%d"),
                },
                "items": items,
            },
        )
    except Exception as e:
        log_error(e, "관리자 대시보드 목록 조회 실패")
        return AdminDashboardListResponse(
            success=False,
            message="데이터 조회 중 오류가 발생했습니다",
            data={
                "date_range": {
                    "oldest_date": datetime.now().strftime("%Y-%m-%d"),
                    "latest_date": datetime.now().strftime("%Y-%m-%d"),
                },
                "items": [],
            },
        )


@router.post("", response_model=DashboardDetailResponse)
async def create_dashboard(
    dashboard: DashboardCreate,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 생성 API"""
    try:
        log_info(f"대시보드 생성 요청: {dashboard.dict()}")
        result = service.create_dashboard(dashboard, current_user.department)
        return DashboardDetailResponse(
            success=True,
            message="대시보드가 생성되었습니다",
            data=result,
        )
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, "대시보드 생성 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 생성 중 오류가 발생했습니다",
        )


@router.get("/{dashboard_id}", response_model=DashboardDetailResponse)
async def get_dashboard_detail(
    dashboard_id: int,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 상세 정보 조회 API"""
    try:
        log_info(f"대시보드 상세 정보 조회 요청: {dashboard_id}")
        result = service.get_dashboard_detail(dashboard_id)
        return DashboardDetailResponse(
            success=True,
            message="상세 정보를 조회했습니다",
            data=result,
        )
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, "대시보드 상세 정보 조회 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="상세 정보 조회 중 오류가 발생했습니다",
        )


@router.patch("/{dashboard_id}/status", response_model=DashboardDetailResponse)
async def update_status(
    dashboard_id: int,
    status_update: StatusUpdate,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """상태 업데이트 API"""
    try:
        log_info(f"상태 업데이트 요청: {dashboard_id} -> {status_update.status}")
        result = service.update_status(
            dashboard_id,
            status_update.status,
            is_admin=(current_user.role == "ADMIN" or status_update.is_admin),
        )

        return DashboardDetailResponse(
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


@router.patch("/{dashboard_id}/remark", response_model=DashboardDetailResponse)
async def update_remark(
    dashboard_id: int,
    remark_update: RemarkUpdate,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """메모 업데이트 API"""
    try:
        log_info(f"메모 업데이트 요청: {dashboard_id}")
        result = service.update_remark(dashboard_id, remark_update.remark)
        return DashboardDetailResponse(
            success=True,
            message="메모가 업데이트되었습니다",
            data=result,
        )
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, "메모 업데이트 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="메모 업데이트 중 오류가 발생했습니다",
        )


@router.post("/assign", response_model=BaseResponse)
async def assign_driver(
    assignment: DriverAssignment,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """배차 처리 API"""
    try:
        log_info(f"배차 처리 요청: {assignment.dict()}")
        result = service.assign_driver(assignment)
        return BaseResponse(
            success=True,
            message="배차가 완료되었습니다",
            data={"updated_dashboards": [item.dict() for item in result]},
        )
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, "배차 처리 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="배차 처리 중 오류가 발생했습니다",
        )


@router.delete("", response_model=BaseResponse)
async def delete_dashboards(
    dashboard_ids: List[int],
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(check_admin_access),
):
    """대시보드 삭제 API - 관리자 전용"""
    try:
        log_info(f"대시보드 삭제 요청: {dashboard_ids}")
        result = service.delete_dashboards(dashboard_ids)
        return BaseResponse(
            success=True,
            message="선택한 항목이 삭제되었습니다",
            data={"deleted_count": len(dashboard_ids)},
        )
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, "대시보드 삭제 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="삭제 처리 중 오류가 발생했습니다",
        )
