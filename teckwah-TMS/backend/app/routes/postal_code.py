"""
우편번호 관련 라우트
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.database import get_db
from app.models.postal_code import (
    PostalCode, PostalCodeDetail, PostalCodeResponse, 
    PostalCodeDetailResponse, PostalCodeCreate, PostalCodeDetailCreate
)
from app.middleware.auth import get_current_user, admin_required

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
async def get_postal_codes(
    code_query: Optional[str] = Query(None, description="우편번호 검색"),
    city: Optional[str] = Query(None, description="시 검색"),
    county: Optional[str] = Query(None, description="군/구 검색"),
    district: Optional[str] = Query(None, description="동/읍/면 검색"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(10, ge=1, le=100, description="페이지당 항목 수"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    우편번호 목록 조회
    """
    # 기본 쿼리
    query = db.query(PostalCode)
    
    # 필터링
    if code_query:
        query = query.filter(PostalCode.postal_code.like(f"%{code_query}%"))
    
    if city:
        query = query.filter(PostalCode.city.like(f"%{city}%"))
    
    if county:
        query = query.filter(PostalCode.county.like(f"%{county}%"))
    
    if district:
        query = query.filter(PostalCode.district.like(f"%{district}%"))
    
    # 총 항목 수 계산
    total_count = query.count()
    
    # 페이지네이션
    query = query.order_by(PostalCode.postal_code)
    query = query.offset((page - 1) * limit).limit(limit)
    
    # 결과 반환
    results = query.all()
    
    return {
        "success": True,
        "message": "우편번호 목록 조회 성공",
        "data": {
            "items": results,
            "total": total_count,
            "page": page,
            "limit": limit
        }
    }

@router.get("/{postal_code}", response_model=Dict[str, Any])
async def get_postal_code(
    postal_code: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    특정 우편번호 조회
    """
    code = db.query(PostalCode).filter(PostalCode.postal_code == postal_code).first()
    
    if not code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="우편번호를 찾을 수 없습니다"
        )
    
    # 상세 정보 조회
    details = db.query(PostalCodeDetail).filter(PostalCodeDetail.postal_code == postal_code).all()
    
    return {
        "success": True,
        "message": "우편번호 조회 성공",
        "data": {
            "postal_code": code,
            "details": details
        }
    }

@router.post("/", response_model=Dict[str, Any], dependencies=[Depends(admin_required)])
async def create_postal_code(
    postal_code: PostalCodeCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    새 우편번호 생성 (관리자 전용)
    """
    # 중복 검사
    existing = db.query(PostalCode).filter(PostalCode.postal_code == postal_code.postal_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 존재하는 우편번호입니다"
        )
    
    # 새 우편번호 생성
    new_code = PostalCode(
        postal_code=postal_code.postal_code,
        city=postal_code.city,
        county=postal_code.county,
        district=postal_code.district
    )
    
    db.add(new_code)
    db.commit()
    db.refresh(new_code)
    
    return {
        "success": True,
        "message": "우편번호 생성 성공",
        "data": new_code
    }

@router.post("/detail", response_model=Dict[str, Any], dependencies=[Depends(admin_required)])
async def create_postal_code_detail(
    detail: PostalCodeDetailCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    우편번호 상세 정보 생성 (관리자 전용)
    """
    # 우편번호 존재 여부 확인
    code = db.query(PostalCode).filter(PostalCode.postal_code == detail.postal_code).first()
    if not code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="존재하지 않는 우편번호입니다"
        )
    
    # 중복 검사
    existing = (
        db.query(PostalCodeDetail)
        .filter(
            PostalCodeDetail.postal_code == detail.postal_code,
            PostalCodeDetail.warehouse == detail.warehouse
        )
        .first()
    )
    
    if existing:
        # 중복 시 업데이트
        existing.distance = detail.distance
        existing.duration_time = detail.duration_time
        db.commit()
        db.refresh(existing)
        return {
            "success": True,
            "message": "우편번호 상세정보 업데이트 성공",
            "data": existing
        }
    
    # 새 상세정보 생성
    new_detail = PostalCodeDetail(
        postal_code=detail.postal_code,
        warehouse=detail.warehouse,
        distance=detail.distance,
        duration_time=detail.duration_time
    )
    
    db.add(new_detail)
    db.commit()
    db.refresh(new_detail)
    
    return {
        "success": True,
        "message": "우편번호 상세정보 생성 성공",
        "data": new_detail
    }

@router.delete("/{postal_code}", response_model=Dict[str, Any], dependencies=[Depends(admin_required)])
async def delete_postal_code(
    postal_code: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    우편번호 삭제 (관리자 전용)
    상세정보도 함께 삭제됨 (CASCADE)
    """
    code = db.query(PostalCode).filter(PostalCode.postal_code == postal_code).first()
    
    if not code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="우편번호를 찾을 수 없습니다"
        )
    
    # 상세정보 먼저 삭제 (CASCADE가 동작하지 않을 경우 대비)
    db.query(PostalCodeDetail).filter(PostalCodeDetail.postal_code == postal_code).delete()
    
    # 우편번호 삭제
    db.delete(code)
    db.commit()
    
    return {
        "success": True,
        "message": "우편번호 삭제 성공"
    }
