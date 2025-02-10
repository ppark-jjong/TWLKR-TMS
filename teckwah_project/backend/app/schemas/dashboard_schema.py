"""대시보드 관련 스키마"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from .common_schema import (
    DeliveryType,
    DeliveryStatus,
    UserDepartment,
    Warehouse,
    SLA
)

class DashboardCreate(BaseModel):
    """대시보드 생성 요청 스키마"""
    type: DeliveryType
    order_no: str
    warehouse: Warehouse
    sla: SLA
    eta: datetime
    postal_code: str
    address: str
    customer: str
    contact: str
    remark: Optional[str] = None

class DashboardListResponse(BaseModel):
    """대시보드 목록 응답 스키마"""
    dashboard_id: int
    type: DeliveryType
    department: UserDepartment
    warehouse: Warehouse
    driver_name: Optional[str]
    order_no: str
    create_time: datetime
    depart_time: Optional[datetime]
    eta: datetime
    status: DeliveryStatus
    region: str

    class Config:
        from_attributes = True

class DashboardStatusUpdate(BaseModel):
    """상태 업데이트 요청 스키마"""
    status: DeliveryStatus

class DashboardRemarkUpdate(BaseModel):
    """메모 업데이트 요청 스키마"""
    remark: str

class DashboardDriverAssign(BaseModel):
    """기사 배차 요청 스키마"""
    dashboard_ids: List[int]
    driver_id: int
    driver_remark: Optional[str] = None

class DashboardDetailResponse(BaseModel):
    """대시보드 상세 정보 응답 스키마"""
    dashboard_id: int
    type: DeliveryType
    department: UserDepartment
    warehouse: Warehouse
    driver_name: Optional[str]
    driver_contact: Optional[str]
    driver_remark: Optional[str]
    order_no: str
    eta: datetime
    status: DeliveryStatus
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

class DriverAssignmentResult(BaseModel):
    """기사 배차 결과"""
    success: List[int]
    failed: List[Dict[str, str]]

class DashboardResponse(BaseModel):
    """API 응답 스키마"""
    success: bool
    message: str
    data: Optional[DriverAssignmentResult] = None

class DashboardDeleteRequest(BaseModel):
    """대시보드 삭제 요청"""
    dashboard_ids: List[int]

class DashboardDeleteResponse(BaseModel):
    """대시보드 삭제 응답"""
    success: bool
    message: str
    deleted_count: int