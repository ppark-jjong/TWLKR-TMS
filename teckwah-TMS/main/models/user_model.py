"""
사용자 모델
"""

from sqlalchemy import Column, String, Enum, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from main.utils.database import Base


class User(Base):
    """사용자 테이블 모델"""

    __tablename__ = "user"

    user_id = Column(String(50), primary_key=True, index=True)
    user_name = Column(String(50), nullable=False)  # 사용자 이름 추가
    user_password = Column(String(255), nullable=False)
    user_department = Column(
        Enum("CS", "HES", "LENOVO", name="user_department_enum"), nullable=False
    )
    user_role = Column(Enum("ADMIN", "USER", name="user_role_enum"), nullable=False)
    user_status = Column(Enum("ACTIVE", "INACTIVE", name="user_status_enum"), nullable=False, default="ACTIVE")  # 사용자 상태 추가
    created_at = Column(DateTime, nullable=False, default=func.now())  # 생성일시 추가
    created_by = Column(String(50), nullable=True)  # 생성자 추가
    updated_at = Column(DateTime, nullable=True, onupdate=func.now())  # 수정일시 추가
    updated_by = Column(String(50), nullable=True)  # 수정자 추가

    # 관계 설정
    handovers = relationship(
        "Handover", back_populates="user", cascade="all, delete-orphan"
    )
