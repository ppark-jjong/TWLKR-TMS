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
from ..utils.transaction import transaction
from ..utils.error import LockConflictException, NotFoundException

router = APIRouter(
    prefix="/handover",
    tags=["handover"]
)


@router.post("", response_model=HandoverApiResponse)
def create_handover(
    data: HandoverCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
    is_admin: bool = Depends(get_user_is_admin)
):
    """
    인수인계 레코드 생성
    관리자만 공지 설정 가능
    """
    service = HandoverService(db)
    
    # 관리자가 아닌 경우 공지 설정 제거
    if not is_admin:
        data.is_notice = False
        data.notice_until = None
    
    try:
        # 인수인계 생성
        handover = service.create_handover(data, current_user)
        return {
            "success": True,
            "data": handover
        }
    except Exception as e:
        return {
            "success": False,
            "error_code": "SERVER_ERROR",
            "message": str(e)
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
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    날짜 범위로 인수인계 목록 조회
    """
    try:
        # 날짜 형식 변환
        start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
        end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
        
        service = HandoverService(db)
        handovers = service.get_handovers_by_date_range(start_datetime, end_datetime, current_user)
        
        return {
            "success": True,
            "data": handovers
        }
    except ValueError:
        return {
            "success": False,
            "error_code": "VALIDATION_ERROR",
            "message": "날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용하세요."
        }
    except Exception as e:
        return {
            "success": False,
            "error_code": "SERVER_ERROR",
            "message": str(e)
        }


@router.post("/{handover_id}/lock", response_model=HandoverApiResponse)
def acquire_handover_lock(
    handover_id: int,
    lock_request: HandoverLockRequest = None,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    인수인계 레코드에 락 획득 (메모리 기반 락 사용)
    """
    service = HandoverService(db)
    
    # 락 요청 세부 정보
    timeout = lock_request.timeout if lock_request and lock_request.timeout else 300
    
    # 락 획득 시도
    lock_info = service.acquire_lock(handover_id, current_user, timeout)
    
    if not lock_info:
        existing_lock = service.get_lock_info(handover_id)
        if existing_lock:
            return {
                "success": False,
                "error_code": "LOCK_CONFLICT",
                "message": f"다른 사용자({existing_lock.locked_by})가 수정 중입니다.",
                "data": existing_lock
            }
        return {
            "success": False,
            "error_code": "SERVER_ERROR",
            "message": "락 획득에 실패했습니다."
        }
    
    return {
        "success": True,
        "data": lock_info
    }


@router.delete("/{handover_id}/lock", response_model=HandoverApiResponse)
def release_handover_lock(
    handover_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    인수인계 레코드 락 해제 (메모리 기반 락 사용)
    """
    service = HandoverService(db)
    success = service.release_lock(handover_id, current_user)
    
    if not success:
        return {
            "success": False,
            "error_code": "LOCK_ERROR",
            "message": "락 해제에 실패했습니다. (권한이 없거나 락이 존재하지 않습니다)"
        }
    
    return {
        "success": True,
        "message": "락이 해제되었습니다."
    }


@router.get("/{handover_id}/lock", response_model=HandoverApiResponse)
def get_handover_lock_info(
    handover_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    인수인계 레코드 락 정보 조회 (메모리 기반 락 사용)
    """
    service = HandoverService(db)
    lock_info = service.get_lock_info(handover_id)
    
    if not lock_info:
        return {
            "success": True,
            "data": {
                "is_locked": False,
                "id": handover_id
            }
        }
    
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
    인수인계 레코드 수정 (작성자 또는 관리자만 가능, 행 수준 락 사용)
    관리자만 공지 설정 가능
    """
    service = HandoverService(db)
    
    # 수정 권한 확인 및 수정 처리
    result = service.update_handover_with_permission(handover_id, data, current_user, is_admin)
    
    if result["error_code"]:
        return {
            "success": False,
            "error_code": result["error_code"],
            "message": result["message"],
            "data": result.get("handover")
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
    인수인계 레코드 삭제 (작성자 또는 관리자만 가능, 행 수준 락 사용)
    """
    service = HandoverService(db)
    
    # 삭제 권한 확인 및 삭제 처리
    result = service.delete_handover_with_permission(handover_id, current_user, is_admin)
    
    if result["error_code"]:
        return {
            "success": False,
            "error_code": result["error_code"],
            "message": result["message"]
        }
    
    return {
        "success": True,
        "message": "인수인계 항목이 삭제되었습니다."
    } 