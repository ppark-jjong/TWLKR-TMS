from pydantic import BaseModel, Field
from .common_schema import UserRole, UserDepartment

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
    user: UserResponse

class LogoutRequest(BaseModel):
    session_id: str
