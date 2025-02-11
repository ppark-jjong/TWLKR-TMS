# backend/app/repositories/auth_repository.py

from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.user_model import User
from app.models.refresh_token_model import RefreshToken
from app.utils.logger import log_error, log_info
from app.utils.error_handler import handle_database_error

class AuthRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """사용자 ID로 사용자 정보 조회"""
        try:
            log_info(f"사용자 조회 시도: {user_id}")
            user = self.db.query(User).filter(User.user_id == user_id).first()
            if user:
                log_info(f"사용자 조회 성공: {user_id}")
            else:
                log_info(f"사용자 없음: {user_id}")
            return user
        except SQLAlchemyError as e:
            handle_database_error(e, "사용자 조회 실패", {"user_id": user_id})

    def create_refresh_token(self, user_id: str, refresh_token: str, 
                           expires_at: datetime) -> RefreshToken:
        """리프레시 토큰 생성"""
        try:
            log_info(f"리프레시 토큰 생성 시작: {user_id}")
            
            # 기존 리프레시 토큰이 있다면 삭제
            self.db.query(RefreshToken).filter(
                RefreshToken.user_id == user_id
            ).delete()
            
            # 새로운 리프레시 토큰 생성
            db_token = RefreshToken(
                user_id=user_id,
                refresh_token=refresh_token,
                expires_at=expires_at
            )
            self.db.add(db_token)
            self.db.commit()
            self.db.refresh(db_token)
            
            log_info(f"리프레시 토큰 생성 완료: {user_id}")
            return db_token
            
        except SQLAlchemyError as e:
            handle_database_error(e, "리프레시 토큰 생성 실패", {
                "user_id": user_id,
                "expires_at": expires_at
            })

    def get_refresh_token(self, refresh_token: str) -> Optional[RefreshToken]:
        """리프레시 토큰 조회"""
        try:
            log_info("리프레시 토큰 조회")
            token = self.db.query(RefreshToken).filter(
                RefreshToken.refresh_token == refresh_token
            ).first()
            
            if token:
                log_info(f"리프레시 토큰 조회 성공: {token.user_id}")
            else:
                log_info("리프레시 토큰 없음")
            return token
            
        except SQLAlchemyError as e:
            handle_database_error(e, "리프레시 토큰 조회 실패", {"refresh_token": refresh_token})

    def delete_refresh_token(self, refresh_token: str) -> bool:
        """리프레시 토큰 삭제 (로그아웃)"""
        try:
            log_info("리프레시 토큰 삭제 시도")
            result = self.db.query(RefreshToken).filter(
                RefreshToken.refresh_token == refresh_token
            ).delete()
            self.db.commit()
            
            log_info(f"리프레시 토큰 삭제 완료: {result}개")
            return bool(result)
            
        except SQLAlchemyError as e:
            self.db.rollback()
            handle_database_error(e, "리프레시 토큰 삭제 실패", {"refresh_token": refresh_token})
            return False

    def delete_expired_tokens(self) -> int:
        """만료된 리프레시 토큰 삭제"""
        try:
            log_info("만료된 리프레시 토큰 삭제 시작")
            current_time = datetime.now()
            deleted = self.db.query(RefreshToken).filter(
                RefreshToken.expires_at < current_time
            ).delete()
            self.db.commit()
            
            log_info(f"만료된 리프레시 토큰 삭제 완료: {deleted}개")
            return deleted
            
        except SQLAlchemyError as e:
            self.db.rollback()
            handle_database_error(e, "만료된 리프레시 토큰 삭제 실패")
            return 0