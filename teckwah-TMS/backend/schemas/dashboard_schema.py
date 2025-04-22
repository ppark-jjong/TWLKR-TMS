"""
대시보드(주문) 관련 Pydantic 스키마
"""

from pydantic import Field, BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum as PyEnum

# model_config는 models 패키지에 그대로 두거나, 별도 config 패키지로 분리 가능
# 여기서는 기존 위치에서 가져옴
from backend.models.model_config import APIModel

# Department Enum은 user 스키마에서 가져옴
from backend.schemas.user_schema import Department


class OrderType(str, PyEnum):
    DELIVERY = "DELIVERY"
    RETURN = "RETURN"


class OrderStatus(str, PyEnum):
    WAITING = "WAITING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETE = "COMPLETE"
    ISSUE = "ISSUE"
    CANCEL = "CANCEL"


class Warehouse(str, PyEnum):
    SEOUL = "SEOUL"
    BUSAN = "BUSAN"
    GWANGJU = "GWANGJU"
    DAEJEON = "DAEJEON"


# API 요청/응답 모델
class OrderCreate(APIModel):
    order_no: str = Field(..., description="주문 번호", alias="orderNo")
    type: OrderType = Field(..., description="주문 타입")
    department: Department = Field(..., description="부서")
    warehouse: Warehouse = Field(..., description="창고")
    sla: str = Field(..., description="SLA")
    eta: datetime = Field(..., description="예상 도착 시간")
    postal_code: str = Field(..., description="우편번호", alias="postalCode")
    address: str = Field(..., description="주소")
    customer: str = Field(..., description="고객명")
    contact: Optional[str] = Field(None, description="연락처")
    driver_name: Optional[str] = Field(
        None, description="기사 이름", alias="driverName"
    )
    driver_contact: Optional[str] = Field(
        None, description="기사 연락처", alias="driverContact"
    )
    remark: Optional[str] = Field(None, description="비고")


class OrderUpdate(APIModel):
    # status 필드는 별도 API에서 처리하므로 여기서는 제외하는 것이 명확할 수 있음
    # warehouse: Optional[Warehouse] = Field(None, description="창고")
    sla: Optional[str] = Field(None, description="SLA")
    eta: Optional[datetime] = Field(None, description="예상 도착 시간")
    postal_code: Optional[str] = Field(None, description="우편번호", alias="postalCode")
    address: Optional[str] = Field(None, description="주소")
    customer: Optional[str] = Field(None, description="고객명")
    contact: Optional[str] = Field(None, description="연락처")
    driver_name: Optional[str] = Field(
        None, description="기사 이름", alias="driverName"
    )
    driver_contact: Optional[str] = Field(
        None, description="기사 연락처", alias="driverContact"
    )
    remark: Optional[str] = Field(None, description="비고")


class DriverAssign(APIModel):
    order_ids: List[int] = Field(..., description="주문 ID 목록", alias="orderIds")
    driver_name: str = Field(..., description="기사 이름", alias="driverName")
    driver_contact: Optional[str] = Field(
        None, description="기사 연락처", alias="driverContact"
    )


class OrderStatusUpdate(APIModel):
    status: OrderStatus = Field(..., description="변경할 상태")


class OrderDeleteMultiple(APIModel):
    order_ids: List[int] = Field(
        ..., description="삭제할 주문 ID 목록", alias="orderIds"
    )


