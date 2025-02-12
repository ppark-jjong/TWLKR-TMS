# backend/app/schemas/visualization_schema.py
from pydantic import BaseModel, Field
from datetime import date
from typing import List
from enum import Enum


class ChartType(str, Enum):
    DELIVERY_STATUS = "배송 현황"
    HOURLY_ORDERS = "시간별 접수량"


class DateRange(BaseModel):
    start_date: date
    end_date: date


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
