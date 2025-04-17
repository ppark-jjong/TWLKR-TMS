"""
대시보드(주문) 모델
"""

from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    DateTime,
    Enum,
    ForeignKey,
    Boolean,
)
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from backend.database import Base
from backend.models.user import Department


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


class Dashboard(Base):
    """대시보드(주문) DB 모델"""

    __tablename__ = "dashboard"

    dashboard_id = Column(Integer, primary_key=True, autoincrement=True)
    is_locked = Column(Boolean, default=False)
    order_no = Column(String(255), nullable=False, index=True)
    type = Column(Enum("DELIVERY", "RETURN", name="type_enum"), nullable=False)
    status = Column(
        Enum(
            "WAITING", "IN_PROGRESS", "COMPLETE", "ISSUE", "CANCEL", name="status_enum"
        ),
        nullable=False,
        default="WAITING",
    )
    department = Column(
        Enum("CS", "HES", "LENOVO", name="department_enum"), nullable=False, index=True
    )
    warehouse = Column(
        Enum("SEOUL", "BUSAN", "GWANGJU", "DAEJEON", name="warehouse_enum"),
        nullable=False,
    )
    sla = Column(String(10), nullable=False)
    eta = Column(DateTime, nullable=False, index=True)
    create_time = Column(DateTime, nullable=False)
    depart_time = Column(DateTime, nullable=True)
    complete_time = Column(DateTime, nullable=True)
    postal_code = Column(
        String(5), ForeignKey("postal_code.postal_code"), nullable=False
    )
    city = Column(String(21), nullable=True)
    county = Column(String(51), nullable=True)
    district = Column(String(51), nullable=True)
    region = Column(String(153), nullable=True, info={'generated': True})  # 계산 필드 명시적 추가
    distance = Column(Integer, nullable=True)
    duration_time = Column(Integer, nullable=True)
    address = Column(Text, nullable=False)
    customer = Column(String(150), nullable=False)
    contact = Column(String(20), nullable=True)
    driver_name = Column(String(153), nullable=True)
    driver_contact = Column(String(50), nullable=True)
    updated_by = Column(String(50), nullable=True)
    remark = Column(Text, nullable=True)
    update_at = Column(DateTime, nullable=True)


# API 요청/응답 모델
class OrderCreate(BaseModel):
    order_no: str = Field(..., description="주문 번호")
    type: OrderType = Field(..., description="주문 타입")
    department: Department = Field(..., description="부서")
    warehouse: Warehouse = Field(..., description="창고")
    sla: str = Field(..., description="SLA")
    eta: datetime = Field(..., description="예상 도착 시간")
    postal_code: str = Field(..., description="우편번호")
    address: str = Field(..., description="주소")
    customer: str = Field(..., description="고객명")
    contact: Optional[str] = Field(None, description="연락처")
    driver_name: Optional[str] = Field(None, description="기사 이름")
    driver_contact: Optional[str] = Field(None, description="기사 연락처")
    remark: Optional[str] = Field(None, description="비고")


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = Field(None, description="주문 상태")
    warehouse: Optional[Warehouse] = Field(None, description="창고")
    sla: Optional[str] = Field(None, description="SLA")
    eta: Optional[datetime] = Field(None, description="예상 도착 시간")
    postal_code: Optional[str] = Field(None, description="우편번호")
    address: Optional[str] = Field(None, description="주소")
    customer: Optional[str] = Field(None, description="고객명")
    contact: Optional[str] = Field(None, description="연락처")
    driver_name: Optional[str] = Field(None, description="기사 이름")
    driver_contact: Optional[str] = Field(None, description="기사 연락처")
    remark: Optional[str] = Field(None, description="비고")


class DriverAssign(BaseModel):
    order_ids: List[int] = Field(..., description="주문 ID 목록")
    driver_name: str = Field(..., description="기사 이름")
    driver_contact: Optional[str] = Field(None, description="기사 연락처")


class OrderStatusUpdate(BaseModel):
    status: OrderStatus = Field(..., description="변경할 상태")


class OrderDeleteMultiple(BaseModel):
    order_ids: List[int] = Field(..., description="삭제할 주문 ID 목록")


class OrderResponse(BaseModel):
    dashboard_id: int
    order_no: str
    type: str
    status: str
    department: str
    warehouse: str
    sla: str
    eta: datetime
    create_time: datetime
    depart_time: Optional[datetime] = None
    complete_time: Optional[datetime] = None
    postal_code: str
    city: Optional[str] = None
    county: Optional[str] = None
    district: Optional[str] = None
    region: Optional[str] = None  # region 필드 추가 (city, county, district 조합)
    distance: Optional[int] = None
    duration_time: Optional[int] = None
    address: str
    customer: str
    contact: Optional[str] = None
    driver_name: Optional[str] = None
    driver_contact: Optional[str] = None
    updated_by: Optional[str] = None
    remark: Optional[str] = None
    update_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderFilter(BaseModel):
    start_date: Optional[datetime] = Field(None, description="시작 날짜")
    end_date: Optional[datetime] = Field(None, description="종료 날짜")
    # 클라이언트 측 필터링을 위해 다른 필드들은 제거
