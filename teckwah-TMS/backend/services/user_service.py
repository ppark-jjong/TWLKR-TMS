"""
사용자 관리 관련 서비스 레이어
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Dict, Any, List, Optional
from datetime import datetime
import hashlib
import os

from backend.models.user import User, UserRole
from backend.utils.logger import logger
from backend.models.user import UserCreate


def get_users(
    db: Session,
    page: int = 1,
    limit: int = 100,
    current_user_id: str = None
) -> Dict[str, Any]:
    """
    사용자 목록 조회 서비스
    """
    logger.db(f"사용자 목록 조회 - 페이지: {page}, 요청자: {current_user_id}")
    
    # 총 사용자 수 조회
    total_count = db.query(func.count(User.user_id)).scalar()
    
    # 사용자 목록 조회 (페이지네이션 적용, user_id로 정렬)
    items = (
        db.query(User)
        .order_by(User.user_id.asc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    
    logger.db(f"사용자 목록 조회 완료 - {len(items)}건 / 전체: {total_count}건")
    
    return {
        "success": True,
        "message": "사용자 목록 조회 성공",
        "data": {
            "items": items,
            "total": total_count,
            "page": page,
            "limit": limit
        }
    }


def get_user(
    db: Session,
    user_id: str
) -> Dict[str, Any]:
    """
    특정 사용자 조회 서비스
    """
    logger.db(f"사용자 상세 조회 - ID: {user_id}")
    
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        logger.warn(f"사용자 없음 - ID: {user_id}")
        return {
            "success": False,
            "message": "사용자를 찾을 수 없습니다",
            "error_code": "NOT_FOUND"
        }
    
    return {
        "success": True,
        "message": "사용자 조회 성공",
        "data": user
    }


def create_user(
    db: Session,
    user_data: Dict[str, Any],
    current_user_id: str
) -> Dict[str, Any]:
    """
    사용자 생성 서비스
    """
    logger.db(f"사용자 생성 요청 - 생성 ID: {user_data.get('user_id')}, 요청자: {current_user_id}")
    
    # 사용자 ID 중복 확인
    existing_user = db.query(User).filter(User.user_id == user_data["user_id"]).first()
    if existing_user:
        logger.warn(f"사용자 ID 중복 - ID: {user_data['user_id']}")
        return {
            "success": False,
            "message": "이미 사용 중인 ID입니다",
            "error_code": "DUPLICATE_ID"
        }
    
    # 패스워드 해싱
    salt = os.urandom(32)
    password_hash = hashlib.pbkdf2_hmac(
        'sha256', 
        user_data["user_password"].encode('utf-8'), 
        salt, 
        100000
    ).hex()
    
    # 새 사용자 생성 (데이터베이스 스키마에 맞게 필드명 수정)
    new_user = User(
        user_id=user_data["user_id"],
        user_password=password_hash,  # 해시된 비밀번호 직접 저장
        user_department=user_data.get("user_department", "CS"),  # 기본값 설정
        user_role=user_data.get("user_role", UserRole.USER)
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 민감 정보 제외하고 반환용 객체 생성 (스키마에 맞게 필드명 수정)
    user_response = {
        "user_id": new_user.user_id,
        "user_department": new_user.user_department,
        "user_role": new_user.user_role
    }
    
    logger.db(f"사용자 생성 완료 - ID: {new_user.user_id}, 요청자: {current_user_id}")
    
    return {
        "success": True,
        "message": "사용자 생성 성공",
        "data": user_response
    }


def delete_user(
    db: Session,
    user_id: str,
    current_user_id: str
) -> Dict[str, Any]:
    """
    사용자 삭제 서비스
    """
    logger.db(f"사용자 삭제 요청 - ID: {user_id}, 요청자: {current_user_id}")
    
    # 자기 자신 삭제 방지
    if user_id == current_user_id:
        logger.warn(f"자기 자신 삭제 시도 - ID: {user_id}")
        return {
            "success": False,
            "message": "현재 로그인한 자신의 계정은 삭제할 수 없습니다",
            "error_code": "SELF_DELETE"
        }
    
    # 사용자 존재 여부 확인
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        logger.warn(f"사용자 없음 - ID: {user_id}")
        return {
            "success": False,
            "message": "사용자를 찾을 수 없습니다",
            "error_code": "NOT_FOUND"
        }
    
    # 삭제 실행
    db.delete(user)
    db.commit()
    
    logger.db(f"사용자 삭제 완료 - ID: {user_id}, 요청자: {current_user_id}")
    
    return {
        "success": True,
        "message": "사용자 삭제 성공",
        "data": None
    }
