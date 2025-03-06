# backend/app/schemas/visualization_schema.py (수정)

from pydantic import BaseModel
from typing import List, Dict, Optional, Any
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

    # 문자열에서 자동으로 변환할 수 있도록 __init__ 메서드 추가
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if isinstance(v, str):
            # 일반 시간대 형식 (예: "09-10")
            if "-" in v and "(" not in v:
                start, end = map(int, v.split("-"))
                return cls(label=v, start=start, end=end)
            # 야간 시간대 형식 (예: "야간(19-09)")
            elif "야간" in v:
                return cls(label=v, start=19, end=9)
        return v


class DeliveryStatusData(BaseModel):
    """배송 현황 전체 데이터"""

    type: str = "delivery_status"
    total_count: int
    department_breakdown: Dict[str, DepartmentStatusData]


class HourlyOrdersData(BaseModel):
    """시간대별 접수량 전체 데이터"""

    type: str = "hourly_orders"
    total_count: int
    average_count: Optional[float] = 0
    department_breakdown: Dict[str, DepartmentHourlyData]
    time_slots: List[TimeSlot]


class DeliveryStatusResponse(BaseResponse):
    """배송 현황 응답"""

    data: Optional[DeliveryStatusData] = None
    date_range: Optional[Dict[str, str]] = None


class HourlyOrdersResponse(BaseResponse):
    """시간대별 접수량 응답"""

    data: Optional[HourlyOrdersData] = None
    date_range: Optional[Dict[str, str]] = None


class VisualizationDateRangeResponse(BaseResponse):
    """시각화 날짜 범위 응답"""

    date_range: Optional[Dict[str, str]] = None
