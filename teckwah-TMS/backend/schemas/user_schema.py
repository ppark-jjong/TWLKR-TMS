"""
사용자 관련 스키마
"""

from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum
from backend.schemas.common_schema import PaginatedResponse


class UserRole(str, Enum):
    """사용자 역할 Enum"""

    ADMIN = "ADMIN"
    USER = "USER"


class UserDepartment(str, Enum):
    """사용자 부서 Enum"""

    CS = "CS"
    HES = "HES"
    LENOVO = "LENOVO"


class UserBase(BaseModel):
    """사용자 기본 스키마"""

    user_id: str = Field(
        ..., alias="userId", min_length=3, max_length=50, description="사용자 ID"
    )
    user_department: UserDepartment = Field(
        ..., alias="userDepartment", description="사용자 부서"
    )

    model_config = ConfigDict(populate_by_name=True, use_enum_values=True)


class UserCreate(UserBase):
    """사용자 생성 스키마"""

    user_password: str = Field(
        ..., alias="userPassword", min_length=4, description="사용자 비밀번호"
    )
    user_role: UserRole = Field(
        UserRole.USER, alias="userRole", description="사용자 역할"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "userId": "user123",
                "userPassword": "password123",
                "userDepartment": "CS",
                "userRole": "USER",
            }
        },
    )


class UserUpdate(BaseModel):
    """사용자 수정 스키마"""

    user_password: Optional[str] = Field(
        None, alias="userPassword", min_length=4, description="사용자 비밀번호"
    )
    user_department: Optional[UserDepartment] = Field(
        None, alias="userDepartment", description="사용자 부서"
    )
    user_role: Optional[UserRole] = Field(
        None, alias="userRole", description="사용자 역할"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        json_schema_extra={
            "example": {
                "userPassword": "newpassword",
                "userDepartment": "HES",
                "userRole": "ADMIN",
            }
        },
    )


class UserResponse(UserBase):
    """사용자 응답 스키마"""

    user_role: UserRole = Field(..., alias="userRole", description="사용자 역할")

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        from_attributes=True,
        json_schema_extra={
            "example": {"userId": "user123", "userDepartment": "CS", "userRole": "USER"}
        },
    )


class UserList(PaginatedResponse):
    """사용자 목록 응답 스키마"""

    items: List[UserResponse]


class UserLogin(BaseModel):
    """사용자 로그인 스키마"""

    user_id: str = Field(..., alias="userId", description="사용자 ID")
    user_password: str = Field(..., alias="userPassword", description="사용자 비밀번호")

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {"userId": "user123", "userPassword": "password123"}
        },
    )


class SessionData(BaseModel):
    """세션 데이터 스키마"""

    user_id: str = Field(..., alias="userId", description="사용자 ID")
    user_role: str = Field(..., alias="userRole", description="사용자 역할")
    user_department: str = Field(..., alias="userDepartment", description="사용자 부서")
    expires_at: int = Field(..., alias="expiresAt", description="만료 시간(타임스탬프)")

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "userId": "user123",
                "userRole": "USER",
                "userDepartment": "CS",
                "expiresAt": 1678910283,
            }
        },
    )
