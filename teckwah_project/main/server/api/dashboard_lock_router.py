# teckwah_project/main/server/api/dashboard_lock_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from main.server.schemas.dashboard_schema import LockResponse, LockRequest
from main.server.repositories.dashboard_repository import DashboardRepository
from main.server.config.database import get_db
from main.server.api.deps import get_current_user
from main.server.schemas.auth_schema import TokenData
from main.server.utils.logger import log_info, log_error
from main.server.utils.api_decorators import error_handler
from main.server.utils.lock_manager import LockManager

router = APIRouter()


def get_repository_and_manager(db: Session = Depends(get_db)):
    """레포지토리 및 락 매니저 의존성 주입"""
    repository = DashboardRepository(db)
    lock_manager = LockManager(repository)
    return repository, lock_manager


@router.post("/{dashboard_id}/lock", response_model=LockResponse)
@error_handler("대시보드 락 획득")
async def acquire_dashboard_lock(
    dashboard_id: int,
    lock_data: LockRequest,
    deps: tuple = Depends(get_repository_and_manager),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 락 획득 API"""
    repository, _ = deps
    log_info(
        f"락 획득 요청: dashboard_id={dashboard_id}, user_id={current_user.user_id}, type={lock_data.lock_type}"
    )

    try:
        lock = repository.acquire_lock(
            dashboard_id, current_user.user_id, lock_data.lock_type
        )
        return LockResponse(
            success=True,
            message="락이 획득되었습니다",
            data={
                "dashboard_id": dashboard_id,
                "locked_by": current_user.user_id,
                "lock_type": lock_data.lock_type,
            },
        )
    except Exception as e:
        log_error(e, "락 획득 실패")
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail={
                "success": False,
                "message": "현재 다른 사용자가 작업 중입니다",
                "error_code": "RESOURCE_LOCKED",
            },
        )


@router.delete("/{dashboard_id}/lock", response_model=LockResponse)
@error_handler("대시보드 락 해제")
async def release_dashboard_lock(
    dashboard_id: int,
    deps: tuple = Depends(get_repository_and_manager),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 락 해제 API"""
    repository, _ = deps
    log_info(
        f"락 해제 요청: dashboard_id={dashboard_id}, user_id={current_user.user_id}"
    )
    result = repository.release_lock(dashboard_id, current_user.user_id)

    return LockResponse(
        success=result,
        message="락이 해제되었습니다" if result else "락 해제에 실패했습니다",
        data={"dashboard_id": dashboard_id},
    )


@router.get("/{dashboard_id}/lock/status", response_model=LockResponse)
@error_handler("대시보드 락 상태 확인")
async def check_dashboard_lock(
    dashboard_id: int,
    deps: tuple = Depends(get_repository_and_manager),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 락 상태 확인 API"""
    repository, lock_manager = deps
    log_info(f"락 상태 확인 요청: dashboard_id={dashboard_id}")
    lock_status = lock_manager.get_lock_status(dashboard_id)

    if not lock_status.get("is_locked", False):
        return LockResponse(
            success=True,
            message="락이 없습니다",
            data={"dashboard_id": dashboard_id, "is_locked": False},
        )

    return LockResponse(
        success=True,
        message="락 정보를 조회했습니다",
        data=lock_status,
    )
