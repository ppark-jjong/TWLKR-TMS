# backend/app/schemas/dashboard_schema.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from .common_schema import BaseResponse, DateRangeInfo
from app.utils.constants import DeliveryType, DeliveryStatus, Department, Warehouse
from app.utils.datetime_helper import KST


# 기본 대시보드 필드
class DashboardBase(BaseModel):
    type: DeliveryType
    warehouse: Warehouse
    order_no: int = Field(gt=0, description="주문번호는 양의 정수여야 합니다")
    eta: datetime = Field(description="예상 도착 시간")


# 생성 요청
class DashboardCreate(DashboardBase):
    sla: str = Field(max_length=10, description="SLA(10자 이내)")
    postal_code: str = Field(
        min_length=5, max_length=5, pattern=r"^\d{5}$", description="5자리 우편번호"
    )
    address: str = Field(description="배송 주소")
    customer: Optional[str] = Field(None, max_length=50, description="수령인 이름")
    contact: Optional[str] = Field(
        None, pattern=r"^\d{2,3}-\d{3,4}-\d{4}$", description="연락처(xxx-xxxx-xxxx)"
    )
    remark: Optional[str] = Field(
        None, max_length=2000, description="메모(2000자 이내)"
    )


# 기본 응답
class DashboardResponse(DashboardBase):
    dashboard_id: int
    department: Department
    driver_name: Optional[str] = None
    create_time: datetime
    depart_time: Optional[datetime] = None
    status: DeliveryStatus
    region: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: lambda v: v.astimezone(KST).isoformat()},
    )


# 상세 응답 (기본 응답 확장)
class DashboardDetail(DashboardResponse):
    driver_contact: Optional[str] = None
    complete_time: Optional[datetime] = None
    address: str
    distance: Optional[int] = None
    duration_time: Optional[int] = None
    customer: Optional[str] = None
    contact: Optional[str] = None
    remark: Optional[str] = None


# 목록 데이터
class DashboardListData(BaseModel):
    items: List[DashboardResponse]
    date_range: DateRangeInfo

    model_config = ConfigDict(from_attributes=True)


# 상태 변경
class StatusUpdate(BaseModel):
    status: DeliveryStatus = Field(description="변경할 상태")


# 메모 변경
class RemarkUpdate(BaseModel):
    remark: str = Field(max_length=2000, description="변경할 메모")


# 배차 처리
class DriverAssignment(BaseModel):
    dashboard_ids: List[int] = Field(description="대시보드 ID 목록")
    driver_name: str = Field(
        min_length=1, max_length=50, description="배송 담당자 이름"
    )
    driver_contact: str = Field(
        pattern=r"^\d{2,3}-\d{3,4}-\d{4}$", description="배송 담당자 연락처"
    )
