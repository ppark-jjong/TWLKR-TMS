from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, func, Index, Boolean
from server.config.database import Base

class HandoverRecord(Base):
    """
    인수인계 레코드 모델
    """
    __tablename__ = "handover"

    handover_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    update_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    update_by = Column(String(50), ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    
    # 공지 관련 필드
    is_notice = Column(Boolean, default=False)
    
    # 날짜별 정렬을 위한 인덱스
    __table_args__ = (
        Index('idx_date_sort', update_at),
        Index('idx_notice', is_notice),
    ) 