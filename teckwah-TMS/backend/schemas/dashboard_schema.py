"""
대시보드(주문) 관련 스키마
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, validator
from enum import Enum
from datetime import datetime
from backend.schemas.common_schema import PaginatedResponse


class OrderType(str, Enum):
    """주문 유형 Enum"""

    DELIVERY = "DELIVERY"
    RETURN = "RETURN"


class OrderStatus(str, Enum):
    """주문 상태 Enum"""

    WAITING = "WAITING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETE = "COMPLETE"
    ISSUE = "ISSUE"
    CANCEL = "CANCEL"


class Department(str, Enum):
    """부서 Enum"""

    CS = "CS"
    HES = "HES"
    LENOVO = "LENOVO"


class Warehouse(str, Enum):
    """창고 Enum"""

    SEOUL = "SEOUL"
    BUSAN = "BUSAN"
    GWANGJU = "GWANGJU"
    DAEJEON = "DAEJEON"


class DashboardBase(BaseModel):
    """대시보드 기본 스키마"""

    order_no: str = Field(..., alias="orderNo", description="주문 번호")
    type: OrderType = Field(..., description="주문 유형")
    department: Department = Field(..., description="부서")
    warehouse: Warehouse = Field(..., description="창고")
    sla: str = Field(..., description="SLA")
    eta: datetime = Field(..., description="도착 예정 시간")
    postal_code: str = Field(
        ..., alias="postalCode", min_length=4, max_length=5, description="우편번호"
    )
    address: str = Field(..., description="주소")
    customer: str = Field(..., description="고객명")
    contact: Optional[str] = Field(None, description="고객 연락처")

    @validator("postal_code")
    def validate_postal_code(cls, v):
        """우편번호 유효성 검사 및 보완"""
        if len(v) == 4:
            v = "0" + v
        return v

    model_config = ConfigDict(populate_by_name=True, use_enum_values=True)


class DashboardCreate(DashboardBase):
    """대시보드 생성 스키마"""

    status: OrderStatus = Field(OrderStatus.WAITING, description="주문 상태")
    driver_name: Optional[str] = Field(
        None, alias="driverName", description="기사 이름"
    )
    driver_contact: Optional[str] = Field(
        None, alias="driverContact", description="기사 연락처"
    )
    remark: Optional[str] = Field(None, description="비고")

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "orderNo": "ORD-20220101-001",
                "type": "DELIVERY",
                "department": "CS",
                "warehouse": "SEOUL",
                "sla": "D+1",
                "eta": "2022-01-01T15:00:00",
                "postalCode": "12345",
                "address": "서울시 강남구 테헤란로 123",
                "customer": "홍길동",
                "contact": "010-1234-5678",
                "driverName": "김기사",
                "driverContact": "010-9876-5432",
                "remark": "특이사항 없음",
            }
        },
    )


class DashboardUpdate(BaseModel):
    """대시보드 수정 스키마"""

    order_no: Optional[str] = Field(None, alias="orderNo", description="주문 번호")
    type: Optional[OrderType] = Field(None, description="주문 유형")
    status: Optional[OrderStatus] = Field(None, description="주문 상태")
    department: Optional[Department] = Field(None, description="부서")
    warehouse: Optional[Warehouse] = Field(None, description="창고")
    sla: Optional[str] = Field(None, description="SLA")
    eta: Optional[datetime] = Field(None, description="도착 예정 시간")
    postal_code: Optional[str] = Field(
        None, alias="postalCode", min_length=4, max_length=5, description="우편번호"
    )
    address: Optional[str] = Field(None, description="주소")
    customer: Optional[str] = Field(None, description="고객명")
    contact: Optional[str] = Field(None, description="고객 연락처")
    driver_name: Optional[str] = Field(
        None, alias="driverName", description="기사 이름"
    )
    driver_contact: Optional[str] = Field(
        None, alias="driverContact", description="기사 연락처"
    )
    remark: Optional[str] = Field(None, description="비고")

    @validator("postal_code")
    def validate_postal_code(cls, v):
        """우편번호 유효성 검사 및 보완"""
        if v is not None and len(v) == 4:
            v = "0" + v
        return v

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        json_schema_extra={
            "example": {
                "orderNo": "ORD-20220101-001",
                "type": "DELIVERY",
                "status": "IN_PROGRESS",
                "department": "CS",
                "warehouse": "SEOUL",
                "sla": "D+1",
                "eta": "2022-01-01T15:00:00",
                "postalCode": "12345",
                "address": "서울시 강남구 테헤란로 123",
                "customer": "홍길동",
                "contact": "010-1234-5678",
                "driverName": "김기사",
                "driverContact": "010-9876-5432",
                "remark": "특이사항 없음",
            }
        },
    )


class LockedInfo(BaseModel):
    """락 정보 스키마"""

    locked_by: Optional[str] = Field(
        None, alias="lockedBy", description="락 보유 사용자"
    )
    locked_at: Optional[datetime] = Field(
        None, alias="lockedAt", description="락 획득 시간"
    )
    editable: bool = Field(False, description="편집 가능 여부")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class DashboardResponse(DashboardBase):
    """대시보드 응답 스키마"""

    dashboard_id: int = Field(..., alias="dashboardId", description="대시보드 ID")
    status: OrderStatus = Field(..., description="주문 상태")
    create_time: datetime = Field(..., alias="createTime", description="생성 시간")
    depart_time: Optional[datetime] = Field(
        None, alias="departTime", description="출발 시간"
    )
    complete_time: Optional[datetime] = Field(
        None, alias="completeTime", description="완료 시간"
    )
    city: Optional[str] = Field(None, description="시/도")
    county: Optional[str] = Field(None, description="시/군/구")
    district: Optional[str] = Field(None, description="동/읍/면")
    region: Optional[str] = Field(None, description="지역")
    distance: Optional[int] = Field(None, description="거리(km)")
    duration_time: Optional[int] = Field(
        None, alias="durationTime", description="소요 시간(분)"
    )
    driver_name: Optional[str] = Field(
        None, alias="driverName", description="기사 이름"
    )
    driver_contact: Optional[str] = Field(
        None, alias="driverContact", description="기사 연락처"
    )
    updated_by: Optional[str] = Field(
        None, alias="updatedBy", description="최종 수정자"
    )
    remark: Optional[str] = Field(None, description="비고")
    update_at: Optional[datetime] = Field(
        None, alias="updateAt", description="최종 수정 시간"
    )
    locked_info: Optional[LockedInfo] = Field(
        None, alias="lockedInfo", description="락 정보"
    )

    model_config = ConfigDict(
        populate_by_name=True, from_attributes=True, use_enum_values=True
    )


class DashboardFilter(BaseModel):
    """대시보드 필터 스키마"""

    start_date: Optional[datetime] = Field(
        None, alias="startDate", description="시작 날짜"
    )
    end_date: Optional[datetime] = Field(None, alias="endDate", description="종료 날짜")
    status: Optional[OrderStatus] = Field(None, description="주문 상태")
    department: Optional[Department] = Field(None, description="부서")
    warehouse: Optional[Warehouse] = Field(None, description="창고")
    order_no: Optional[str] = Field(None, alias="orderNo", description="주문 번호")
    page: Optional[int] = Field(1, description="페이지 번호")
    limit: Optional[int] = Field(10, description="페이지당 항목 수")

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        json_schema_extra={
            "example": {
                "startDate": "2022-01-01T00:00:00",
                "endDate": "2022-01-02T23:59:59",
                "status": "WAITING",
                "department": "CS",
                "warehouse": "SEOUL",
                "orderNo": "ORD",
                "page": 1,
                "limit": 10,
            }
        },
    )


class StatusCount(BaseModel):
    """상태별 카운트 스키마"""

    WAITING: int = 0
    IN_PROGRESS: int = 0
    COMPLETE: int = 0
    ISSUE: int = 0
    CANCEL: int = 0


class DashboardListData(PaginatedResponse):
    """대시보드 목록 데이터 스키마"""

    items: List[DashboardResponse]
    status_counts: StatusCount = Field(
        ..., alias="statusCounts", description="상태별 카운트"
    )
    filter: Optional[DashboardFilter] = Field(None, description="적용된 필터")

    model_config = ConfigDict(populate_by_name=True)


class DashboardList(BaseModel):
    """대시보드 목록 응답 스키마"""

    success: bool = Field(True, description="성공 여부")
    message: str = Field("데이터 조회 성공", description="응답 메시지")
    data: DashboardListData = Field(..., description="응답 데이터")

    model_config = ConfigDict(populate_by_name=True)


class OrderStatusUpdate(BaseModel):
    """주문 상태 변경 스키마"""

    status: OrderStatus = Field(..., description="변경할 상태")

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        json_schema_extra={"example": {"status": "IN_PROGRESS"}},
    )


class MultipleDashboardIds(BaseModel):
    """다중 대시보드 ID 스키마"""

    order_ids: List[int] = Field(..., alias="orderIds", description="주문 ID 목록")

    model_config = ConfigDict(
        populate_by_name=True, json_schema_extra={"example": {"orderIds": [1, 2, 3]}}
    )


class MultipleStatusUpdate(MultipleDashboardIds):
    """다중 주문 상태 변경 스키마"""

    status: OrderStatus = Field(..., description="변경할 상태")

    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        json_schema_extra={"example": {"orderIds": [1, 2, 3], "status": "IN_PROGRESS"}},
    )


class DriverAssign(BaseModel):
    """기사 배정 스키마"""

    driver_name: str = Field(..., alias="driverName", description="기사 이름")
    driver_contact: Optional[str] = Field(
        None, alias="driverContact", description="기사 연락처"
    )

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {"driverName": "김기사", "driverContact": "010-9876-5432"}
        },
    )


class DriverAssignMultiple(MultipleDashboardIds, DriverAssign):
    """다중 기사 배정 스키마"""

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "orderIds": [1, 2, 3],
                "driverName": "김기사",
                "driverContact": "010-9876-5432",
            }
        },
    )


class LockStatus(BaseModel):
    """락 상태 스키마"""

    editable: bool = Field(..., description="편집 가능 여부")
    locked_by: Optional[str] = Field(
        None, alias="lockedBy", description="락 보유 사용자"
    )
    locked_at: Optional[datetime] = Field(
        None, alias="lockedAt", description="락 획득 시간"
    )

    model_config = ConfigDict(populate_by_name=True)


class LockResponse(BaseModel):
    """락 응답 스키마"""

    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="응답 메시지")
    lock_status: Optional[LockStatus] = Field(
        None, alias="lockStatus", description="락 상태"
    )

    model_config = ConfigDict(populate_by_name=True)
