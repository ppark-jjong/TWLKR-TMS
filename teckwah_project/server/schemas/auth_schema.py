# teckwah_project/server/schemas/auth_schema.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from enum import Enum
from datetime import datetime


class UserDepartment(str, Enum):
    """사용자 부서 정의"""

    CS = "CS"
    HES = "HES"
    LENOVO = "LENOVO"


class UserRole(str, Enum):
    """사용자 권한 정의"""

    ADMIN = "ADMIN"
    USER = "USER"


class UserLogin(BaseModel):
    """로그인 요청 스키마"""

    user_id: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)


class UserCreate(BaseModel):
    user_id: str = Field(..., min_length=3, max_length=50, description="사용자 ID")
    password: str = Field(..., min_length=4, description="비밀번호")
    department: str = Field(..., description="부서 (CS, HES, LENOVO)")
    role: str = Field("USER", description="권한 (ADMIN, USER)")


class Token(BaseModel):
    """토큰 응답 스키마"""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None


class TokenData(BaseModel):
    """토큰 페이로드 스키마"""

    user_id: str
    department: str
    role: str
    exp: Optional[int] = None


class RefreshTokenRequest(BaseModel):
    """리프레시 토큰 요청 스키마"""

    refresh_token: str


class LogoutRequest(BaseModel):
    """로그아웃 요청 스키마"""

    refresh_token: str


class UserResponse(BaseModel):
    """사용자 정보 응답 스키마"""

    user_id: str
    department: str
    role: str
    
    model_config = ConfigDict(from_attributes=True)


class RefreshTokenDB(BaseModel):
    """리프레시 토큰 DB 스키마"""

    refresh_token_id: int
    user_id: str
    refresh_token: str
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    """로그인 응답 통합 스키마"""

    user: UserResponse
    token: Token

    class Config:
        from_attributes = True


class ApiResponse(BaseModel):
    """공통 API 응답 스키마"""

    success: bool
    message: str
    data: Optional[dict] = None


class UserList(BaseModel):
    users: List[UserResponse]
