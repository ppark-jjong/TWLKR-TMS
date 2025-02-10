# backend/app/models/session_model.py
from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.config.database import Base

class Session(Base):
    """
    세션 모델
    - session_id: 클라이언트에 전달할 고유 세션 ID (Primary Key)
    - user_id: 세션과 연관된 사용자 ID (users 테이블과 FK 관계)
    - expires_at: 세션 만료 시간
    - created_at: 세션 생성 시간 (자동으로 현재 시각 기록)
    """
    __tablename__ = 'sessions'

    session_id = Column(String(255), primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
