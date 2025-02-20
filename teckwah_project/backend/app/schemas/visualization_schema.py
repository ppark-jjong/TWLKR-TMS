# backend/app/schemas/visualization_schema.py
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional
from datetime import date
from enum import Enum
from .common_schema import BaseResponse, DateRangeInfo


class ChartType(str, Enum):
    DELIVERY_STATUS = "delivery_status"
    HOURLY_ORDERS = "hourly_orders"


class StatusData(BaseModel):
    """상태별 상세 정보"""

    status: str
    count: int
    percentage: float


class TimeSlot(BaseModel):
    """시간대 정보"""

    label: str
    start: int
    end: Optional[int] = None


class DepartmentStatusData(BaseModel):
    """부서별 상태 데이터"""

    total: int
    status_breakdown: List[StatusData]


class DepartmentHourlyData(BaseModel):
    """부서별 시간대 데이터"""

    total: int
    hourly_counts: Dict[str, int]
    average_per_hour: float


class DeliveryStatusData(BaseModel):
    """배송 현황 전체 데이터"""

    type: str = "delivery_status"
    total_count: int
    department_breakdown: Dict[str, DepartmentStatusData]
    date_range: DateRangeInfo


class HourlyOrdersData(BaseModel):
    """시간대별 접수량 전체 데이터"""

    type: str = "hourly_orders"
    total_count: int
    average_count: float
    department_breakdown: Dict[str, DepartmentHourlyData]
    time_slots: List[TimeSlot]
    date_range: DateRangeInfo


class DeliveryStatusResponse(BaseResponse[DeliveryStatusData]):
    """배송 현황 응답"""

    pass


class HourlyOrdersResponse(BaseResponse[HourlyOrdersData]):
    """시간대별 접수량 응답"""

    pass


class DateRange(BaseModel):
    """조회 기간"""

    start_date: date
    end_date: date

    @validator("end_date")
    def validate_dates(cls, end_date, values):
        if "start_date" in values and end_date < values["start_date"]:
            raise ValueError("종료일은 시작일 이후여야 합니다")
        if end_date > date.today():
            raise ValueError("미래 날짜는 조회할 수 없습니다")
        return end_date


class VisualizationDateRangeResponse(BaseResponse[DateRangeInfo]):
    """시각화 날짜 범위 응답"""

    pass