class OrderResponse(APIModel):
    dashboard_id: int = Field(..., alias="dashboardId")
    order_no: str = Field(..., alias="orderNo")
    type: OrderType = Field(..., alias="type")
    status: OrderStatus = Field(..., alias="status")
    department: Department = Field(..., alias="department")
    warehouse: Warehouse = Field(..., alias="warehouse")
    sla: str = Field(..., alias="sla")
    eta: datetime = Field(..., alias="eta")
    create_time: datetime = Field(..., alias="createTime")
    depart_time: Optional[datetime] = Field(None, alias="departTime")
    complete_time: Optional[datetime] = Field(None, alias="completeTime")
    postal_code: str = Field(..., alias="postalCode")
    city: Optional[str] = Field(None, alias="city")
    county: Optional[str] = Field(None, alias="county")
    district: Optional[str] = Field(None, alias="district")
    region: Optional[str] = Field(None, alias="region")
    distance: Optional[int] = Field(None, alias="distance")
    duration_time: Optional[int] = Field(None, alias="durationTime")
    address: str = Field(..., alias="address")
    customer: str = Field(..., alias="customer")
    contact: Optional[str] = Field(None, alias="contact")
    driver_name: Optional[str] = Field(None, alias="driverName")
    driver_contact: Optional[str] = Field(None, alias="driverContact")
    updated_by: Optional[str] = Field(None, alias="updatedBy")
    remark: Optional[str] = Field(None, alias="remark")
    update_at: Optional[datetime] = Field(None, alias="updateAt")

    # Pydantic v2 스타일로 ORM 모드 설정
    model_config = {"from_attributes": True, "populate_by_name": True}


class OrderFilter(APIModel):
    """주문 목록 필터링을 위한 스키마"""

    start_date: Optional[datetime] = Field(
        None, description="시작 날짜", alias="startDate"
    )
    end_date: Optional[datetime] = Field(None, description="종료 날짜", alias="endDate")


class LockResponseData(APIModel):
    """락 상태 응답 데이터 모델"""

    locked: bool
    editable: bool
    message: str


class OrderListFilterResponse(APIModel):
    """주문 목록 필터 정보 응답 모델"""

    start_date: Optional[datetime] = Field(None, alias="startDate")
    end_date: Optional[datetime] = Field(None, alias="endDate")


class OrderListResponseData(APIModel):
    """주문 목록 조회 응답 데이터 부분 모델"""

    items: List[OrderResponse]
    total: int
    page: int
    limit: int
    status_counts: Dict[str, int] = Field(..., alias="statusCounts")
    filter: OrderListFilterResponse


class OrderListResponse(APIModel):
    """주문 목록 조회 전체 응답 모델"""

    success: bool = True
    message: str = "주문 목록 조회 성공"
    data: OrderListResponseData


class GetOrderResponseData(OrderResponse):
    """주문 상세 조회 응답 데이터 부분 모델 (락 정보 포함)"""

    locked_info: Optional[LockResponseData] = Field(
        None, alias="lockedInfo"
    )  # 락 정보를 data 내부에 포함


class GetOrderResponse(APIModel):
    """주문 상세 조회 전체 응답 모델"""

    success: bool = True
    message: str = "주문 조회 성공"
    data: GetOrderResponseData


class LockResponse(APIModel):
    """락/언락 전체 응답 모델"""

    success: bool
    message: str
    lockStatus: LockResponseData  # camelCase 형식으로 직접 필드 이름 지정


class BasicSuccessResponse(APIModel):
    """기본 성공 응답 모델 (데이터 없음)"""

    success: bool = True
    message: str


class DeleteMultipleResponseData(APIModel):
    """다중 삭제 응답 데이터 모델"""

    deleted_count: int = Field(..., alias="deletedCount")
    forbidden_ids: List[int] = Field(..., alias="forbiddenIds")


class DeleteMultipleResponse(APIModel):
    """다중 삭제 전체 응답 모델"""

    success: bool
    message: str
    data: Optional[DeleteMultipleResponseData] = None


class StatusUpdateMultipleResponseData(APIModel):
    """상태 일괄 변경 응답 데이터 모델"""

    updated_count: int = Field(..., alias="updatedCount")
    forbidden_ids: List[int] = Field(..., alias="forbiddenIds")


class StatusUpdateMultipleResponse(APIModel):
    """상태 일괄 변경 전체 응답 모델"""

    success: bool
    message: str
    data: StatusUpdateMultipleResponseData


class AssignDriverResponseData(APIModel):
    """기사 배정 응답 데이터 모델"""

    assigned_count: int = Field(..., alias="assignedCount")


class AssignDriverResponse(APIModel):
    """기사 배정 전체 응답 모델"""

    success: bool = True
    message: str = "기사 배정 성공"
    data: AssignDriverResponseData
