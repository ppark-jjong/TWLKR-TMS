from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, func, Index, Computed
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import expression

Base = declarative_base()

class HandoverRecord(Base):
    """
    인수인계 레코드 모델
    """
    __tablename__ = "handover"

    handover_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, onupdate=func.now(), nullable=True)
    # SQL의 STORED GENERATED COLUMN과 매핑
    effective_date = Column(DateTime, Computed("COALESCE(updated_at, created_at)"))
    created_by = Column(String(50), ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)

    # 날짜별 정렬을 위한 인덱스
    __table_args__ = (
        Index('idx_date_sort', effective_date),
    ) 