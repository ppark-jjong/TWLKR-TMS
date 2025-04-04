# teckwah_project/server/repositories/auth_repository.py
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List
from server.utils.datetime import get_kst_now

from server.models.user_model import User
from server.models.refresh_token_model import RefreshToken
from server.utils.logger import log_info, log_error


class AuthRepository:
    """인증 저장소 구현"""

    def __init__(self, db: Session):
        self.db = db

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """사용자 ID로 사용자 정보 조회"""
        try:
            log_info(f"사용자 조회: user_id={user_id}")
            user = self.db.query(User).filter(User.user_id == user_id).first()
            return user
        except Exception as e:
            log_error(e, "사용자 조회 실패", {"user_id": user_id})
            return None

    def get_all_users(self) -> List[User]:
        """모든 사용자 목록 조회"""
        try:
            log_info("모든 사용자 목록 조회")
            users = self.db.query(User).order_by(User.user_id).all()
            log_info(f"사용자 목록 조회 결과: {len(users)}명")
            return users
        except Exception as e:
            log_error(e, "사용자 목록 조회 실패")
            return []

    def create_user(
        self, user_id: str, hashed_password: str, department: str, role: str
    ) -> User:
        """사용자 생성"""
        try:
            log_info(f"사용자 생성: user_id={user_id}, department={department}, role={role}")
            
            user = User(
                user_id=user_id,
                user_password=hashed_password,
                user_department=department,
                user_role=role,
            )
            
            self.db.add(user)
            self.db.flush()
            log_info(f"사용자 생성 완료: user_id={user_id}")
            
            return user
        except Exception as e:
            log_error(e, "사용자 생성 실패", {"user_id": user_id})
            self.db.rollback()
            raise

    def delete_user(self, user_id: str) -> bool:
        """사용자 삭제"""
        try:
            log_info(f"사용자 삭제: user_id={user_id}")
            
            # 사용자 삭제
            result = self.db.query(User).filter(User.user_id == user_id).delete()
            
            # 연관된 리프레시 토큰 삭제
            self.db.query(RefreshToken).filter(RefreshToken.user_id == user_id).delete()
            
            self.db.flush()
            log_info(f"사용자 삭제 결과: {result}건")
            
            return result > 0
        except Exception as e:
            log_error(e, "사용자 삭제 실패", {"user_id": user_id})
            self.db.rollback()
            return False

    def store_refresh_token(
        self, user_id: str, refresh_token: str, expires_at: datetime
    ) -> RefreshToken:
        """리프레시 토큰 저장
        - 이미 있는 경우 업데이트
        - 없는 경우 새로 생성
        """
        try:
            log_info(f"리프레시 토큰 저장: user_id={user_id}")

            # 기존 토큰 확인 및 삭제
            existing_token = (
                self.db.query(RefreshToken)
                .filter(RefreshToken.user_id == user_id)
                .first()
            )

            if existing_token:
                log_info(f"기존 토큰 삭제: user_id={user_id}")
                self.db.delete(existing_token)
                self.db.flush()

            # 새 토큰 저장
            token_entry = RefreshToken(
                user_id=user_id, refresh_token=refresh_token, expires_at=expires_at
            )

            self.db.add(token_entry)
            self.db.flush()
            log_info(f"리프레시 토큰 저장 완료: user_id={user_id}")

            return token_entry
        except Exception as e:
            log_error(e, "리프레시 토큰 저장 실패", {"user_id": user_id})
            self.db.rollback()
            raise

    def get_valid_refresh_token(self, refresh_token: str) -> Optional[RefreshToken]:
        """유효한 리프레시 토큰 조회"""
        try:
            log_info("리프레시 토큰 조회")

            # KST 현재 시간 기준으로 만료 여부 확인
            now = get_kst_now()

            token_entry = (
                self.db.query(RefreshToken)
                .filter(
                    RefreshToken.refresh_token == refresh_token,
                    RefreshToken.expires_at > now,
                )
                .first()
            )

            return token_entry
        except Exception as e:
            log_error(e, "리프레시 토큰 조회 실패")
            return None

    def delete_refresh_token(self, refresh_token: str) -> bool:
        """리프레시 토큰 삭제"""
        try:
            log_info("리프레시 토큰 삭제")

            result = (
                self.db.query(RefreshToken)
                .filter(RefreshToken.refresh_token == refresh_token)
                .delete()
            )

            if result:
                log_info("리프레시 토큰 삭제 완료")
            else:
                log_info("삭제할 리프레시 토큰 없음")

            return result > 0
        except Exception as e:
            log_error(e, "리프레시 토큰 삭제 실패")
            self.db.rollback()
            return False

    def cleanup_expired_tokens(self) -> int:
        """만료된 리프레시 토큰 정리"""
        try:
            log_info("만료된 리프레시 토큰 정리")

            # KST 현재 시간 기준으로 만료 토큰 정리
            now = get_kst_now()

            result = (
                self.db.query(RefreshToken)
                .filter(RefreshToken.expires_at < now)
                .delete(synchronize_session=False)
            )

            if result > 0:
                log_info(f"만료된 리프레시 토큰 정리 완료: {result}건")

            return result
        except Exception as e:
            log_error(e, "만료된 리프레시 토큰 정리 실패")
            self.db.rollback()
            return 0
