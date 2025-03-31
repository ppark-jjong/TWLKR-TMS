# teckwah_project/server/schemas/dashboard_schema.py
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from server.schemas.common_schema import ApiResponse


# 열거형 정의
class DeliveryType(str, Enum):
    DELIVERY = "DELIVERY"
    RETURN = "RETURN"


class DeliveryStatus(str, Enum):
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


# 입력 스키마 (생성 및 업데이트)
class DashboardCreate(BaseModel):
    """대시보드 생성 요청 스키마"""

    order_no: str = Field(..., min_length=1, max_length=15)
    type: DeliveryType
    department: Department
    warehouse: Warehouse
    sla: str = Field(..., min_length=1, max_length=10)
    eta: datetime
    postal_code: str = Field(..., min_length=5, max_length=5)
    address: str = Field(..., min_length=1, max_length=500)
    customer: str = Field(..., min_length=1, max_length=150)
    contact: Optional[str] = Field(None, min_length=1, max_length=20)
    remark: Optional[str] = Field(None, max_length=1000)


class DashboardUpdate(BaseModel):
    """대시보드 업데이트 요청 스키마"""

    order_no: Optional[str] = Field(None, min_length=1, max_length=15)
    type: Optional[DeliveryType] = None
    warehouse: Optional[Warehouse] = None
    eta: Optional[datetime] = None
    sla: Optional[str] = Field(None, min_length=1, max_length=10)
    postal_code: Optional[str] = Field(None, min_length=5, max_length=5)
    address: Optional[str] = Field(None, min_length=1, max_length=500)
    customer: Optional[str] = Field(None, min_length=1, max_length=150)
    contact: Optional[str] = Field(None, min_length=1, max_length=20)
    remark: Optional[str] = Field(None, max_length=1000)


class StatusUpdate(BaseModel):
    """상태 업데이트 요청 스키마"""

    status: DeliveryStatus
    is_admin: bool = False


class DriverAssignment(BaseModel):
    """배차 처리 요청 스키마"""

    dashboard_ids: List[int]
    driver_name: str
    driver_contact: str


# 응답 스키마
class DashboardListItem(BaseModel):
    """대시보드 목록 항목 스키마"""

    dashboard_id: int
    order_no: str
    type: DeliveryType
    status: DeliveryStatus
    department: Department
    warehouse: Warehouse
    eta: datetime
    create_time: datetime
    depart_time: Optional[datetime] = None
    complete_time: Optional[datetime] = None
    customer: str
    region: Optional[str] = None
    driver_name: Optional[str] = None
    sla: str

    model_config = ConfigDict(from_attributes=True)


class DashboardDetail(BaseModel):
    """대시보드 상세 정보 스키마"""

    dashboard_id: int
    order_no: str
    type: DeliveryType
    status: DeliveryStatus
    department: Department
    warehouse: Warehouse
    sla: str
    eta: datetime
    create_time: datetime
    depart_time: Optional[datetime] = None
    complete_time: Optional[datetime] = None
    postal_code: str
    city: Optional[str] = None
    county: Optional[str] = None
    district: Optional[str] = None
    region: Optional[str] = None
    distance: Optional[int] = None
    duration_time: Optional[int] = None
    address: str
    customer: str
    contact: Optional[str] = None
    driver_name: Optional[str] = None
    driver_contact: Optional[str] = None
    remark: Optional[str] = None
    updated_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# 락 관련 스키마
class LockRequest(BaseModel):
    """락 요청 스키마"""

    lock_type: str = Field(..., description="락 유형 (EDIT, STATUS, ASSIGN)")


class MultipleLockRequest(BaseModel):
    """다중 락 요청 스키마"""

    dashboard_ids: List[int] = Field(..., description="대시보드 ID 목록")
    lock_type: str = Field(..., description="락 유형 (EDIT, STATUS, ASSIGN)")


# API 응답 스키마
class DashboardListResponse(ApiResponse[List[DashboardListItem]]):
    """대시보드 목록 응답 스키마"""

    pass


class DashboardDetailResponse(ApiResponse[DashboardDetail]):
    """대시보드 상세 정보 응답 스키마"""

    pass
