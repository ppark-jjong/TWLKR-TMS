# teckwah_project/main/server/api/dashboard_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime

from main.server.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardResponse,
    DashboardDetail,
    DashboardListResponse,
    StatusUpdate,
    DriverAssignment,
    AdminDashboardListResponse,
    DashboardDetailResponse,
    FieldsUpdate,
)
from main.server.schemas.common_schema import BaseResponse, DateRangeInfo
from main.server.services.dashboard_service import DashboardService
from main.server.config.database import get_db
from main.server.api.deps import get_current_user, check_admin_access
from main.server.schemas.auth_schema import TokenData
from main.server.utils.logger import log_info, log_error
from main.server.repositories.dashboard_repository import DashboardRepository
from main.server.repositories.dashboard_remark_repository import DashboardRemarkRepository
from main.server.repositories.dashboard_lock_repository import DashboardLockRepository
from main.server.utils.datetime_helper import get_date_range
from main.server.utils.api_decorators import error_handler
from main.server.utils.lock_manager import LockManager

router = APIRouter()


def get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    """DashboardService 의존성 주입"""
    repository = DashboardRepository(db)
    remark_repository = DashboardRemarkRepository(db)
    lock_repository = DashboardLockRepository(db)
    lock_manager = LockManager(lock_repository)

    return DashboardService(
        repository, remark_repository, lock_repository, lock_manager
    )


