"""
사용자 관리 관련 라우트
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.utils.logger import logger
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.database import get_db
from app.models.user import User, UserCreate, UserResponse
from app.middleware.auth import get_current_user, admin_required
from app.utils.security import get_password_hash

router = APIRouter()

@router.get("/", response_model=Dict[str, Any], dependencies=[Depends(admin_required)])
async def get_users(
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(10, ge=1, le=100, description="페이지당 항목 수"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    사용자 목록 조회 (관리자 전용)
    """
    # 사용자 목록 쿼리
    query = db.query(User)
    
    # 총 항목 수 계산
    total_count = query.count()
    
    # 페이지네이션
    query = query.order_by(User.user_id)
    query = query.offset((page - 1) * limit).limit(limit)
    
    # 결과 반환
    results = query.all()
    
    return {
        "success": True,
        "message": "사용자 목록 조회 성공",
        "data": {
            "items": results,
            "total": total_count,
            "page": page,
            "limit": limit
        }
    }

@router.post("/", response_model=Dict[str, Any], dependencies=[Depends(admin_required)])
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    새 사용자 생성 (관리자 전용)
    """
    # 아이디 중복 검사
    existing_user = db.query(User).filter(User.user_id == user.user_id).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 아이디입니다"
        )
    
    # 비밀번호 해시화
    hashed_password = get_password_hash(user.user_password)
    
    # 새 사용자 생성
    new_user = User(
        user_id=user.user_id,
        user_password=hashed_password,
        user_department=user.user_department,
        user_role=user.user_role
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    logger.info(f"사용자 생성: ID {new_user.user_id}, 권한: {new_user.user_role}, 생성자: {current_user['user_id']}")
    
    # 비밀번호 제외하고 반환
    user_response = UserResponse(
        user_id=new_user.user_id,
        user_department=new_user.user_department,
        user_role=new_user.user_role
    )
    
    return {
        "success": True,
        "message": "사용자 생성 성공",
        "data": user_response
    }

@router.get("/{user_id}", response_model=Dict[str, Any], dependencies=[Depends(admin_required)])
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    특정 사용자 조회 (관리자 전용)
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )
    
    return {
        "success": True,
        "message": "사용자 조회 성공",
        "data": UserResponse.from_orm(user)
    }

@router.delete("/{user_id}", response_model=Dict[str, Any], dependencies=[Depends(admin_required)])
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    사용자 삭제 (관리자 전용)
    """
    # 현재 사용자는 삭제 불가
    if user_id == current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="현재 로그인한 사용자는 삭제할 수 없습니다"
        )
    
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )
    
    db.delete(user)
    db.commit()
    
    logger.info(f"사용자 삭제: ID {user_id}, 삭제자: {current_user['user_id']}")
    
    return {
        "success": True,
        "message": "사용자 삭제 성공"
    }
