# backend/app/schemas/dashboard_schema.py
from pydantic import BaseModel, Field, validator, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum
from .common_schema import BaseResponse, DateRangeInfo


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


class DashboardCreate(BaseModel):
    """대시보드 생성 요청 스키마"""

    type: DashboardType = Field(..., description="배송 종류 (DELIVERY/RETURN)")
    order_no: int = Field(..., gt=0, description="주문번호는 양의 정수여야 합니다")
    warehouse: Warehouse = Field(..., description="출발 허브")
    sla: str = Field(
        ..., min_length=1, max_length=10, description="SLA(10자 이내 문자열)"
    )
    eta: datetime = Field(..., description="예상 도착 시간")
    postal_code: str = Field(
        ...,
        min_length=5,
        max_length=5,
        pattern="^[0-9]{5}$",
        description="5자리 우편번호",
    )
    address: str = Field(..., min_length=1, description="배송 주소")
    customer: Optional[str] = Field(
        None, max_length=50, description="수령인 이름(50자 이내)"
    )
    contact: Optional[str] = Field(
        None,
        pattern="^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}$",
        description="연락처(xxx-xxxx-xxxx)",
    )
    remark: Optional[str] = Field(
        None, max_length=2000, description="메모(2000자 이내)"
    )

    @validator("eta")
    def validate_eta(cls, v):
        if v.replace(tzinfo=None) < datetime.now().replace(tzinfo=None):
            raise ValueError("ETA는 현재 시간 이후여야 합니다")
        return v


class DashboardResponse(BaseModel):
    """대시보드 기본 응답 스키마"""

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

    model_config = ConfigDict(from_attributes=True)


class DashboardDetail(BaseModel):
    """대시보드 상세 정보 응답 스키마"""

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

    model_config = ConfigDict(from_attributes=True)


class StatusUpdate(BaseModel):
    """상태 업데이트 요청 스키마"""

    status: DashboardStatus = Field(..., description="변경할 상태")
    is_admin: bool = Field(default=False, description="관리자 권한 여부")


class RemarkUpdate(BaseModel):
    """메모 업데이트 요청 스키마"""

    remark: str = Field(..., max_length=2000, description="업데이트할 메모")


class DriverAssignment(BaseModel):
    """배차 정보 업데이트 요청 스키마"""

    dashboard_ids: List[int] = Field(..., description="대시보드 ID 목록")
    driver_name: str = Field(
        ..., min_length=1, max_length=50, description="배송 담당자 이름"
    )
    driver_contact: str = Field(
        ...,
        pattern="^[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}$",
        description="배송 담당자 연락처",
    )


class DashboardListData(BaseModel):
    """대시보드 목록 데이터"""

    date_range: DateRangeInfo
    items: List[DashboardResponse]


class DashboardListResponse(BaseResponse[DashboardListData]):
    """대시보드 목록 응답"""

    pass


class DashboardDetailResponse(BaseResponse[DashboardDetail]):
    """대시보드 상세 응답"""

    pass


class AdminDashboardListResponse(BaseResponse[DashboardListData]):
    """관리자 대시보드 목록 응답"""

    pass
