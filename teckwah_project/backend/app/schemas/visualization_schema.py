# backend/app/schemas/visualization_schema.py
from pydantic import BaseModel, Field, validator
from datetime import date
from typing import List
from enum import Enum


class ChartType(str, Enum):
    DELIVERY_STATUS = "delivery_status"
    HOURLY_ORDERS = "hourly_orders"


class StatusData(BaseModel):
    status: str
    count: int
    percentage: float


class HourlyData(BaseModel):
    hour: int = Field(..., ge=0, le=23)
    count: int


class DeliveryStatusResponse(BaseModel):
    type: str = "delivery_status"
    total_count: int
    status_breakdown: List[StatusData]


class HourlyOrdersResponse(BaseModel):
    type: str = "hourly_orders"
    total_count: int
    hourly_breakdown: List[HourlyData]


class DateRange(BaseModel):
    start_date: date
    end_date: date

    @validator("end_date")
    def validate_dates(cls, end_date, values):
        if "start_date" in values and end_date < values["start_date"]:
            raise ValueError("종료일은 시작일 이후여야 합니다")
        if end_date > date.today():
            raise ValueError("미래 날짜는 조회할 수 없습니다")
        return end_date
