"""
우편번호 관련 라우트 (축소 버전)
- 대시보드 연동에 필요한 기능만 유지
- 기타 API 및 기능은 삭제
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from backend.database import get_db
from backend.models.postal_code import (
    PostalCode,
    PostalCodeDetail,
    PostalCodeResponse,
)
from backend.middleware.auth import get_current_user, admin_required

router = APIRouter()


@router.get("/{postal_code}", response_model=Dict[str, Any])
async def get_postal_code(
    postal_code: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    특정 우편번호 조회
    대시보드 기능 연동에 필요한 최소 기능만 유지
    """
    code = db.query(PostalCode).filter(PostalCode.postal_code == postal_code).first()

    if not code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="우편번호를 찾을 수 없습니다"
        )

    # 상세 정보 조회
    details = (
        db.query(PostalCodeDetail)
        .filter(PostalCodeDetail.postal_code == postal_code)
        .all()
    )

    return {
        "success": True,
        "message": "우편번호 조회 성공",
        "data": {"postal_code": code, "details": details},
    }
