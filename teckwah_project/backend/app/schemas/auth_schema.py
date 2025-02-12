# backend/app/schemas/auth_schema.py

from pydantic import BaseModel
from typing import Optional
from enum import Enum
from datetime import datetime


class UserDepartment(str, Enum):
    CS = "CS"
    HES = "HES"
    LENOVO = "LENOVO"


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    USER = "USER"


class UserLogin(BaseModel):
    user_id: str
    user_password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: str
    department: UserDepartment
    role: UserRole


class UserResponse(BaseModel):
    user_id: str
    user_department: UserDepartment
    user_role: UserRole

    class Config:
        from_attributes = True


class RefreshTokenResponse(BaseModel):
    refresh_token_id: int
    user_id: str
    refresh_token: str
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
