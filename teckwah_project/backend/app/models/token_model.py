from sqlalchemy import Column, String, TIMESTAMP, ForeignKey, func
from app.config.database import Base
from sqlalchemy.orm import Session
from datetime import datetime


class RefreshToken(Base):
    """리프레시 토큰 모델"""

    __tablename__ = "refresh_tokens"

    token = Column(String(255), primary_key=True)
    user_id = Column(
        String(50), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    expires_at = Column(TIMESTAMP, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    @classmethod
    def create(cls, db: Session, user_id: str, token: str, expires_at: datetime):
        """새 리프레시 토큰 생성"""
        refresh_token = cls(
            token=token,
            user_id=user_id,
            expires_at=expires_at
        )
        db.add(refresh_token)
        db.commit()
        return refresh_token
    
    @classmethod
    def delete_by_user(cls, db: Session, user_id: str):
        """사용자의 모든 리프레시 토큰 삭제"""
        db.query(cls).filter(cls.user_id == user_id).delete()
        db.commit()
