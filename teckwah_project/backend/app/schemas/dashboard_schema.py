# backend/app/schemas/dashboard_schema.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum
from .common_schema import BaseResponse, DateRangeInfo
from app.utils.datetime_helper import KST

class DashboardType(str, Enum):
    DELIVERY = "DELIVERY"
    RETURN = "RETURN"

class DashboardStatus(str, Enum):
    WAITING = "WAITING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETE = "COMPLETE"
    ISSUE = "ISSUE"
    CANCEL = "CANCEL"

class DepartmentType(str, Enum):
    CS = "CS"
    HES = "HES"
    LENOVO = "LENOVO"

class WarehouseType(str, Enum):
    SEOUL = "SEOUL"
    BUSAN = "BUSAN"
    GWANGJU = "GWANGJU"
    DAEJEON = "DAEJEON"

class DashboardCreate(BaseModel):
    type: DashboardType
    order_no: int
    warehouse: WarehouseType
    sla: str = Field(max_length=10)
    eta: datetime
    postal_code: str = Field(min_length=5, max_length=5)
    address: str
    customer: Optional[str] = Field(None, max_length=50)
    contact: Optional[str] = None
    remark: Optional[str] = Field(None, max_length=2000)

class DashboardResponse(BaseModel):
    dashboard_id: int
    type: DashboardType
    department: DepartmentType
    warehouse: WarehouseType
    driver_name: Optional[str] = None
    order_no: int
    create_time: datetime
    depart_time: Optional[datetime] = None
    eta: datetime
    status: DashboardStatus
    region: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, json_encoders={
        datetime: lambda v: v.astimezone(KST).isoformat()
    })

class DashboardDetail(BaseModel):
    dashboard_id: int
    type: DashboardType
    department: DepartmentType
    warehouse: WarehouseType
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

    model_config = ConfigDict(from_attributes=True, json_encoders={
        datetime: lambda v: v.astimezone(KST).isoformat()
    })

class StatusUpdate(BaseModel):
    status: DashboardStatus

class RemarkUpdate(BaseModel):
    remark: str = Field(max_length=2000)

class DriverAssignment(BaseModel):
    dashboard_ids: List[int]
    driver_name: str = Field(min_length=1, max_length=50)