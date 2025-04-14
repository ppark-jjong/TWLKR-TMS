"""
인수인계 관련 라우트
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.utils.logger import logger
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.database import get_db
from app.models.handover import Handover, HandoverCreate, HandoverResponse
from app.middleware.auth import get_current_user
from app.models.user import UserRole

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
async def get_handovers(
    is_notice: Optional[bool] = Query(None, description="공지사항 여부"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(10, ge=1, le=100, description="페이지당 항목 수"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    인수인계 목록 조회
    """
    # 기본 쿼리
    query = db.query(Handover)
    
    # 공지사항 필터링
    if is_notice is not None:
        query = query.filter(Handover.is_notice == is_notice)
    
    # 총 항목 수 계산
    total_count = query.count()
    
    # 페이지네이션 및 정렬 (최신순)
    query = query.order_by(Handover.create_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    
    # 결과 반환
    results = query.all()
    
    return {
        "success": True,
        "message": "인수인계 목록 조회 성공",
        "data": {
            "items": results,
            "total": total_count,
            "page": page,
            "limit": limit
        }
    }

@router.post("/", response_model=Dict[str, Any])
async def create_handover(
    handover: HandoverCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    새 인수인계 생성
    """
    now = datetime.now()
    
    new_handover = Handover(
        title=handover.title,
        content=handover.content,
        update_by=current_user["user_id"],
        is_notice=handover.is_notice,
        create_at=now,
        update_at=now
    )
    
    db.add(new_handover)
    db.commit()
    db.refresh(new_handover)
    
    notice_str = "공지사항" if handover.is_notice else "일반 인수인계"
    logger.info(f"{notice_str} 생성: ID {new_handover.handover_id}, 작성자: {current_user['user_id']}")
    
    return {
        "success": True,
        "message": "인수인계 생성 성공",
        "data": new_handover
    }

@router.get("/{handover_id}", response_model=Dict[str, Any])
async def get_handover(
    handover_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    특정 인수인계 조회
    """
    handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()
    
    if not handover:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="인수인계를 찾을 수 없습니다"
        )
    
    return {
        "success": True,
        "message": "인수인계 조회 성공",
        "data": handover
    }

@router.delete("/{handover_id}", response_model=Dict[str, Any])
async def delete_handover(
    handover_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    인수인계 삭제
    권한 제한: 관리자는 모든 항목, 일반 사용자는 본인 작성 항목만 삭제 가능
    """
    handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()
    
    if not handover:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="인수인계를 찾을 수 없습니다"
        )
    
    # 권한 검사
    if current_user["user_role"] != UserRole.ADMIN and handover.update_by != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인이 작성한 항목만 삭제할 수 있습니다"
        )
    
    db.delete(handover)
    db.commit()
    
    notice_str = "공지사항" if handover.is_notice else "인수인계"
    logger.info(f"{notice_str} 삭제: ID {handover_id}, 삭제자: {current_user['user_id']}")
    
    return {
        "success": True,
        "message": "인수인계 삭제 성공"
    }
