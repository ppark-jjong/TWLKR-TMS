# backend/app/schemas/dashboard_schema.py

from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List
from enum import Enum


class DashboardType(str, Enum):
    DELIVERY = "DELIVERY"
    RETURN = "RETURN"


class DashboardStatus(str, Enum):
    WAITING = "WAITING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETE = "COMPLETE"
    ISSUE = "ISSUE"
    CANCEL = "CANCEL"


class Department(str, Enum):
    CS = "CS"
    HES = "HES"
    LENOVO = "LENOVO"


class Warehouse(str, Enum):
    SEOUL = "SEOUL"
    BUSAN = "BUSAN"
    GWANGJU = "GWANGJU"
    DAEJEON = "DAEJEON"


# 날짜 범위 요청 스키마
class DateRangeQuery(BaseModel):
    start_date: str = Field(..., description="시작일 (YYYY-MM-DD)")
    end_date: str = Field(..., description="종료일 (YYYY-MM-DD)")

    @validator("start_date", "end_date")
    def validate_date_format(cls, v):
        try:
            datetime.strptime(v, "%Y-%m-%d")
            return v
        except ValueError:
            raise ValueError("날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)")


# 상태 업데이트 요청 스키마
class StatusUpdate(BaseModel):
    status: DashboardStatus
    is_admin: bool = False


# 메모 업데이트 요청 스키마
class RemarkUpdate(BaseModel):
    remark: str


# 배차 정보 업데이트 요청 스키마
class DriverAssignment(BaseModel):
    dashboard_ids: List[int]
    driver_name: str = Field(..., min_length=1)
    driver_contact: str = Field(..., pattern=r"^\d{2,3}-\d{3,4}-\d{4}$")


# 날짜 범위 응답 스키마
class DateRangeResponse(BaseModel):
    oldest_date: str
    latest_date: str


# API 응답용 공통 스키마
class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


# 대시보드 응답 스키마
class DashboardResponse(BaseModel):
    dashboard_id: int
    type: DashboardType
    department: Department
    warehouse: Warehouse
    driver_name: Optional[str] = None
    order_no: int
    create_time: datetime
    depart_time: Optional[datetime] = None
    eta: datetime
    status: DashboardStatus
    region: Optional[str] = None

    class Config:
        from_attributes = True


# 대시보드 상세 정보 응답 스키마
class DashboardDetail(BaseModel):
    dashboard_id: int
    type: DashboardType
    department: Department
    warehouse: Warehouse
    driver_name: Optional[str] = None
    driver_contact: Optional[str] = None
    order_no: int
    eta: datetime
    status: DashboardStatus
    create_time: datetime
    depart_time: Optional[datetime] = None
    complete_time: Optional[datetime] = None
    address: str
    distance: Optional[int] = None
    duration_time: Optional[int] = None
    customer: Optional[str] = None
    contact: Optional[str] = None
    remark: Optional[str] = None

    class Config:
        from_attributes = True
