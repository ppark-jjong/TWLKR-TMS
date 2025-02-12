# backend/app/repositories/auth_repository.py
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.models.user_model import User
from app.models.refresh_token_model import RefreshToken
from app.utils.logger import log_error, log_info


class AuthRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """사용자 ID로 사용자 정보 조회"""
        try:
            user = self.db.query(User).filter(User.user_id == user_id).first()
            return user
        except SQLAlchemyError as e:
            log_error(e, "사용자 조회 실패")
            raise

    def store_refresh_token(
        self, user_id: str, refresh_token: str, expires_at: datetime
    ) -> RefreshToken:
        """리프레시 토큰 저장 (기존 토큰 삭제 후 저장)"""
        try:
            # 기존 토큰 삭제
            self.db.query(RefreshToken).filter(RefreshToken.user_id == user_id).delete()

            # 새 토큰 저장
            token = RefreshToken(
                user_id=user_id, refresh_token=refresh_token, expires_at=expires_at
            )
            self.db.add(token)
            self.db.commit()
            return token
        except SQLAlchemyError as e:
            log_error(e, "리프레시 토큰 저장 실패")
            self.db.rollback()
            raise

    def get_valid_refresh_token(self, refresh_token: str) -> Optional[RefreshToken]:
        """유효한 리프레시 토큰 조회"""
        try:
            return (
                self.db.query(RefreshToken)
                .filter(
                    RefreshToken.refresh_token == refresh_token,
                    RefreshToken.expires_at > datetime.utcnow(),
                )
                .first()
            )
        except SQLAlchemyError as e:
            log_error(e, "리프레시 토큰 조회 실패")
            raise

    def delete_refresh_token(self, refresh_token: str) -> bool:
        """리프레시 토큰 삭제 (로그아웃)"""
        try:
            deleted = (
                self.db.query(RefreshToken)
                .filter(RefreshToken.refresh_token == refresh_token)
                .delete()
            )
            self.db.commit()
            return bool(deleted)
        except SQLAlchemyError as e:
            log_error(e, "리프레시 토큰 삭제 실패")
            self.db.rollback()
            raise

    def cleanup_expired_tokens(self) -> int:
        """만료된 리프레시 토큰 정리"""
        try:
            deleted = (
                self.db.query(RefreshToken)
                .filter(RefreshToken.expires_at < datetime.utcnow())
                .delete()
            )
            self.db.commit()
            return deleted
        except SQLAlchemyError as e:
            log_error(e, "만료 토큰 정리 실패")
            self.db.rollback()
            raise
