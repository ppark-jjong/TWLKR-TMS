from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class HandoverCreate(BaseModel):
    """
    인수인계 생성 요청 스키마
    """
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)


class HandoverUpdate(BaseModel):
    """
    인수인계 수정 요청 스키마
    """
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)


class HandoverResponse(BaseModel):
    """
    인수인계 응답 스키마
    """
    handover_id: int
    title: str
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    effective_date: datetime
    created_by: str
    is_own: bool = False  # 본인 작성 여부
    is_locked: bool = False  # 락 여부
    locked_by: Optional[str] = None  # 락을 건 사용자

    class Config:
        from_attributes = True


class HandoverListResponse(BaseModel):
    """
    인수인계 목록 응답 스키마
    """
    date: str  # 날짜 그룹 (YYYY-MM-DD)
    records: List[HandoverResponse]


class HandoverLockRequest(BaseModel):
    """
    인수인계 락 요청 스키마
    """
    timeout: Optional[int] = 300  # 기본 타임아웃 5분(300초)


class HandoverLockResponse(BaseModel):
    """
    인수인계 락 응답 스키마
    """
    handover_id: int
    locked_by: str
    locked_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True


class HandoverApiResponse(BaseModel):
    """
    API 응답 형식
    """
    success: bool
    data: Optional[object] = None
    error_code: Optional[str] = None
    message: Optional[str] = None 