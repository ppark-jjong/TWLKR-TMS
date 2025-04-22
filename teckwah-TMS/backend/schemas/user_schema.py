"""
사용자 관련 Pydantic 스키마
"""

from enum import Enum as PyEnum
from pydantic import Field, BaseModel
from typing import Optional, List

from backend.models.model_config import APIModel


class UserRole(str, PyEnum):
    ADMIN = "ADMIN"
    USER = "USER"


class Department(str, PyEnum):
    CS = "CS"
    HES = "HES"
    LENOVO = "LENOVO"


# API 요청/응답 모델
class UserCreate(APIModel):
    user_id: str = Field(..., description="사용자 ID", alias="userId")
    user_password: str = Field(..., description="사용자 비밀번호", alias="userPassword")
    user_department: Department = Field(
        ..., description="소속 부서", alias="userDepartment"
    )
    user_role: UserRole = Field(..., description="사용자 권한", alias="userRole")


class UserUpdate(APIModel):
    user_password: Optional[str] = Field(
        None, description="사용자 비밀번호", alias="userPassword"
    )
    user_department: Optional[Department] = Field(
        None, description="소속 부서", alias="userDepartment"
    )
    user_role: Optional[UserRole] = Field(
        None, description="사용자 권한", alias="userRole"
    )


class UserResponse(APIModel):
    user_id: str = Field(..., description="사용자 ID", alias="userId")
    user_department: Department = Field(
        ..., description="소속 부서", alias="userDepartment"
    )
    user_role: UserRole = Field(..., description="사용자 권한", alias="userRole")

    # ORM 모드 활성화
    model_config = {"from_attributes": True}


# 사용자 목록 조회 응답 모델 (페이지네이션 제거)
class UserListResponseData(APIModel):
    items: List[UserResponse]
    total: int
    # page: int # 제거
    # limit: int # 제거


class UserListResponse(APIModel):
    success: bool = True
    message: str = "사용자 목록 조회 성공"
    data: UserListResponseData
