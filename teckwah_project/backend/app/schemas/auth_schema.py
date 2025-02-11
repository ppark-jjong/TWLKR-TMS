from pydantic import BaseModel, Field
from .common_schema import UserDepartment, UserRole

class LoginRequest(BaseModel):
    user_id: str = Field(..., description="사용자 ID")
    password: str = Field(..., description="비밀번호")

class UserResponse(BaseModel):
    user_id: str
    user_department: UserDepartment
    user_role: UserRole

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class LogoutRequest(BaseModel):
    refresh_token: str

class LogoutResponse(BaseModel):
    message: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str