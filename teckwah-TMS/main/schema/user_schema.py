"""
사용자 관리 관련 스키마
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class UserBase(BaseModel):
    """사용자 기본 스키마"""
    user_id: str = Field(..., description="사용자 ID")
    user_name: str = Field(..., description="사용자 이름")
    user_department: str = Field(..., description="부서")
    user_role: str = Field(..., description="권한", example="ADMIN 또는 USER")

class UserCreate(UserBase):
    """사용자 생성 스키마"""
    user_password: str = Field(..., description="비밀번호")

class UserUpdate(UserBase):
    """사용자 수정 스키마"""
    user_password: Optional[str] = Field(None, description="비밀번호 (변경 시에만 입력)")

class UserResponse(UserBase):
    """사용자 응답 스키마"""
    user_status: str = Field(..., description="상태", example="ACTIVE 또는 INACTIVE")
    created_at: datetime = Field(..., description="생성 일시")
    updated_at: Optional[datetime] = Field(None, description="수정 일시")
    updated_by: Optional[str] = Field(None, description="수정자 ID")

    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    """사용자 목록 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="메시지")
    data: List[UserResponse] = Field(..., description="사용자 목록")
    pagination: dict = Field(..., description="페이지네이션 정보")

class UserPasswordReset(BaseModel):
    """비밀번호 초기화 요청 스키마"""
    user_id: str = Field(..., description="사용자 ID")

class UserStatusToggle(BaseModel):
    """사용자 상태 변경 요청 스키마"""
    user_id: str = Field(..., description="사용자 ID")
