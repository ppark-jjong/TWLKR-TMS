"""
인수인계 관련 스키마
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class HandoverBase(BaseModel):
    """인수인계 기본 스키마"""
    title: str = Field(..., description="제목")
    content: str = Field(..., description="내용")
    is_notice: bool = Field(False, description="공지사항 여부")

class HandoverCreate(HandoverBase):
    """인수인계 생성 스키마"""
    pass

class HandoverUpdate(HandoverBase):
    """인수인계 수정 스키마"""
    pass

class HandoverResponse(HandoverBase):
    """인수인계 응답 스키마"""
    id: int = Field(..., description="인수인계 ID")
    writer_id: str = Field(..., description="작성자 ID")
    writer: str = Field(..., description="작성자 이름")
    created_at: datetime = Field(..., description="생성 일시")
    updated_at: Optional[datetime] = Field(None, description="수정 일시")
    updated_by: Optional[str] = Field(None, description="수정자 ID")

    class Config:
        from_attributes = True
        
class HandoverDeleteResponse(BaseModel):
    """인수인계 삭제 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="메시지")

class HandoverListResponse(BaseModel):
    """인수인계 목록 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="메시지")
    data: List[HandoverResponse] = Field(..., description="인수인계 목록")
    pagination: dict = Field(..., description="페이지네이션 정보")
