"""
인수인계 관련 스키마
"""

from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from backend.schemas.common_schema import PaginatedResponse
from backend.schemas.dashboard_schema import LockedInfo


class HandoverBase(BaseModel):
    """인수인계 기본 스키마"""

    title: str = Field(..., description="제목")
    content: str = Field(..., description="내용")
    is_notice: bool = Field(False, alias="isNotice", description="공지사항 여부")

    model_config = ConfigDict(populate_by_name=True)


class HandoverCreate(HandoverBase):
    """인수인계 생성 스키마"""

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "title": "인수인계 제목",
                "content": "인수인계 내용",
                "isNotice": False,
            }
        },
    )


class HandoverUpdate(BaseModel):
    """인수인계 수정 스키마"""

    title: Optional[str] = Field(None, description="제목")
    content: Optional[str] = Field(None, description="내용")
    is_notice: Optional[bool] = Field(
        None, alias="isNotice", description="공지사항 여부"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "title": "수정된 제목",
                "content": "수정된 내용",
                "isNotice": True,
            }
        },
    )


class HandoverResponse(HandoverBase):
    """인수인계 응답 스키마"""

    handover_id: int = Field(..., alias="handoverId", description="인수인계 ID")
    update_by: str = Field(..., alias="updateBy", description="작성자")
    create_at: datetime = Field(..., alias="createAt", description="생성 시간")
    update_at: datetime = Field(..., alias="updateAt", description="수정 시간")
    locked_info: Optional[LockedInfo] = Field(
        None, alias="lockedInfo", description="락 정보"
    )

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class HandoverListData(PaginatedResponse):
    """인수인계 목록 데이터 스키마"""

    items: List[HandoverResponse]
    notices: List[HandoverResponse] = Field([], description="공지사항 목록")

    model_config = ConfigDict(populate_by_name=True)


class HandoverList(BaseModel):
    """인수인계 목록 응답 스키마"""

    success: bool = Field(True, description="성공 여부")
    message: str = Field("데이터 조회 성공", description="응답 메시지")
    data: HandoverListData = Field(..., description="응답 데이터")

    model_config = ConfigDict(populate_by_name=True)
