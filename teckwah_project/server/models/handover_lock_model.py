from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index, func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class HandoverLock(Base):
    """
    인수인계 레코드 락 모델
    """
    __tablename__ = "handover_lock"

    handover_id = Column(Integer, ForeignKey("handover.handover_id", ondelete="CASCADE"), primary_key=True)
    locked_by = Column(String(50), nullable=False)
    locked_at = Column(DateTime, default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    lock_timeout = Column(Integer, default=300, nullable=False)  # 기본 5분(300초) 타임아웃

    # 인덱스
    __table_args__ = (
        Index('idx_handover_expires_at', expires_at),
        Index('idx_handover_locked_by', locked_by),
    ) 