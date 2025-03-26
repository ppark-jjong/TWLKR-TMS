# teckwah_project/main/server/schemas/memo_schema.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from .common_schema import BaseResponse


class MemoCreate(BaseModel):
    """메모 생성 요청 스키마"""

    content: str = Field(..., max_length=2000, description="메모 내용")


class MemoResponse(BaseModel):
    """메모 응답 스키마"""

    memo_id: int
    dashboard_id: int
    user_id: str
    user_department: str
    content: str
    formatted_content: str
    created_at: datetime

    class Config:
        from_attributes = True


class MemoListData(BaseModel):
    """메모 목록 데이터 스키마"""

    memos: List[MemoResponse]
    total_count: int


class MemoListResponse(BaseResponse):
    """메모 목록 응답 스키마"""

    data: Optional[MemoListData] = None
