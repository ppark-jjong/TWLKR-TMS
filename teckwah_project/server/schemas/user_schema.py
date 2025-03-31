# teckwah_project/server/schemas/user_schema.py
from pydantic import BaseModel, Field, constr, validator
from typing import List, Optional, Literal, constr
from server.schemas.auth_schema import UserResponse


class UserBase(BaseModel):
    """사용자 기본 스키마"""

    user_id: constr(min_length=3, max_length=50) = Field(
        ..., description="사용자 ID (최소 3자, 최대 50자)"
    )
    user_department: Literal["CS", "HES", "LENOVO"] = Field(
        ..., description="소속 부서"
    )
    user_role: Literal["ADMIN", "USER"] = Field(..., description="사용자 권한")


class UserCreate(UserBase):
    """사용자 생성 스키마"""

    user_password: constr(min_length=6) = Field(
        ..., description="비밀번호 (최소 6자)"
    )


class UserUpdate(BaseModel):
    """사용자 수정 스키마"""

    user_department: Optional[Literal["CS", "HES", "LENOVO"]] = Field(
        None, description="소속 부서"
    )
    user_role: Optional[Literal["ADMIN", "USER"]] = Field(None, description="사용자 권한")
    user_password: Optional[constr(min_length=6)] = Field(
        None, description="새 비밀번호 (최소 6자)"
    )

    @validator("*", pre=True)
    def not_empty_string(cls, v, values, **kwargs):
        if v == "":
            return None
        return v


class UserListResponse(BaseModel):
    """사용자 목록 응답 스키마"""

    users: List[UserResponse] = Field(..., description="사용자 목록") 