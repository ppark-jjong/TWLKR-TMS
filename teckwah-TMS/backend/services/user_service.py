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
from backend.models.user import UserCreate, UserResponse


def get_users(
    db: Session, page: int = 1, limit: int = 100, current_user_id: str = None
) -> Dict[str, Any]:
    """
    사용자 목록 조회 서비스 (라우트에서 Pydantic 변환)
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

    # 라우트에서 UserListResponse로 변환할 수 있도록 SQLAlchemy 객체 리스트 반환
    return {
        "success": True,
        "message": "사용자 목록 조회 성공",
        "data": {"items": items, "total": total_count, "page": page, "limit": limit},
    }


def get_user(db: Session, user_id: str) -> Dict[str, Any]:
    """
    특정 사용자 조회 서비스 (라우트에서 Pydantic 변환)
    """
    logger.db(f"사용자 상세 조회 - ID: {user_id}")

    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        logger.warn(f"사용자 없음 - ID: {user_id}")
        return {
            "success": False,
            "message": "사용자를 찾을 수 없습니다",
            "error_code": "NOT_FOUND",
        }

    # 라우트에서 UserResponse로 변환할 수 있도록 SQLAlchemy 객체 반환
    return {"success": True, "message": "사용자 조회 성공", "data": user}


def create_user(
    db: Session, user_data: Dict[str, Any], current_user_id: str
) -> Dict[str, Any]:
    """
    사용자 생성 서비스 (라우트에서 Pydantic 변환)
    """
    user_id_input = user_data.get("userId")  # camelCase
    logger.db(f"사용자 생성 요청 - 생성 ID: {user_id_input}, 요청자: {current_user_id}")

    # 사용자 ID 중복 확인
    existing_user = db.query(User).filter(User.user_id == user_id_input).first()
    if existing_user:
        logger.warn(f"사용자 ID 중복 - ID: {user_id_input}")
        return {
            "success": False,
            "message": "이미 사용 중인 ID입니다",
            "error_code": "DUPLICATE_ID",
        }

    # 패스워드 해싱 (passlib 사용으로 변경 권장)
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    password_hash = pwd_context.hash(user_data["userPassword"])  # camelCase

    # 새 사용자 생성 (camelCase 키 사용)
    new_user = User(
        user_id=user_id_input,
        user_password=password_hash,
        user_department=user_data.get("userDepartment", "CS"),  # camelCase
        user_role=user_data.get("userRole", UserRole.USER),  # camelCase
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # UserResponse 모델과 일치하는 딕셔너리 반환 (camelCase)
    user_response_data = UserResponse.from_orm(new_user).dict(by_alias=True)

    logger.db(f"사용자 생성 완료 - ID: {new_user.user_id}, 요청자: {current_user_id}")

    return {"success": True, "message": "사용자 생성 성공", "data": user_response_data}


def delete_user(db: Session, user_id: str, current_user_id: str) -> Dict[str, Any]:
    """
    사용자 삭제 서비스 (라우트에서 Pydantic 변환)
    """
    logger.db(f"사용자 삭제 요청 - ID: {user_id}, 요청자: {current_user_id}")

    # 자기 자신 삭제 방지
    if user_id == current_user_id:
        logger.warn(f"자기 자신 삭제 시도 - ID: {user_id}")
        return {
            "success": False,
            "message": "현재 로그인한 자신의 계정은 삭제할 수 없습니다",
            "error_code": "SELF_DELETE",
        }

    # 사용자 존재 여부 확인
    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        logger.warn(f"사용자 없음 - ID: {user_id}")
        return {
            "success": False,
            "message": "사용자를 찾을 수 없습니다",
            "error_code": "NOT_FOUND",
        }

    # 삭제 실행
    db.delete(user)
    db.commit()

    logger.db(f"사용자 삭제 완료 - ID: {user_id}, 요청자: {current_user_id}")

    # 라우트에서 BasicSuccessResponse로 변환
    return {"success": True, "message": "사용자 삭제 성공", "data": None}
