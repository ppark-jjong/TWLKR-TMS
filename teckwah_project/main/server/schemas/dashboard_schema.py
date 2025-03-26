# teckwah_project/main/server/schemas/dashboard_schema.py
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from .common_schema import BaseResponse, DateRangeInfo
from enum import Enum


# 배송 타입 정의
class DeliveryType(str, Enum):
    DELIVERY = "DELIVERY"
    RETURN = "RETURN"


class RemarkResponse(BaseModel):
    """대시보드 메모 응답 스키마"""
    remark_id: int
    dashboard_id: int
    content: str
    created_at: datetime
    created_by: str
    formatted_content: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)



class RemarkUpdate(BaseModel):
    """메모 업데이트 요청 스키마"""

    content: str = Field(max_length=2000, description="변경할 메모 내용")


# 배송 상태 정의
class DeliveryStatus(str, Enum):
    WAITING = "WAITING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETE = "COMPLETE"
    ISSUE = "ISSUE"
    CANCEL = "CANCEL"


# 부서 정의
class Department(str, Enum):
    CS = "CS"
    HES = "HES"
    LENOVO = "LENOVO"


# 창고 정의
class Warehouse(str, Enum):
    SEOUL = "SEOUL"
    BUSAN = "BUSAN"
    GWANGJU = "GWANGJU"
    DAEJEON = "DAEJEON"


# 기본 대시보드 필드
class DashboardBase(BaseModel):
    """대시보드 기본 필드 스키마"""
    type: DeliveryType
    warehouse: Warehouse
    order_no: str
    eta: datetime

# 생성 요청
class DashboardCreate(DashboardBase):
    """대시보드 생성 요청 스키마"""
    sla: str
    postal_code: str
    address: str
    customer: str
    contact: Optional[str] = None

# 기본 응답
class DashboardResponse(DashboardBase):
    """대시보드 기본 응답 스키마"""
    dashboard_id: int
    department: Department
    status: DeliveryStatus
    driver_name: Optional[str] = None
    create_time: datetime
    depart_time: Optional[datetime] = None
    customer: str
    region: Optional[str] = None
    sla: str

    model_config = ConfigDict(from_attributes=True)


# 상세 응답 (기본 응답 확장)
class DashboardDetail(DashboardResponse):
    """대시보드 상세 응답 스키마"""
    driver_contact: Optional[str] = None
    complete_time: Optional[datetime] = None
    address: str
    postal_code: str
    distance: Optional[int] = None
    duration_time: Optional[int] = None
    customer: str
    contact: Optional[str] = None
    remarks: List[RemarkResponse] = Field(default_factory=list)
    city: Optional[str] = None
    county: Optional[str] = None
    district: Optional[str] = None
    sla: str
    is_locked: bool = False
    locked_by: Optional[str] = None
    lock_type: Optional[str] = None
    lock_expires_at: Optional[str] = None



# 목록 데이터
class DashboardListData(BaseModel):
    """대시보드 목록 데이터 스키마"""
    items: List[DashboardResponse]
    date_range: Dict[str, str]
    user_role: Optional[str] = None
    is_admin: Optional[bool] = False


# 목록 응답
class DashboardListResponse(BaseModel):
    """대시보드 목록 응답 스키마"""
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None

# 관리자 목록 응답
class AdminDashboardListResponse(BaseModel):
    """관리자용 대시보드 목록 응답 스키마"""
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None



# 상세 응답 - 락 정보 포함
class DashboardDetailResponse(BaseModel):
    """대시보드 상세 응답 스키마"""
    success: bool = True
    message: str
    data: Optional[DashboardDetail] = None
    postal_code_error: bool = False
    is_locked: bool = False
    lock_info: Optional[Dict[str, Any]] = None


# 락 관련 스키마
class LockRequest(BaseModel):
    """락 요청 스키마"""
    lock_type: str

class LockResponse(BaseModel):
    """락 응답 스키마"""
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None


# 상태 변경
class StatusUpdate(BaseModel):
    """상태 업데이트 요청 스키마"""
    status: DeliveryStatus
    is_admin: bool = False


# 필드 업데이트
class FieldsUpdate(BaseModel):
    """필드 업데이트 요청 스키마"""
    eta: Optional[datetime] = None
    customer: Optional[str] = None
    contact: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    
# 배차 처리
class DriverAssignment(BaseModel):
    """배차 처리 요청 스키마"""
    dashboard_ids: List[int]
    driver_name: str
    driver_contact: str