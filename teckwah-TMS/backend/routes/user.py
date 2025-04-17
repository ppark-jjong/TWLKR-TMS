"""
사용자 관리 관련 라우트 - 서비스 레이어 패턴 적용
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from backend.utils.logger import logger
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from backend.database import get_db
from backend.models.user import UserCreate, UserUpdate
from backend.middleware.auth import get_current_user, admin_required
from backend.services.user_service import (
    get_users as service_get_users,
    get_user as service_get_user,
    create_user as service_create_user,
    delete_user as service_delete_user
)

router = APIRouter()


@router.get("/", response_model=Dict[str, Any], dependencies=[Depends(admin_required)])
async def get_users(
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(1000, ge=1, le=1000, description="페이지당 항목 수"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    사용자 목록 조회 (관리자 전용)
    모든 사용자 정보를 한 번에 표시하도록 간소화됨
    """
    logger.api(f"사용자 목록 조회 - 사용자: {current_user['user_id']}, 페이지: {page}")
    
    # 서비스 레이어 호출
    response = service_get_users(
        db=db,
        page=page,
        limit=limit,
        current_user_id=current_user["user_id"]
    )
    
    return response


@router.post("/", response_model=Dict[str, Any], dependencies=[Depends(admin_required)])
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    새 사용자 생성 (관리자 전용)
    """
    logger.api(f"사용자 생성 - 사용자 ID: {user.user_id}, 요청자: {current_user['user_id']}")
    
    # 서비스 레이어 호출
    response = service_create_user(
        db=db,
        user_data=user.dict(),
        current_user_id=current_user["user_id"]
    )
    
    # 오류 처리
    if not response["success"]:
        if response["error_code"] == "DUPLICATE_ID":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=response["message"]
            )
    
    return response


@router.delete(
    "/{user_id}", response_model=Dict[str, Any], dependencies=[Depends(admin_required)]
)
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    사용자 삭제 (관리자 전용)
    """
    logger.api(f"사용자 삭제 - 대상 ID: {user_id}, 요청자: {current_user['user_id']}")
    
    # 서비스 레이어 호출
    response = service_delete_user(
        db=db,
        user_id=user_id,
        current_user_id=current_user["user_id"]
    )
    
    # 오류 처리
    if not response["success"]:
        if response["error_code"] == "NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=response["message"]
            )
        elif response["error_code"] == "SELF_DELETE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=response["message"]
            )
    
    return response
