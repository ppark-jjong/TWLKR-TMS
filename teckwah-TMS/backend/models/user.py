"""
사용자 모델
"""

from sqlalchemy import Column, String, Enum
from enum import Enum as PyEnum
from pydantic import BaseModel, Field
from typing import Optional

from backend.database import Base


class UserRole(str, PyEnum):
    """사용자 권한 유형"""

    ADMIN = "ADMIN"
    USER = "USER"


class Department(str, PyEnum):
    """부서 유형"""

    총무 = "총무"
    회계 = "회계"
    인사 = "인사"
    영업 = "영업"
    개발 = "개발"


class User(Base):
    """사용자 DB 모델"""

    __tablename__ = "user"

    user_id = Column(String(50), primary_key=True)
    user_password = Column(String(255), nullable=False)
    user_department = Column(
        Enum(*[dept.value for dept in Department], name="department_enum"),
        nullable=False,
    )
    user_role = Column(
        Enum(*[role.value for role in UserRole], name="role_enum"), nullable=False
    )


# API 모델 (Pydantic)
class UserCreate(BaseModel):
    """사용자 생성 모델"""

    user_id: str = Field(..., description="사용자 ID")
    user_password: str = Field(..., description="비밀번호")
    user_department: Department = Field(..., description="부서")
    user_role: UserRole = Field(UserRole.USER, description="권한")


class UserUpdate(BaseModel):
    """사용자 수정 모델"""

    user_password: Optional[str] = Field(None, description="비밀번호")
    user_department: Optional[Department] = Field(None, description="부서")
    user_role: Optional[UserRole] = Field(None, description="권한")


class UserResponse(BaseModel):
    """사용자 응답 모델"""

    user_id: str = Field(..., description="사용자 ID", alias="userId")
    user_department: Department = Field(..., description="부서", alias="userDepartment")
    user_role: UserRole = Field(..., description="권한", alias="userRole")

    class Config:
        orm_mode = True
        allow_population_by_field_name = True
