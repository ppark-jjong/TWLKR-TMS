# app/api/dashboard_remark_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.schemas.dashboard_schema import RemarkResponse, RemarkCreate, RemarkUpdate
from app.schemas.common_schema import ApiResponse
from app.services.dashboard_remark_service import DashboardRemarkService
from app.repositories.dashboard_remark_repository import DashboardRemarkRepository
from app.repositories.dashboard_lock_repository import DashboardLockRepository
from app.repositories.dashboard_repository import DashboardRepository
from app.config.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_info, log_error
from app.utils.api_decorators import error_handler
from app.utils.lock_manager import LockManager

router = APIRouter()


def get_remark_service(db: Session = Depends(get_db)) -> DashboardRemarkService:
    """DashboardRemarkService 의존성 주입"""
    remark_repository = DashboardRemarkRepository(db)
    lock_repository = DashboardLockRepository(db)
    dashboard_repository = DashboardRepository(db)
    lock_manager = LockManager(lock_repository)

    return DashboardRemarkService(
        remark_repository, lock_repository, dashboard_repository, lock_manager, db
    )


@router.post("/{dashboard_id}/remarks", response_model=ApiResponse)
@error_handler("메모 생성")
async def create_remark(
    dashboard_id: int,
    remark: RemarkCreate,
    service: DashboardRemarkService = Depends(get_remark_service),
    current_user: TokenData = Depends(get_current_user),
):
    """메모 생성 API (비관적 락 적용)"""
    log_info(f"메모 생성 요청: 대시보드 ID {dashboard_id}")
    result = service.create_remark(dashboard_id, remark, current_user.user_id)
    return result


@router.patch("/{dashboard_id}/remarks/{remark_id}", response_model=ApiResponse)
@error_handler("메모 업데이트")
async def update_remark(
    dashboard_id: int,
    remark_id: int,
    remark_update: RemarkUpdate,
    service: DashboardRemarkService = Depends(get_remark_service),
    current_user: TokenData = Depends(get_current_user),
):
    """메모 업데이트 API (비관적 락 적용)"""
    log_info(f"메모 업데이트 요청: 메모 ID {remark_id}")
    result = service.update_remark(remark_id, remark_update, current_user.user_id)
    return result


@router.delete("/{dashboard_id}/remarks/{remark_id}", response_model=ApiResponse)
@error_handler("메모 삭제")
async def delete_remark(
    dashboard_id: int,
    remark_id: int,
    service: DashboardRemarkService = Depends(get_remark_service),
    current_user: TokenData = Depends(get_current_user),
):
    """메모 삭제 API (비관적 락 적용)"""
    log_info(f"메모 삭제 요청: 메모 ID {remark_id}")
    is_admin = current_user.role == "ADMIN"
    result = service.delete_remark(remark_id, current_user.user_id, is_admin)

    return ApiResponse(
        success=True,
        message="메모가 삭제되었습니다",
        data={"remark_id": remark_id, "deleted": result}
    )