"""
인수인계 모델
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from main.utils.database import Base


class Handover(Base):
    """인수인계 테이블 모델"""

    __tablename__ = "handover"

    id = Column(Integer, primary_key=True, autoincrement=True)  # handover_id 대신 id로 변경
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    writer_id = Column(  # update_by 대신 writer_id로 변경
        String(50), ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False
    )
    writer = Column(String(50), nullable=False)  # 작성자 이름 추가
    is_notice = Column(Boolean, default=False)
    created_at = Column(DateTime, nullable=False, default=func.now())  # create_at 대신 created_at으로 변경
    updated_at = Column(  # update_at 대신 updated_at으로 변경
        DateTime, nullable=True, onupdate=func.now()
    )
    updated_by = Column(String(50), nullable=True)  # 수정자 추가
    is_locked = Column(Boolean, default=False)

    # 관계 설정
    user = relationship("User", back_populates="handovers")