@router.post("/list", response_model=DashboardListResponse)
@error_handler("대시보드 목록 조회")
async def get_dashboard_list(
    date_range: Dict[str, str] = Body(...),
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 목록 조회 API - ETA 기준 하루 단위 또는 날짜 범위"""
    # 날짜 범위로 조회하는 경우
    start_date = date_range.get("start_date")
    end_date = date_range.get("end_date")
    
    if start_date and end_date:
        log_info(f"대시보드 목록 조회 요청 (범위): {start_date} ~ {end_date}")
        try:
            start_date_obj, _ = get_date_range(start_date)
            _, end_date_obj = get_date_range(end_date)
        except ValueError:
            log_error(None, f"날짜 형식 오류: {start_date}, {end_date}")
            raise Exception("날짜 형식이 올바르지 않습니다")
    else:
        # 날짜 정보가 없는 경우 현재 날짜 사용
        log_info("날짜 정보 없음, 현재 날짜 사용")
        today = datetime.now()
        date_str = today.strftime("%Y-%m-%d")
        start_date_obj, end_date_obj = get_date_range(date_str)

    # 대시보드 목록 조회 (ETA 기준) - 모든 사용자에게 동일한 데이터 제공
    items = service.get_dashboard_list_by_date(start_date_obj, end_date_obj)
    oldest_date, latest_date = service.get_date_range()

    # 응답 데이터 구성
    message_text = "조회된 데이터가 없습니다" if not items else "데이터를 조회했습니다"

    # 사용자의 권한 정보 추가
    is_admin = current_user.role == "ADMIN"

    return DashboardListResponse(
        success=True,
        message=message_text,
        data={
            "date_range": {
                "oldest_date": oldest_date.strftime("%Y-%m-%d"),
                "latest_date": latest_date.strftime("%Y-%m-%d"),
            },
            "items": items,
            "user_role": current_user.role,
            "is_admin": is_admin,
        },
    )


@router.post("", response_model=DashboardDetailResponse)
@error_handler("대시보드 생성")
async def create_dashboard(
    dashboard: DashboardCreate,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 생성 API (메모 포함)"""
    log_info(f"대시보드 생성 요청: {dashboard.model_dump()}")

    # user_id를 전달하여 메모 작성자 정보 기록
    result = service.create_dashboard(
        dashboard, current_user.department, user_id=current_user.user_id
    )

    return DashboardDetailResponse(
        success=True,
        message="대시보드가 생성되었습니다",
        data=result,
    )


@router.get("/{dashboard_id}", response_model=DashboardDetailResponse)
@error_handler("대시보드 상세 정보 조회")
async def get_dashboard_detail(
    dashboard_id: int,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 상세 정보 조회 API (락 상태 포함)"""
    log_info(f"대시보드 상세 정보 조회 요청: {dashboard_id}")

    # 락 정보 포함하여 상세 정보 조회
    result = service.get_dashboard_with_status_check(dashboard_id)

    # 응답 구성
    is_locked = getattr(result, "is_locked", False)
    lock_info = None

    if is_locked:
        lock_info = {
            "locked_by": getattr(result, "locked_by", "Unknown"),
            "lock_type": getattr(result, "lock_type", "Unknown"),
            "expires_at": getattr(result, "lock_expires_at", None),
        }

    return DashboardDetailResponse(
        success=True,
        message="상세 정보를 조회했습니다",
        data=result,
        lock_info=lock_info,
        is_locked=is_locked,
    )


@router.patch("/{dashboard_id}/fields", response_model=DashboardDetailResponse)
@error_handler("대시보드 필드 업데이트")
async def update_fields(
    dashboard_id: int,
    fields_update: FieldsUpdate,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """필드 업데이트 API (비관적 락 적용)"""
    log_info(f"필드 업데이트 요청: {dashboard_id}")
    result = service.update_dashboard_fields(
        dashboard_id, fields_update, current_user.user_id
    )

    return DashboardDetailResponse(
        success=True, message="필드가 업데이트되었습니다", data=result
    )


@router.patch("/{dashboard_id}/status", response_model=DashboardDetailResponse)
@error_handler("대시보드 상태 업데이트")
async def update_status(
    dashboard_id: int,
    status_update: StatusUpdate,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """상태 업데이트 API (비관적 락 적용)"""
    log_info(f"상태 업데이트 요청: {dashboard_id} -> {status_update.status}")

    result = service.update_status(
        dashboard_id,
        status_update.status,
        current_user.user_id,
        is_admin=(current_user.role == "ADMIN" or status_update.is_admin),
    )

    return DashboardDetailResponse(
        success=True,
        message=f"{status_update.status} 상태로 변경되었습니다",
        data=result,
    )


@router.post("/assign", response_model=BaseResponse)
@error_handler("배차 처리")
async def assign_driver(
    assignment: DriverAssignment,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """배차 처리 API (비관적 락 적용)"""
    log_info(f"배차 처리 요청: {assignment.model_dump()}")

    result = service.assign_driver(assignment, current_user.user_id)

    return BaseResponse(
        success=True,
        message="배차가 완료되었습니다",
        data={"updated_dashboards": [item.model_dump() for item in result]},
    )


@router.delete("", response_model=BaseResponse)
@error_handler("대시보드 삭제")
async def delete_dashboards(
    dashboard_ids: List[int] = Body(..., embed=True),
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(check_admin_access),
):
    """대시보드 삭제 API - 관리자 전용"""
    log_info(f"대시보드 삭제 요청: {dashboard_ids}")
    deleted_count = service.delete_dashboards(dashboard_ids)

    return BaseResponse(
        success=True,
        message="선택한 항목이 삭제되었습니다",
        data={"deleted_count": deleted_count},
    )


@router.get("/search", response_model=DashboardListResponse)
@error_handler("주문번호로 대시보드 검색")
async def search_dashboards_by_order_no(
    order_no: str = Query(..., description="검색할 주문번호"),
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """주문번호로 대시보드 검색 API"""
    log_info(f"주문번호 검색 요청: {order_no}")

    # 주문번호로 대시보드 검색
    items = service.search_dashboards_by_order_no(order_no)

    # 날짜 범위 정보 조회 (조회 가능 기간 표시용)
    oldest_date, latest_date = service.get_date_range()

    # 응답 데이터 구성
    message_text = "조회된 데이터가 없습니다" if not items else "데이터를 조회했습니다"

    # 사용자의 권한 정보 추가
    is_admin = current_user.role == "ADMIN"

    return DashboardListResponse(
        success=True,
        message=message_text,
        data={
            "date_range": {
                "oldest_date": oldest_date.strftime("%Y-%m-%d"),
                "latest_date": latest_date.strftime("%Y-%m-%d"),
            },
            "items": items,
            "user_role": current_user.role,
            "is_admin": is_admin,
        },
    )