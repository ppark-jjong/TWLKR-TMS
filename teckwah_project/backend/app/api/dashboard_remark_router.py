# app/api/dashboard_remark_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.schemas.dashboard_schema import RemarkResponse, RemarkCreate, RemarkUpdate
from app.services.dashboard_remark_service import DashboardRemarkService
from app.repositories.dashboard_remark_repository import DashboardRemarkRepository
from app.repositories.dashboard_lock_repository import DashboardLockRepository
from app.repositories.dashboard_repository import DashboardRepository
from app.config.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_info, log_error
from app.utils.exceptions import PessimisticLockException

router = APIRouter()


def get_remark_service(db: Session = Depends(get_db)) -> DashboardRemarkService:
    """DashboardRemarkService 의존성 주입"""
    remark_repository = DashboardRemarkRepository(db)
    lock_repository = DashboardLockRepository(db)
    dashboard_repository = DashboardRepository(db)
    return DashboardRemarkService(remark_repository, lock_repository, dashboard_repository)


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
    dashboard_version: Optional[int] = Query(None, description="대시보드 버전 (호환성 유지용)"),
    service: DashboardRemarkService = Depends(get_remark_service),
    current_user: TokenData = Depends(get_current_user),
):
    """메모 생성 API (비관적 락 적용)"""
    try:
        log_info(f"메모 생성 요청: 대시보드 ID {dashboard_id}")
        result = service.create_remark(dashboard_id, remark, current_user.user_id)
        return result
    except HTTPException as e:
        # 락 충돌 시 예외 처리
        if e.status_code == status.HTTP_423_LOCKED:
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail={
                    "message": str(e.detail),
                    "locked_by": getattr(e, "locked_by", None)
                }
            )
        raise
    except Exception as e:
        log_error(e, "메모 생성 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="메모 생성 중 오류가 발생했습니다",
        )

@router.patch("/{dashboard_id}/remarks/{remark_id}", response_model=RemarkResponse)
async def update_remark(
    dashboard_id: int,
    remark_id: int,
    remark_update: RemarkUpdate,
    dashboard_version: Optional[int] = Query(None, description="대시보드 버전 (호환성 유지용)"),
    service: DashboardRemarkService = Depends(get_remark_service),
    current_user: TokenData = Depends(get_current_user),
):
    """메모 업데이트 API (비관적 락 적용)"""
    try:
        log_info(f"메모 업데이트 요청: 메모 ID {remark_id}")
        result = service.update_remark(remark_id, remark_update, current_user.user_id)
        return result
    except HTTPException as e:
        # 락 충돌 시 예외 처리
        if e.status_code == status.HTTP_423_LOCKED:
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail={
                    "message": str(e.detail),
                    "locked_by": getattr(e, "locked_by", None)
                }
            )
        raise
    except Exception as e:
        log_error(e, "메모 업데이트 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="메모 업데이트 중 오류가 발생했습니다",
        )

@router.delete("/{dashboard_id}/remarks/{remark_id}", response_model=dict)
async def delete_remark(
    dashboard_id: int,
    remark_id: int,
    service: DashboardRemarkService = Depends(get_remark_service),
    current_user: TokenData = Depends(get_current_user),
):
    """메모 삭제 API (비관적 락 적용)"""
    try:
        log_info(f"메모 삭제 요청: 메모 ID {remark_id}")
        is_admin = current_user.role == "ADMIN"
        result = service.delete_remark(remark_id, current_user.user_id, is_admin)
        
        if result:
            return {"success": True, "message": "메모가 삭제되었습니다"}
        else:
            return {"success": False, "message": "메모 삭제에 실패했습니다"}
            
    except HTTPException as e:
        # 락 충돌 시 예외 처리
        if e.status_code == status.HTTP_423_LOCKED:
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail={
                    "message": str(e.detail),
                    "locked_by": getattr(e, "locked_by", None)
                }
            )
        raise
    except Exception as e:
        log_error(e, "메모 삭제 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="메모 삭제 중 오류가 발생했습니다",
        )