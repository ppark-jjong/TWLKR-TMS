"""
인수인계 모델
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from pydantic import Field
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import relationship
from sqlalchemy import Enum
from enum import Enum as PyEnum

from backend.database import Base
from backend.models.model_config import APIModel
from backend.schemas.dashboard_schema import LockStatus


class Handover(Base):
    """인수인계 DB 모델"""

    __tablename__ = "handover"

    handover_id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("dashboard.dashboard_id"), nullable=False)
    item_name = Column(String(255), nullable=False)
    item_code = Column(String(50), nullable=True)
    quantity = Column(Integer, nullable=False)
    status = Column(
        Enum(HandoverStatus), nullable=False, default=HandoverStatus.REQUESTED
    )
    request_time = Column(DateTime, default=func.now())
    requester_id = Column(String(50), ForeignKey("user.user_id"), nullable=False)
    processor_id = Column(String(50), ForeignKey("user.user_id"), nullable=True)
    process_start_time = Column(DateTime, nullable=True)
    process_end_time = Column(DateTime, nullable=True)
    remark = Column(Text, nullable=True)
    updated_by = Column(String(50), nullable=True)
    update_at = Column(DateTime, onupdate=func.now())
    is_locked = Column(Boolean, default=False)

    # 관계 설정
    requester = relationship("User", foreign_keys=[requester_id])
    processor = relationship("User", foreign_keys=[processor_id])
    order = relationship("Dashboard")


# API 요청/응답 모델
class HandoverCreate(APIModel):
    title: str = Field(..., description="제목")
    content: str = Field(..., description="내용")
    is_notice: Optional[bool] = Field(
        False, description="공지사항 여부", alias="isNotice"
    )


class HandoverUpdate(APIModel):
    title: Optional[str] = Field(None, description="제목")
    content: Optional[str] = Field(None, description="내용")
    is_notice: Optional[bool] = Field(
        None, description="공지사항 여부", alias="isNotice"
    )


class HandoverResponse(APIModel):
    handover_id: int = Field(..., alias="handoverId")
    title: str
    content: str
    update_by: str = Field(..., alias="updateBy")
    is_notice: bool = Field(..., alias="isNotice")
    create_at: datetime = Field(..., alias="createAt")
    update_at: datetime = Field(..., alias="updateAt")


class HandoverListResponseData(APIModel):
    """인수인계 목록 조회 응답 데이터 부분 모델"""

    items: List[HandoverResponse]
    total: int
    page: int
    limit: int
    notices: List[HandoverResponse]  # 공지사항 목록


class HandoverListResponse(APIModel):
    """인수인계 목록 조회 전체 응답 모델"""

    success: bool = True
    message: str = "인수인계 목록 조회 성공"
    data: HandoverListResponseData


class GetHandoverResponseData(HandoverResponse):
    """인수인계 상세 조회 응답 데이터 부분 모델 (락 정보 포함)"""

    locked_info: Optional[LockStatus] = Field(None, alias="lockedInfo")


class GetHandoverResponse(APIModel):
    """인수인계 상세 조회 전체 응답 모델"""

    success: bool = True
    message: str = "인수인계 조회 성공"
    data: GetHandoverResponseData


# 락/언락 응답은 Dashboard의 LockResponse 재사용 가능
# 기본 성공 응답은 Dashboard의 BasicSuccessResponse 재사용 가능


# HandoverStatus Enum 정의
class HandoverStatus(str, PyEnum):
    REQUESTED = "REQUESTED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
