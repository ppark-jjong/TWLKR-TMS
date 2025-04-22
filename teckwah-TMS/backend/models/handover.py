"""
인수인계 모델
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from pydantic import Field
from typing import Optional
from datetime import datetime

from backend.database import Base
from backend.models.model_config import APIModel


class Handover(Base):
    """인수인계 DB 모델"""

    __tablename__ = "handover"

    handover_id = Column(Integer, primary_key=True, autoincrement=True)
    is_locked = Column(Boolean, default=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    update_by = Column(
        String(50), ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False
    )
    is_notice = Column(Boolean, default=False)
    create_at = Column(DateTime, nullable=False)
    update_at = Column(DateTime, nullable=False)


# API 요청/응답 모델
class HandoverCreate(APIModel):
    title: str = Field(..., description="제목")
    content: str = Field(..., description="내용")
    is_notice: Optional[bool] = Field(False, description="공지사항 여부", alias="isNotice")


class HandoverUpdate(APIModel):
    title: Optional[str] = Field(None, description="제목")
    content: Optional[str] = Field(None, description="내용")
    is_notice: Optional[bool] = Field(None, description="공지사항 여부", alias="isNotice")


class HandoverResponse(APIModel):
    handover_id: int = Field(..., alias="handoverId")
    title: str
    content: str
    update_by: str = Field(..., alias="updateBy")
    is_notice: bool = Field(..., alias="isNotice")
    create_at: datetime = Field(..., alias="createAt")
    update_at: datetime = Field(..., alias="updateAt")