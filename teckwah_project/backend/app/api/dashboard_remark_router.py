# app/api/dashboard_remark_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.dashboard_schema import RemarkResponse, RemarkCreate, RemarkUpdate
from app.services.dashboard_remark_service import DashboardRemarkService
from app.repositories.dashboard_remark_repository import DashboardRemarkRepository
from app.repositories.dashboard_lock_repository import DashboardLockRepository
from app.config.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_info, log_error

router = APIRouter()


def get_remark_service(db: Session = Depends(get_db)) -> DashboardRemarkService:
    """DashboardRemarkService 의존성 주입"""
    remark_repository = DashboardRemarkRepository(db)
    lock_repository = DashboardLockRepository(db)
    return DashboardRemarkService(remark_repository, lock_repository)


@router.get("/{dashboard_id}/remarks", response_model=List[RemarkResponse])
async def get_remarks(
    dashboard_id: int,
    service: DashboardRemarkService = Depends(get_remark_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 ID별 메모 목록 조회 API"""
    try:
        log_info(f"메모 목록 조회 요청: 대시보드 ID {dashboard_id}")
        remarks = service.get_remarks_by_dashboard_id(dashboard_id)
        return remarks
    except Exception as e:
        log_error(e, "메모 목록 조회 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="메모 목록 조회 중 오류가 발생했습니다",
        )


@router.post("/{dashboard_id}/remarks", response_model=RemarkResponse)
async def create_remark(
    dashboard_id: int,
    remark: RemarkCreate,
    service: DashboardRemarkService = Depends(get_remark_service),
    current_user: TokenData = Depends(get_current_user),
):
    """메모 생성 API (비관적 락 적용)"""
    try:
        log_info(f"메모 생성 요청: 대시보드 ID {dashboard_id}")
        result = service.create_remark(dashboard_id, remark, current_user.user_id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, "메모 생성 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="메모 생성 중 오류가 발생했습니다",
        )


@router.put("/remarks/{remark_id}", response_model=RemarkResponse)
async def update_remark(
    remark_id: int,
    remark_update: RemarkUpdate,
    service: DashboardRemarkService = Depends(get_remark_service),
    current_user: TokenData = Depends(get_current_user),
):
    """메모 업데이트 API (비관적 락 + 낙관적 락 적용)"""
    try:
        log_info(f"메모 업데이트 요청: 메모 ID {remark_id}")
        result = service.update_remark(remark_id, remark_update, current_user.user_id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, "메모 업데이트 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="메모 업데이트 중 오류가 발생했습니다",
        )
