# teckwah_project/main/server/dashboard_remark_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from main.server.schemas.dashboard_schema import RemarkResponse, RemarkCreate, RemarkUpdate
from main.server.schemas.common_schema import ApiResponse
from main.server.services.dashboard_remark_service import DashboardRemarkService
from main.server.repositories.dashboard_remark_repository import DashboardRemarkRepository
from main.server.repositories.dashboard_lock_repository import DashboardLockRepository
from main.server.repositories.dashboard_repository import DashboardRepository
from main.server.config.database import get_db
from main.server.api.deps import get_current_user
from main.server.schemas.auth_schema import TokenData
from main.server.utils.logger import log_info, log_error
from main.server.utils.api_decorators import error_handler
from main.server.utils.lock_manager import LockManager

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

