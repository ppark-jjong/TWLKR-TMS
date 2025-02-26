# backend/app/api/dashboard_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, datetime

from app.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardResponse,
    DashboardDetail,
    DashboardListData,
    StatusUpdate,
    RemarkUpdate,
    DriverAssignment,
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


@router.get("/list")
async def get_dashboard_list(
    date: str,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 목록 조회 API - ETA 기준 하루 단위"""
    try:
        log_info(f"대시보드 목록 조회 요청: {date}")
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            log_error(None, f"날짜 형식 오류: {date}")
            return DashboardListResponse(
                success=False,
                message="날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)",
                data=DashboardListData(
                    date_range=DateRangeInfo(
                        oldest_date=datetime.now().strftime("%Y-%m-%d"),
                        latest_date=datetime.now().strftime("%Y-%m-%d"),
                    ),
                    items=[],
                ),
            )

        # 대시보드 목록 조회 (ETA 기준)
        items = service.get_dashboard_list_by_date(target_date)

        oldest_date, latest_date = service.get_date_range()

        # 명시적으로 사전 형태로 응답 데이터 구성
        date_range_dict = {
            "oldest_date": oldest_date.strftime("%Y-%m-%d"),
            "latest_date": latest_date.strftime("%Y-%m-%d"),
        }

        # 아이템 목록을 사전 형태로 변환
        items_list = [item.dict() for item in items]

        response_data = {
            "items": items_list,
            "date_range": date_range_dict,
        }

        return {
            "success": True,
            "message": (
                "조회된 데이터가 없습니다" if not items else "데이터를 조회했습니다"
            ),
        )
    except Exception as e:
        log_error(e, "대시보드 목록 조회 실패")
        return DashboardListResponse(
            success=False,
            message="데이터 조회 중 오류가 발생했습니다",
            data=DashboardListData(
                date_range=DateRangeInfo(
                    oldest_date=datetime.now().strftime("%Y-%m-%d"),
                    latest_date=datetime.now().strftime("%Y-%m-%d"),
                ),
                items=[],
            ),
        )


@router.get("/admin/list")
async def get_admin_dashboard_list(
    start_date: str,
    end_date: str,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(check_admin_access),
):
    """관리자 대시보드 목록 조회 API"""
    try:
        log_info(f"관리자 대시보드 목록 조회 요청: {start_date} ~ {end_date}")
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            log_error(None, f"날짜 형식 오류: {start_date}, {end_date}")
            return AdminDashboardListResponse(
                success=False,
                message="날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)",
                data=DashboardListData(
                    date_range=DateRangeInfo(
                        oldest_date=datetime.now().strftime("%Y-%m-%d"),
                        latest_date=datetime.now().strftime("%Y-%m-%d"),
                    ),
                    items=[],
                ),
            )

        items = service.get_dashboard_list_by_date_range(start, end)
        oldest_date, latest_date = service.get_date_range()

        # 명시적으로 사전 형태로 응답 데이터 구성
        date_range_dict = {
            "oldest_date": oldest_date.strftime("%Y-%m-%d"),
            "latest_date": latest_date.strftime("%Y-%m-%d"),
        }

        # 아이템 목록을 사전 형태로 변환
        items_list = [item.dict() for item in items]

        return AdminDashboardListResponse(
            success=True, message=message, data=response_data
        )
    except Exception as e:
        log_error(e, "관리자 대시보드 목록 조회 실패")
        return AdminDashboardListResponse(
            success=False,
            message="데이터 조회 중 오류가 발생했습니다",
            data=DashboardListData(
                date_range=DateRangeInfo(
                    oldest_date=datetime.now().strftime("%Y-%m-%d"),
                    latest_date=datetime.now().strftime("%Y-%m-%d"),
                ),
                items=[],
            ),
        )


@router.post("")
async def create_dashboard(
    dashboard: DashboardCreate,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 생성 API"""
    try:
        result = service.create_dashboard(dashboard, current_user.department)
        return {
            "success": True,
            "message": "대시보드가 생성되었습니다",
            "data": result.dict(),
        }
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, "대시보드 생성 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 생성 중 오류가 발생했습니다",
        )


@router.patch("/{dashboard_id}/status")
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
            status_update,
            is_admin=(current_user.role == "ADMIN" or status_update.is_admin),
        )

        return DashboardDetailResponse(
            success=True,
            message=f"{status_update.status} 상태로 변경되었습니다",
            data=result,
        )
    except Exception as e:
        log_error(e, "상태 업데이트 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="상태 업데이트 중 오류가 발생했습니다",
        )


@router.post("/assign")
async def assign_driver(
    assignment: DriverAssignment,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """배차 정보 업데이트 API"""
    try:
        result = service.assign_driver(assignment)
        return {
            "success": True,
            "message": "배차가 완료되었습니다",
            "data": [item.dict() for item in result],
        }
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, "배차 처리 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="배차 처리 중 오류가 발생했습니다",
        )


@router.patch("/{dashboard_id}/remark")
async def update_remark(
    dashboard_id: int,
    remark_update: RemarkUpdate,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """메모 업데이트 API"""
    try:
        result = service.update_remark(dashboard_id, remark_update.remark)
        return {
            "success": True,
            "message": "메모가 업데이트되었습니다",
            "data": result.dict(),
        }
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, "메모 업데이트 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="메모 업데이트 중 오류가 발생했습니다",
        )
