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

from backend.database import Base


class Dashboard(Base):
    """대시보드(주문) DB 모델"""

    __tablename__ = "dashboard"

    dashboard_id = Column(Integer, primary_key=True, autoincrement=True)
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
