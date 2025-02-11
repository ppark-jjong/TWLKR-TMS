# backend/app/schemas/visualization_schema.py

from pydantic import BaseModel
from datetime import datetime, date
from typing import List, Dict, Any
from enum import Enum

class VisualizationType(str, Enum):
    DELIVERY_STATUS = "배송 현황"
    HOURLY_ORDERS = "시간별 접수량"

class DateRangeQuery(BaseModel):
    start_date: date
    end_date: date

class StatusCount(BaseModel):
    status: str
    count: int
    percentage: float

class DeliveryStatusResponse(BaseModel):
    total_count: int
    status_breakdown: List[StatusCount]

class HourlyOrderCount(BaseModel):
    hour: int  # 0-23
    count: int

class HourlyOrderResponse(BaseModel):
    total_count: int
    hourly_breakdown: List[HourlyOrderCount]

class VisualizationResponse(BaseModel):
    type: VisualizationType
    data: Dict[str, Any]  # DeliveryStatusResponse 또는 HourlyOrderResponse의 데이터가 포함됨