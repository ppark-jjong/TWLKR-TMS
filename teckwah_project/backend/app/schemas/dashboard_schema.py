# backend/app/schemas/dashboard_schema.py

from pydantic import BaseModel, Field
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

class DashboardDepartment(str, Enum):
    CS = "CS"
    HES = "HES"
    LENOVO = "LENOVO"

class DashboardWarehouse(str, Enum):
    SEOUL = "SEOUL"
    BUSAN = "BUSAN"
    GWANGJU = "GWANGJU"
    DAEJEON = "DAEJEON"

class DashboardSLA(str, Enum):
    XHR = "XHR"
    POX = "POX"
    EMC = "EMC"
    WEWORK = "WEWORK"
    LENOVO = "LENOVO"
    ETC = "ETC"

class DashboardCreate(BaseModel):
    type: DashboardType
    order_no: int
    department: DashboardDepartment
    warehouse: DashboardWarehouse
    sla: DashboardSLA
    eta: datetime
    postal_code: str
    address: str
    customer: str
    contact: str
    remark: Optional[str] = None

class DashboardUpdate(BaseModel):
    status: Optional[DashboardStatus] = None
    remark: Optional[str] = None
    driver_name: Optional[str] = None
    driver_contact: Optional[str] = None

class DashboardStatusUpdate(BaseModel):
    status: DashboardStatus

class DashboardRemarkUpdate(BaseModel):
    remark: str

class DashboardDriverUpdate(BaseModel):
    driver_name: str
    driver_contact: str
    dashboard_ids: List[int]

class DashboardResponse(BaseModel):
    dashboard_id: int
    type: DashboardType
    department: DashboardDepartment
    warehouse: DashboardWarehouse
    driver_name: Optional[str]
    order_no: int
    create_time: datetime
    depart_time: Optional[datetime]
    eta: datetime
    status: DashboardStatus
    region: Optional[str]

    class Config:
        from_attributes = True

class DashboardDetailResponse(BaseModel):
    dashboard_id: int
    type: DashboardType
    department: DashboardDepartment
    warehouse: DashboardWarehouse
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

class DateQuery(BaseModel):
    date: datetime = Field(..., description="YYYY-MM-DD format date for filtering")