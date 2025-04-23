"""
사용자 모델
"""

from sqlalchemy import Column, String, Enum
from sqlalchemy.orm import relationship
from backend.utils.database import Base


class User(Base):
    """사용자 테이블 모델"""
    __tablename__ = "user"

    user_id = Column(String(50), primary_key=True, index=True)
    user_password = Column(String(255), nullable=False)
    user_department = Column(Enum('CS', 'HES', 'LENOVO', name='user_department_enum'), nullable=False)
    user_role = Column(Enum('ADMIN', 'USER', name='user_role_enum'), nullable=False)

    # 관계 설정
    handovers = relationship("Handover", back_populates="user", cascade="all, delete-orphan")
