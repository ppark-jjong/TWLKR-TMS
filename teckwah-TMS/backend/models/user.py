"""
사용자 모델
"""

from sqlalchemy import Column, String, Enum
from enum import Enum as PyEnum
from pydantic import Field
from typing import Optional, Dict, Any

from backend.database import Base
from backend.models.model_config import APIModel


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
class UserCreate(APIModel):
    user_id: str = Field(..., description="사용자 ID", alias="userId")
    user_password: str = Field(..., description="사용자 비밀번호", alias="userPassword")
    user_department: Department = Field(..., description="소속 부서", alias="userDepartment")
    user_role: UserRole = Field(..., description="사용자 권한", alias="userRole")


class UserUpdate(APIModel):
    user_password: Optional[str] = Field(None, description="사용자 비밀번호", alias="userPassword")
    user_department: Optional[Department] = Field(None, description="소속 부서", alias="userDepartment")
    user_role: Optional[UserRole] = Field(None, description="사용자 권한", alias="userRole")


class UserResponse(APIModel):
    user_id: str = Field(..., description="사용자 ID", alias="userId")
    user_department: Department = Field(..., description="소속 부서", alias="userDepartment")
    user_role: UserRole = Field(..., description="사용자 권한", alias="userRole")