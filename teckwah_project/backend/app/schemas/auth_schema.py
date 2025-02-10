"""인증 관련 스키마"""
from pydantic import BaseModel, Field
from typing import Optional
from .common_schema import UserRole, UserDepartment

class LoginRequest(BaseModel):
    """로그인 요청 스키마"""
    user_id: str = Field(..., description="사용자 ID")
    password: str = Field(..., description="비밀번호")

class TokenResponse(BaseModel):
    """토큰 응답 스키마"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    """사용자 정보 응답 스키마"""
    user_id: str
    user_department: UserDepartment
    user_role: UserRole

    class Config:
        from_attributes = True

class LoginResponse(TokenResponse):
    """로그인 응답 스키마"""
    user: UserResponse

class LogoutRequest(BaseModel):
    """로그아웃 요청 스키마"""
    refresh_token: str

class RefreshTokenRequest(BaseModel):
    """리프레시 토큰 요청 스키마"""
    refresh_token: str