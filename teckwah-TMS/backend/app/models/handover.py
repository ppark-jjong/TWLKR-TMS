"""
인수인계 모델
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.database import Base

class Handover(Base):
    """인수인계 DB 모델"""
    __tablename__ = "handover"
    
    handover_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    update_by = Column(String(50), ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    is_notice = Column(Boolean, default=False)
    create_at = Column(DateTime, nullable=False)
    update_at = Column(DateTime, nullable=False)

# API 요청/응답 모델
class HandoverCreate(BaseModel):
    title: str = Field(..., description="제목")
    content: str = Field(..., description="내용")
    is_notice: Optional[bool] = Field(False, description="공지사항 여부")

class HandoverResponse(BaseModel):
    handover_id: int
    title: str
    content: str
    update_by: str
    is_notice: bool
    create_at: datetime
    update_at: datetime
    
    class Config:
        orm_mode = True
