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


class Department(str, Enum):
    CS = "CS"
    HES = "HES"
    LENOVO = "LENOVO"


class Warehouse(str, Enum):
    SEOUL = "SEOUL"
    BUSAN = "BUSAN"
    GWANGJU = "GWANGJU"
    DAEJEON = "DAEJEON"



class DashboardCreate(BaseModel):
    type: DashboardType
    order_no: int = Field(..., gt=0, description="주문번호는 양의 정수여야 합니다")
    warehouse: Warehouse
    sla: str = Field(..., min_length=1, max_length=10, description="10자 이내의 SLA 문자열")
    eta: datetime
    postal_code: str = Field(..., min_length=5, max_length=5, pattern=r"^\d{5}$")
    address: str = Field(..., min_length=1)
    customer: Optional[str] = None
    contact: Optional[str] = Field(None, pattern=r"^\d{2,3}-\d{3,4}-\d{4}$")
    remark: Optional[str] = None

    @validator("eta")
    def validate_eta(cls, v):
        now = datetime.now()
        if v.replace(tzinfo=None) < now.replace(tzinfo=None):
            raise ValueError("ETA는 현재 시간 이후여야 합니다")
        return v
    
    @validator('sla')
    def validate_sla(cls, v):
        if not v.strip():
            raise ValueError('SLA는 비어있을 수 없습니다')
        return v.strip()


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
    driver_name: Optional[str] = None
    order_no: int
    create_time: datetime
    depart_time: Optional[datetime] = None
    eta: datetime
    status: DashboardStatus
    region: Optional[str] = None

    class Config:
        from_attributes = True


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


class DriverAssignment(BaseModel):
    dashboard_ids: List[int]
    driver_name: str
    driver_contact: str = Field(..., pattern=r"^\d{2,3}-\d{3,4}-\d{4}$")


class StatusUpdate(BaseModel):
    """상태 업데이트 요청 스키마"""

    status: DashboardStatus = Field(
        ..., description="변경할 상태", example="IN_PROGRESS"
    )


class RemarkUpdate(BaseModel):
    remark: str


class DashboardQuery(BaseModel):
    date: datetime = Field(..., description="YYYY-MM-DD format date for filtering")
