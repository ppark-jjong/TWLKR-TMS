# backend/app/schemas/visualization_schema.py
from pydantic import BaseModel, Field, validator
from datetime import date
from typing import List
from enum import Enum


class ChartType(str, Enum):
    DELIVERY_STATUS = "배송 현황"
    HOURLY_ORDERS = "시간별 접수량"


class DateRange(BaseModel):
    start_date: date
    end_date: date

    @validator("end_date")
    def validate_date_range(cls, v, values):
        if "start_date" in values:
            start = values["start_date"]
            if (v - start).days > 31:
                raise ValueError("조회 기간은 1개월을 초과할 수 없습니다")
            if v < start:
                raise ValueError("종료일은 시작일 이후여야 합니다")
        return v


class StatusData(BaseModel):
    status: str
    count: int
    percentage: float


class HourlyData(BaseModel):
    hour: int = Field(..., ge=0, le=23)
    count: int


class DeliveryStatusResponse(BaseModel):
    total_count: int
    status_breakdown: List[StatusData]


class HourlyOrdersResponse(BaseModel):
    total_count: int
    hourly_breakdown: List[HourlyData]


class VisualizationResponse(BaseModel):
    type: ChartType
    data: dict
