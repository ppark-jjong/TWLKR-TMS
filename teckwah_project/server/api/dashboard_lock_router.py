# teckwah_project/main/server/api/dashboard_lock_router.py
from fastapi import APIRouter, Depends, Response, status, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from server.config.database import get_db
from server.api.deps import get_current_user
from server.schemas.auth_schema import TokenData
from server.schemas.dashboard_schema import LockRequest
from server.schemas.common_schema import ApiResponse, MetaBuilder
from server.utils.error import (
    error_handler,
    NotFoundException,
    LockConflictException,
)
from server.utils.datetime import get_kst_now
from server.models.dashboard_lock_model import DashboardLock
from server.models.dashboard_model import Dashboard
from server.services.dashboard_lock_service import DashboardLockService
from server.api.deps import get_dashboard_lock_service

router = APIRouter(prefix="/dashboard-lock", tags=["대시보드 락"])


@router.post("/{dashboard_id}/lock", response_model=ApiResponse[Dict[str, Any]])
@error_handler("대시보드 락")
async def lock_dashboard(
    dashboard_id: int,
    lock_data: LockRequest,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
    dashboard_lock_service: DashboardLockService = Depends(get_dashboard_lock_service),
):
    """대시보드 락 획득 API

    lock_type: EDIT, STATUS, ASSIGN
    """
    # 락 타입 유효성 검사
    if lock_data.lock_type not in ["EDIT", "STATUS", "ASSIGN"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원하지 않는 락 타입입니다: {lock_data.lock_type}",
        )

    # 락 획득 시도
    lock_result = dashboard_lock_service.acquire_lock(
        dashboard_id=dashboard_id,
        lock_type=lock_data.lock_type,
        user_id=current_user.user_id,
    )

    return ApiResponse[Dict[str, Any]](
        success=lock_result["success"],
        message=lock_result["message"],
        data=lock_result.get("data"),
    )


@router.delete("/{dashboard_id}/lock", response_model=ApiResponse[Dict[str, Any]])
@error_handler("대시보드 락 해제")
async def release_dashboard_lock(
    dashboard_id: int,
    lock_type: str = Query(..., description="락 타입 (EDIT, STATUS, ASSIGN)"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
    dashboard_lock_service: DashboardLockService = Depends(get_dashboard_lock_service),
):
    """대시보드 락 해제 API

    lock_type: EDIT, STATUS, ASSIGN
    """
    # 락 타입 유효성 검사
    if lock_type not in ["EDIT", "STATUS", "ASSIGN"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원하지 않는 락 타입입니다: {lock_type}",
        )

    # 락 해제 시도
    release_result = dashboard_lock_service.release_lock(
        dashboard_id=dashboard_id,
        lock_type=lock_type,
        user_id=current_user.user_id,
    )

    return ApiResponse[Dict[str, Any]](
        success=release_result["success"],
        message=release_result["message"],
        data=release_result.get("data"),
    )


@router.get("/{dashboard_id}/lock", response_model=ApiResponse[Dict[str, Any]])
@error_handler("대시보드 락 정보")
async def get_dashboard_lock(
    dashboard_id: int,
    lock_type: str = Query(..., description="락 타입 (EDIT, STATUS, ASSIGN)"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
    dashboard_lock_service: DashboardLockService = Depends(get_dashboard_lock_service),
):
    """대시보드 락 상태 조회 API

    lock_type: EDIT, STATUS, ASSIGN
    """
    # 락 타입 유효성 검사
    if lock_type not in ["EDIT", "STATUS", "ASSIGN"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원하지 않는 락 타입입니다: {lock_type}",
        )

    # 락 상태 조회
    lock_info = dashboard_lock_service.get_lock_info(
        dashboard_id=dashboard_id,
        lock_type=lock_type,
    )

    return ApiResponse[Dict[str, Any]](
        success=True,
        message="락 정보를 조회했습니다",
        data=lock_info,
    )