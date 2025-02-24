# backend/app/schemas/visualization_schema.py
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
from enum import Enum
from .common_schema import BaseResponse, DateRangeInfo
from app.utils.datetime_helper import KST


class ChartType(str, Enum):
    DELIVERY_STATUS = "delivery_status"
    HOURLY_ORDERS = "hourly_orders"


class StatusData(BaseModel):
    """상태별 상세 정보"""

    status: str
    count: int
    percentage: float


class DepartmentStatusData(BaseModel):
    """부서별 상태 데이터"""

    total: int
    status_breakdown: List[StatusData]


class DepartmentHourlyData(BaseModel):
    """부서별 시간대 데이터"""

    total: int
    hourly_counts: Dict[str, int]


class TimeSlot(BaseModel):
    """시간대 정보"""

    label: str
    start: int
    end: Optional[int] = None


class DeliveryStatusData(BaseModel):
    """배송 현황 전체 데이터"""

    type: str = "delivery_status"
    total_count: int
    department_breakdown: Dict[str, DepartmentStatusData]

    class Config:
        json_encoders = {datetime: lambda v: v.astimezone(KST).isoformat()}


class HourlyOrdersData(BaseModel):
    """시간대별 접수량 전체 데이터"""

    type: str = "hourly_orders"
    total_count: int
    average_count: float
    department_breakdown: Dict[str, DepartmentHourlyData]
    time_slots: List[TimeSlot]

    class Config:
        json_encoders = {datetime: lambda v: v.astimezone(KST).isoformat()}


class DeliveryStatusResponse(BaseResponse[DeliveryStatusData]):
    """배송 현황 응답"""

    pass


class HourlyOrdersResponse(BaseResponse[HourlyOrdersData]):
    """시간대별 접수량 응답"""

    pass
