"""
인수인계 관련 라우트 - 서비스 레이어 패턴 적용
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from backend.utils.logger import logger
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

from backend.database import get_db
from backend.models.handover import HandoverCreate, HandoverUpdate
from backend.middleware.auth import get_current_user, admin_required
from backend.models.user import UserRole
from backend.utils.lock import acquire_lock, release_lock, validate_lock, check_lock_status
from backend.services.handover_service import (
    get_handovers as service_get_handovers,
    get_handover as service_get_handover,
    create_handover as service_create_handover,
    update_handover as service_update_handover,
    delete_handover as service_delete_handover
)

router = APIRouter()


@router.get("/", response_model=Dict[str, Any])
async def get_handovers(
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(10, ge=1, le=100, description="페이지당 항목 수"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    인수인계 목록 조회 (서비스 레이어 사용)
    """
    logger.api(f"인수인계 목록 조회 - 사용자: {current_user['user_id']}, 페이지: {page}")
    
    # 서비스 레이어 호출
    response = service_get_handovers(
        db=db,
        page=page,
        limit=limit,
        current_user_id=current_user["user_id"]
    )
    
    return response


@router.get("/{handover_id}", response_model=Dict[str, Any])
async def get_handover(
    handover_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    특정 인수인계 조회 (서비스 레이어 사용)
    """
    logger.api(f"인수인계 상세 조회 - ID: {handover_id}, 사용자: {current_user['user_id']}")
    
    # 서비스 레이어 호출
    response = service_get_handover(
        db=db,
        handover_id=handover_id,
        current_user_id=current_user["user_id"]
    )
    
    # 오류 처리
    if not response["success"]:
        if response["error_code"] == "NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=response["message"]
            )
    
    return response


@router.post("/", response_model=Dict[str, Any])
async def create_handover(
    handover: HandoverCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    새 인수인계 생성 (서비스 레이어 사용)
    """
    logger.api(f"인수인계 생성 - 사용자: {current_user['user_id']}, 공지여부: {handover.is_notice}")
    
    # 서비스 레이어 호출
    response = service_create_handover(
        db=db,
        handover_data=handover.dict(),
        current_user_id=current_user["user_id"],
        current_user_role=current_user["user_role"]
    )
    
    # 오류 처리
    if not response["success"]:
        if response["error_code"] == "PERMISSION_DENIED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=response["message"]
            )
    
    return response


@router.put("/{handover_id}", response_model=Dict[str, Any])
async def update_handover(
    handover_id: int,
    handover_update: HandoverUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    인수인계 수정 (서비스 레이어 사용)
    """
    # 락 검증
    validate_lock(db, "handover", handover_id, current_user["user_id"])
    
    logger.api(f"인수인계 수정 - ID: {handover_id}, 사용자: {current_user['user_id']}")
    
    # 서비스 레이어 호출
    response = service_update_handover(
        db=db,
        handover_id=handover_id,
        handover_data=handover_update.dict(),
        current_user_id=current_user["user_id"],
        current_user_role=current_user["user_role"]
    )
    
    # 오류 처리
    if not response["success"]:
        if response["error_code"] == "NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=response["message"]
            )
        elif response["error_code"] == "PERMISSION_DENIED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=response["message"]
            )
    
    return response


@router.delete("/{handover_id}", response_model=Dict[str, Any])
async def delete_handover(
    handover_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    인수인계 삭제 (서비스 레이어 사용)
    """
    # 락 검증
    validate_lock(db, "handover", handover_id, current_user["user_id"])
    
    logger.api(f"인수인계 삭제 - ID: {handover_id}, 사용자: {current_user['user_id']}")
    
    # 서비스 레이어 호출
    response = service_delete_handover(
        db=db,
        handover_id=handover_id,
        current_user_id=current_user["user_id"],
        current_user_role=current_user["user_role"]
    )
    
    # 오류 처리
    if not response["success"]:
        if response["error_code"] == "NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=response["message"]
            )
        elif response["error_code"] == "PERMISSION_DENIED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=response["message"]
            )
    
    return response


@router.post("/{handover_id}/lock", response_model=Dict[str, Any])
async def lock_handover(
    handover_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    인수인계 락 획득
    """
    logger.api(f"인수인계 락 획득 - ID: {handover_id}, 사용자: {current_user['user_id']}")
    
    # 인수인계 존재 여부 확인
    handover_response = service_get_handover(db, handover_id, current_user["user_id"])
    if not handover_response["success"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=handover_response["message"]
        )
    
    handover = handover_response["data"]
    
    # 권한 체크: 공지사항은 관리자만, 일반 인수인계는 본인만 편집 가능
    if handover.is_notice and current_user["user_role"] != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="공지사항은 관리자만 편집할 수 있습니다",
        )
    
    if not handover.is_notice and handover.updated_by != current_user["user_id"] and current_user["user_role"] != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인이 작성한 인수인계만 편집할 수 있습니다",
        )
    
    # 락 획득 시도
    lock_acquired = acquire_lock(db, "handover", handover_id, current_user["user_id"])
    
    if not lock_acquired:
        # 현재 락 상태 확인
        lock_status = check_lock_status(db, "handover", handover_id, current_user["user_id"])
        return {
            "success": False,
            "message": lock_status["message"],
            "lock_status": lock_status
        }
    
    return {
        "success": True,
        "message": "인수인계/공지사항 락 획득 성공",
        "lock_status": {"locked": True, "editable": True, "message": "현재 사용자가 편집 중입니다"}
    }


@router.post("/{handover_id}/unlock", response_model=Dict[str, Any])
async def unlock_handover(
    handover_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    인수인계 락 해제
    """
    logger.api(f"인수인계 락 해제 - ID: {handover_id}, 사용자: {current_user['user_id']}")
    
    # 인수인계 존재 여부 확인
    handover_response = service_get_handover(db, handover_id, current_user["user_id"])
    if not handover_response["success"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=handover_response["message"]
        )
    
    # 락 해제 시도
    lock_released = release_lock(db, "handover", handover_id, current_user["user_id"])
    
    if not lock_released:
        # 현재 락 상태 확인
        lock_status = check_lock_status(db, "handover", handover_id, current_user["user_id"])
        return {
            "success": False,
            "message": "락을 해제할 권한이 없습니다",
            "lock_status": lock_status
        }
    
    return {
        "success": True,
        "message": "인수인계/공지사항 락 해제 성공",
        "lock_status": {"locked": False, "editable": True, "message": "편집 가능합니다"}
    }
