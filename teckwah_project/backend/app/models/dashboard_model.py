from app.models.user_model import User
from app.schemas.common_schema import (
    DeliveryType,
    DeliveryStatus,
    Warehouse,
    SLA,
    UserDepartment,
)
from app.utils.logger_util import Logger
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    BigInteger,
    ForeignKey,
    Enum,
    Computed,
    Index,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.config.database import Base
from enum import Enum as PyEnum

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    BigInteger,
    ForeignKey,
    Enum,
    Computed,
    Index,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.config.database import Base
from enum import Enum as PyEnum


class Dashboard(Base):
    """배송 대시보드 모델 (init-db.sql 테이블 정의와 일치)"""

    __tablename__ = "dashboard"

    dashboard_id = Column(Integer, primary_key=True, autoincrement=True)
    order_no = Column(BigInteger, primary_key=True)
    type = Column(Enum(DeliveryType), nullable=False)
    status = Column(
        Enum(DeliveryStatus), nullable=False, default=DeliveryStatus.WAITING
    )
    department = Column(Enum(UserDepartment), nullable=False)
    warehouse = Column(Enum(Warehouse), nullable=False)
    sla = Column(Enum(SLA), nullable=False)
    eta = Column(DateTime, nullable=False)
    create_time = Column(DateTime, nullable=False, server_default="CURRENT_TIMESTAMP")

    depart_time = Column(DateTime, nullable=True)
    complete_time = Column(DateTime, nullable=True)
    postal_code = Column(
        String(10), ForeignKey("postal_code.postal_code"), nullable=False
    )
    city = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    region = Column(
        String(255), Computed("CONCAT(city, ' ', district)"), nullable=False
    )
    distance = Column(Integer, nullable=True)
    duration_time = Column(Integer, nullable=True)
    address = Column(Text, nullable=False)
    customer = Column(String(255), nullable=False)
    contact = Column(String(20), nullable=False)
    remark = Column(Text, nullable=True)
    driver_id = Column(Integer, ForeignKey("driver.driver_id"), nullable=True)
    driver_name = Column(String(100), nullable=True)
    driver_contact = Column(String(20), nullable=True)
    driver_remark = Column(String(255), nullable=True)

    # Relationships
    postal_code_info = relationship("PostalCode", back_populates="dashboards")
    driver = relationship("Driver", back_populates="dashboards")

    __table_args__ = (Index("idx_eta", "eta"),)  # eta 컬럼에 인덱스 추가

    def to_dict(self):
        """모델을 딕셔너리로 변환"""
        return {
            "dashboard_id": self.dashboard_id,
            "order_no": self.order_no,
            "type": self.type.value if self.type else None,
            "status": self.status.value if self.status else None,
            "department": self.department.value if self.department else None,
            "warehouse": self.warehouse.value if self.warehouse else None,
            "sla": self.sla.value if self.sla else None,
            "eta": self.eta.isoformat() if self.eta else None,
            "create_time": self.create_time.isoformat() if self.create_time else None,
            "depart_time": self.depart_time.isoformat() if self.depart_time else None,
            "complete_time": (
                self.complete_time.isoformat() if self.complete_time else None
            ),
            "postal_code": self.postal_code,
            "city": self.city,
            "district": self.district,
            "region": self.region,
            "distance": self.distance,
            "duration_time": self.duration_time,
            "address": self.address,
            "customer": self.customer,
            "contact": self.contact,
            "remark": self.remark,
            "driver_id": self.driver_id,
            "driver_name": self.driver_name,
            "driver_contact": self.driver_contact,
            "driver_remark": self.driver_remark,
        }
