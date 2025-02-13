# backend/app/schemas/dashboard_schema.py
from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List
from enum import Enum
import re


class DashboardType(str, Enum):
    DELIVERY = "DELIVERY"
    RETURN = "RETURN"


class DashboardStatus(str, Enum):
    WAITING = "WAITING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETE = "COMPLETE"
    ISSUE = "ISSUE"


class Department(str, Enum):
    CS = "CS"
    HES = "HES"
    LENOVO = "LENOVO"


class Warehouse(str, Enum):
    SEOUL = "SEOUL"
    BUSAN = "BUSAN"
    GWANGJU = "GWANGJU"
    DAEJEON = "DAEJEON"


class SLAType(str, Enum):
    XHR = "XHR"
    POX = "POX"
    EMC = "EMC"
    WEWORK = "WEWORK"
    LENOVO = "LENOVO"
    ETC = "ETC"


class DashboardCreate(BaseModel):
    type: DashboardType
    order_no: int = Field(..., gt=0, description="주문번호는 양의 정수여야 합니다")
    warehouse: Warehouse
    sla: SLAType
    eta: datetime
    postal_code: str = Field(..., min_length=5, max_length=5, pattern=r"^\d{5}$")
    address: str = Field(..., min_length=1)
    customer: str = Field(..., min_length=1)
    contact: str = Field(..., pattern=r"^\d{2,3}-\d{3,4}-\d{4}$")
    remark: Optional[str] = None

    @validator("eta")
    def validate_eta(cls, v):
        # timezone 제거하고 naive datetime으로 비교
        now = datetime.now()
        if v.replace(tzinfo=None) < now.replace(tzinfo=None):
            raise ValueError("ETA는 현재 시간 이후여야 합니다")
        return v

    @validator("contact")
    def validate_contact(cls, v):
        if not re.match(r"^\d{2,3}-\d{3,4}-\d{4}$", v):
            raise ValueError("연락처 형식이 올바르지 않습니다 (예: 010-1234-5678)")
        return v


class DashboardUpdate(BaseModel):
    status: Optional[DashboardStatus] = None
    remark: Optional[str] = None
    driver_name: Optional[str] = None
    driver_contact: Optional[str] = None


class DashboardResponse(BaseModel):
    dashboard_id: int
    type: DashboardType
    department: Department
    warehouse: Warehouse
    driver_name: Optional[str]
    order_no: int
    create_time: datetime
    depart_time: Optional[datetime]
    eta: datetime
    status: DashboardStatus
    region: Optional[str]

    class Config:
        from_attributes = True


class DashboardDetail(BaseModel):
    dashboard_id: int
    type: DashboardType
    department: Department
    warehouse: Warehouse
    driver_name: Optional[str]
    driver_contact: Optional[str]
    order_no: int
    eta: datetime
    status: DashboardStatus
    create_time: datetime
    depart_time: Optional[datetime]
    complete_time: Optional[datetime]
    address: str
    distance: Optional[int]
    duration_time: Optional[int]
    customer: str
    contact: str
    remark: Optional[str]

    class Config:
        from_attributes = True


class DriverAssignment(BaseModel):
    dashboard_ids: List[int]
    driver_name: str
    driver_contact: str = Field(..., pattern=r"^\d{2,3}-\d{3,4}-\d{4}$")


class StatusUpdate(BaseModel):
    status: DashboardStatus


class RemarkUpdate(BaseModel):
    remark: str


class DashboardQuery(BaseModel):
    date: datetime = Field(..., description="YYYY-MM-DD format date for filtering")
