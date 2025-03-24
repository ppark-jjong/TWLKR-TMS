# backend/app/api/dashboard_lock_router.py

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.schemas.dashboard_schema import LockResponse
from app.repositories.dashboard_lock_repository import DashboardLockRepository
from app.config.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_info
from app.utils.api_decorators import error_handler

router = APIRouter()


def get_lock_repository(db: Session = Depends(get_db)) -> DashboardLockRepository:
    """DashboardLockRepository 의존성 주입"""
    return DashboardLockRepository(db)


# 락 상태 확인 API만 유지 (다른 API들은 자동 락 관리를 위해 제거)
@router.get("/{dashboard_id}/lock/status", response_model=LockResponse)
@error_handler("대시보드 락 상태 확인")
async def check_dashboard_lock(
    dashboard_id: int,
    repository: DashboardLockRepository = Depends(get_lock_repository),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 락 상태 확인 API"""
    log_info(f"락 상태 확인 요청: dashboard_id={dashboard_id}")
    lock_info = repository.get_lock_info(dashboard_id)

    if not lock_info:
        return LockResponse(
            success=True,
            message="락이 없습니다",
            data={"dashboard_id": dashboard_id, "is_locked": False},
        )

    return LockResponse(
        success=True,
        message="락 정보를 조회했습니다",
        data={
            "dashboard_id": dashboard_id,
            "is_locked": True,
            "locked_by": lock_info.locked_by,
            "lock_type": lock_info.lock_type,
            "expires_at": lock_info.expires_at.isoformat(),
        },
    )