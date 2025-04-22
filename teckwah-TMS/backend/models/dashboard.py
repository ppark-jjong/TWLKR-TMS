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
    Computed,
)
from sqlalchemy.sql import func
from enum import Enum as PyEnum
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from backend.database import Base


class OrderType(str, PyEnum):
    """주문 유형"""

    DELIVERY = "DELIVERY"
    RETURN = "RETURN"


class OrderStatus(str, PyEnum):
    """주문 상태"""

    PENDING = "WAITING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETE"
    REJECTED = "ISSUE"
    CANCELED = "CANCEL"


class Warehouse(str, PyEnum):
    """창고 위치"""

    SEOUL = "SEOUL"
    BUSAN = "BUSAN"
    GWANGJU = "GWANGJU"
    DAEJEON = "DAEJEON"


class Dashboard(Base):
    """대시보드(주문) DB 모델"""

    __tablename__ = "dashboard"

    dashboard_id = Column(Integer, primary_key=True, autoincrement=True)
    order_no = Column(String(255), nullable=False, index=True)
    type = Column(Enum(*[t.value for t in OrderType], name="type_enum"), nullable=False)
    status = Column(
        Enum(*[s.value for s in OrderStatus], name="status_enum"),
        nullable=False,
        default=OrderStatus.PENDING.value,
    )
    department = Column(
        Enum("CS", "HES", "LENOVO", name="department_enum"), nullable=False, index=True
    )
    warehouse = Column(
        Enum(*[w.value for w in Warehouse], name="warehouse_enum"),
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
    # region: Use SQLAlchemy's Computed construct
    region = Column(
        String(153),
        Computed("CONCAT(city, ' ', county, ' ', district)", persisted=True),
        nullable=True,
    )
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
    is_locked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())


# API 모델 (Pydantic)
class OrderCreate(BaseModel):
    """주문 생성 모델"""

    order_no: str
    type: OrderType
    department: str
    warehouse: Warehouse
    sla: str
    eta: datetime
    postal_code: str
    address: str
    customer: str
    contact: Optional[str] = None
    remark: Optional[str] = None


class OrderUpdate(BaseModel):
    """주문 수정 모델"""

    type: Optional[OrderType] = None
    status: Optional[OrderStatus] = None
    department: Optional[str] = None
    warehouse: Optional[Warehouse] = None
    sla: Optional[str] = None
    eta: Optional[datetime] = None
    postal_code: Optional[str] = None
    address: Optional[str] = None
    customer: Optional[str] = None
    contact: Optional[str] = None
    driver_name: Optional[str] = None
    driver_contact: Optional[str] = None
    remark: Optional[str] = None


class OrderResponse(BaseModel):
    """주문 응답 모델"""

    dashboard_id: int
    order_no: str
    type: OrderType
    status: OrderStatus
    department: str
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
    updated_by: Optional[str] = None
    remark: Optional[str] = None
    update_at: Optional[datetime] = None
    is_locked: bool = False
    created_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class OrderFilter(BaseModel):
    """주문 필터 모델"""

    orderNo: Optional[str] = None
    type: Optional[OrderType] = None
    status: Optional[List[OrderStatus]] = None
    department: Optional[str] = None
    warehouse: Optional[Warehouse] = None
    eta_from: Optional[datetime] = None
    eta_to: Optional[datetime] = None
    customer: Optional[str] = None
    driver: Optional[str] = None
    region: Optional[str] = None
    page: int = 1
    pageSize: int = 20
    sortField: Optional[str] = None
    sortOrder: Optional[str] = None


class DriverAssign(BaseModel):
    """운전자 배정 모델"""

    driver_name: str
    driver_contact: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    """주문 상태 업데이트 모델"""

    status: OrderStatus
    remark: Optional[str] = None


class OrderDeleteMultiple(BaseModel):
    """복수 주문 삭제 모델"""

    ids: List[int]
