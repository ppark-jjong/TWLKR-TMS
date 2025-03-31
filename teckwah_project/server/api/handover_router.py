from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from ..services.handover_service import HandoverService
from ..schemas.handover_schema import (
    HandoverCreate, 
    HandoverUpdate, 
    HandoverResponse, 
    HandoverListResponse, 
    HandoverLockRequest,
    HandoverLockResponse,
    HandoverApiResponse
)
from .deps import get_db, get_current_user, get_user_is_admin

router = APIRouter(
    prefix="/api/handover",
    tags=["handover"]
)


@router.post("", response_model=HandoverApiResponse)
def create_handover(
    data: HandoverCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    새 인수인계 레코드 생성
    """
    service = HandoverService(db)
    handover = service.create_handover(data, current_user)
    
    return {
        "success": True,
        "data": handover
    }


@router.get("/{handover_id}", response_model=HandoverApiResponse)
def get_handover(
    handover_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    인수인계 레코드 상세 조회
    """
    service = HandoverService(db)
    handover = service.get_handover(handover_id, current_user)
    
    if not handover:
        return {
            "success": False,
            "error_code": "NOT_FOUND",
            "message": "인수인계 항목을 찾을 수 없습니다."
        }
    
    return {
        "success": True,
        "data": handover
    }


@router.get("", response_model=HandoverApiResponse)
def get_handovers(
    start_date: Optional[str] = Query(None, description="조회 시작일 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="조회 종료일 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    인수인계 목록 조회 (날짜별 그룹화)
    """
    # 기본값: 최근 7일
    now = datetime.now()
    
    if start_date:
        start_date = datetime.strptime(start_date, "%Y-%m-%d")
    else:
        start_date = now - timedelta(days=7)
    
    if end_date:
        end_date = datetime.strptime(end_date, "%Y-%m-%d")
    else:
        end_date = now
    
    service = HandoverService(db)
    handovers = service.get_handovers_by_date_range(start_date, end_date, current_user)
    
    return {
        "success": True,
        "data": handovers
    }


@router.post("/{handover_id}/lock", response_model=HandoverApiResponse)
def acquire_lock(
    handover_id: int,
    data: HandoverLockRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    인수인계 레코드에 락 획득
    """
    service = HandoverService(db)
    lock_info = service.acquire_lock(handover_id, current_user, data.timeout)
    
    if not lock_info:
        return {
            "success": False,
            "error_code": "LOCK_CONFLICT",
            "message": "이미 다른 사용자가 수정 중입니다."
        }
    
    return {
        "success": True,
        "data": lock_info
    }


@router.delete("/{handover_id}/lock", response_model=HandoverApiResponse)
def release_lock(
    handover_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    인수인계 레코드의 락 해제
    """
    service = HandoverService(db)
    success = service.release_lock(handover_id, current_user)
    
    if not success:
        return {
            "success": False,
            "error_code": "LOCK_RELEASE_FAILED",
            "message": "락 해제에 실패했습니다."
        }
    
    return {
        "success": True,
        "data": {"released": True}
    }


@router.get("/{handover_id}/lock", response_model=HandoverApiResponse)
def get_lock_info(
    handover_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    인수인계 레코드의 락 정보 조회
    """
    service = HandoverService(db)
    lock_info = service.get_lock_info(handover_id)
    
    return {
        "success": True,
        "data": lock_info
    }


@router.put("/{handover_id}", response_model=HandoverApiResponse)
def update_handover(
    handover_id: int,
    data: HandoverUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
    is_admin: bool = Depends(get_user_is_admin)
):
    """
    인수인계 레코드 수정 (작성자 또는 관리자만 가능, 락 필요)
    """
    service = HandoverService(db)
    
    # 락 확인
    if service.is_locked_by_others(handover_id, current_user):
        return {
            "success": False,
            "error_code": "LOCK_CONFLICT",
            "message": "이미 다른 사용자가 수정 중입니다."
        }
    
    # 수정 권한 확인 및 수정 처리
    result = service.update_handover_with_permission(handover_id, data, current_user, is_admin)
    
    if result["error_code"]:
        return {
            "success": False,
            "error_code": result["error_code"],
            "message": result["message"]
        }
    
    return {
        "success": True,
        "data": result["handover"]
    }


@router.delete("/{handover_id}", response_model=HandoverApiResponse)
def delete_handover(
    handover_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
    is_admin: bool = Depends(get_user_is_admin)
):
    """
    인수인계 레코드 삭제 (작성자 또는 관리자만 가능, 락 필요)
    """
    service = HandoverService(db)
    
    # 락 확인
    if service.is_locked_by_others(handover_id, current_user):
        return {
            "success": False,
            "error_code": "LOCK_CONFLICT",
            "message": "이미 다른 사용자가 수정 중입니다."
        }
    
    # 삭제 처리
    result = service.delete_handover_with_permission(handover_id, current_user, is_admin)
    
    if result["error_code"]:
        return {
            "success": False,
            "error_code": result["error_code"],
            "message": result["message"]
        }
    
    return {
        "success": True,
        "data": {"deleted": True}
    } 