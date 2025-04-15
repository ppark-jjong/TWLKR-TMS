"""
사용자 모델
"""

from sqlalchemy import Column, String, Enum
from enum import Enum as PyEnum
from pydantic import BaseModel, Field
from typing import Optional

from backend.database import Base


class UserRole(str, PyEnum):
    ADMIN = "ADMIN"
    USER = "USER"


class Department(str, PyEnum):
    CS = "CS"
    HES = "HES"
    LENOVO = "LENOVO"


class User(Base):
    """사용자 DB 모델"""

    __tablename__ = "user"

    user_id = Column(String(50), primary_key=True)
    user_password = Column(String(255), nullable=False)
    user_department = Column(
        Enum("CS", "HES", "LENOVO", name="department_enum"), nullable=False
    )
    user_role = Column(Enum("ADMIN", "USER", name="role_enum"), nullable=False)


# API 요청/응답 모델
class UserCreate(BaseModel):
    user_id: str = Field(..., description="사용자 ID")
    user_password: str = Field(..., description="사용자 비밀번호")
    user_department: Department = Field(..., description="소속 부서")
    user_role: UserRole = Field(..., description="사용자 권한")


class UserResponse(BaseModel):
    user_id: str = Field(..., description="사용자 ID")
    user_department: Department = Field(..., description="소속 부서")
    user_role: UserRole = Field(..., description="사용자 권한")

    class Config:
        from_attributes = True
