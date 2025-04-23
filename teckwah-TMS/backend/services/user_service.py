"""
사용자 관련 서비스
"""

from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from datetime import datetime

from backend.models.user_model import User
from backend.schemas.user_schema import UserCreate, UserUpdate
from backend.utils.security import hash_password, verify_password
from backend.utils.logger import logger


class UserService:
    """사용자 관련 서비스 클래스"""

    @staticmethod
    def create_user(db: Session, user_create: UserCreate) -> User:
        """새 사용자를 생성합니다."""
        # 이미 존재하는 사용자 ID인지 확인
        existing_user = (
            db.query(User).filter(User.user_id == user_create.user_id).first()
        )
        if existing_user:
            raise ValueError(f"이미 존재하는 사용자 ID입니다: {user_create.user_id}")

        # 비밀번호 해시화
        hashed_password = hash_password(user_create.user_password)

        # 새 사용자 생성
        new_user = User(
            user_id=user_create.user_id,
            user_password=hashed_password,
            user_department=user_create.user_department,
            user_role=user_create.user_role,
        )

        try:
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            logger.info(f"새 사용자 생성 완료: {user_create.user_id}")
            return new_user
        except Exception as e:
            db.rollback()
            logger.error(f"사용자 생성 중 오류: {str(e)}")
            raise

    @staticmethod
    def get_user(db: Session, user_id: str) -> Optional[User]:
        """사용자 ID로 사용자를 조회합니다."""
        return db.query(User).filter(User.user_id == user_id).first()

    @staticmethod
    def get_users(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        role: Optional[str] = None,
        department: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[User], int]:
        """사용자 목록을 조회합니다."""
        query = db.query(User)

        # 필터 적용
        if role:
            query = query.filter(User.user_role == role)
        if department:
            query = query.filter(User.user_department == department)
        if search:
            query = query.filter(User.user_id.ilike(f"%{search}%"))

        # 전체 수 계산
        total = query.count()

        # 페이지네이션 및 정렬 적용
        users = query.order_by(User.user_id).offset(skip).limit(limit).all()

        return users, total

    @staticmethod
    def delete_user(db: Session, user_id: str) -> bool:
        """사용자를 삭제합니다."""
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            return False

        try:
            db.delete(user)
            db.commit()
            logger.info(f"사용자 삭제 완료: {user_id}")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"사용자 삭제 중 오류: {str(e)}")
            raise

    @staticmethod
    def verify_user(db: Session, user_id: str, password: str) -> Optional[User]:
        """사용자 인증을 수행합니다."""
        user = db.query(User).filter(User.user_id == user_id).first()

        if not user:
            logger.warning(f"존재하지 않는 사용자 로그인 시도: {user_id}")
            return None

        if not verify_password(password, user.user_password):
            logger.warning(f"잘못된 비밀번호 입력: {user_id}")
            return None

        logger.info(f"사용자 로그인 성공: {user_id}")
        return user
