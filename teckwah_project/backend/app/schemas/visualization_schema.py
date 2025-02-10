"""시각화 관련 스키마"""
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime
from .common_schema import DeliveryStatus

class Period(BaseModel):
    """조회 기간"""
    start_date: str = Field(..., description="시작일 (YYYY-MM-DD)")
    end_date: str = Field(..., description="종료일 (YYYY-MM-DD)")

class StatusCount(BaseModel):
    """상태별 건수"""
    status: DeliveryStatus
    count: int
    ratio: float

class DeliveryStatusResponse(BaseModel):
    """배송 현황 응답"""
    total: int
    status_counts: List[StatusCount]
    period: Period

class HourlyCount(BaseModel):
    """시간대별 건수"""
    hour: int
    count: int

class HourlyVolumeResponse(BaseModel):
    """시간대별 접수량 응답"""
    total: int
    hourly_counts: List[HourlyCount]
    period: Period