# backend/app/models/dashboard_model.py
from sqlalchemy import (
    Column,
    BigInteger,
    Integer,
    String,
    Enum,
    DateTime,
    Text,
    ForeignKey,
    Computed,
    ForeignKeyConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.config.database import Base


class Dashboard(Base):
    __tablename__ = "dashboard"

    dashboard_id = Column(Integer, primary_key=True, autoincrement=True)
    order_no = Column(BigInteger, nullable=False)
    type = Column(Enum("DELIVERY", "RETURN"), nullable=False)
    status = Column(
        Enum("WAITING", "IN_PROGRESS", "COMPLETE", "ISSUE", "CANCEL"),
        server_default="WAITING",
        nullable=False,
        index=True,
    )
    department = Column(Enum("CS", "HES", "LENOVO"), nullable=False, index=True)
    warehouse = Column(Enum("SEOUL", "BUSAN", "GWANGJU", "DAEJEON"), nullable=False)
    sla = Column(String(10), nullable=False)
    eta = Column(DateTime, nullable=False, index=True)
    create_time = Column(DateTime, server_default=func.now(), nullable=False)
    depart_time = Column(DateTime, nullable=True)
    complete_time = Column(DateTime, nullable=True)
    postal_code = Column(
        String(5), ForeignKey("postal_code.postal_code"), nullable=False
    )
    city = Column(String(100), nullable=True)
    county = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    region = Column(
        String(255), Computed("CONCAT(city, ' ', county, ' ', district)"), nullable=True
    )
    distance = Column(Integer, nullable=True)
    duration_time = Column(Integer, nullable=True)
    address = Column(Text, nullable=False)
    customer = Column(String(255), nullable=True)
    contact = Column(String(20), nullable=True)
    remark = Column(Text, nullable=True)
    driver_name = Column(String(255), nullable=True)
    driver_contact = Column(String(50), nullable=True)

    # Relationships 수정
    postal_code_info = relationship(
        "PostalCode", backref="dashboards", viewonly=True  # 읽기 전용으로 설정
    )

    postal_detail_info = relationship(
        "PostalCodeDetail",
        foreign_keys=[postal_code, warehouse],
        primaryjoin="and_(Dashboard.postal_code==PostalCodeDetail.postal_code, "
        "Dashboard.warehouse==PostalCodeDetail.warehouse)",
        overlaps="postal_code_info",  # 중복 관계 명시
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["postal_code", "warehouse"],
            ["postal_code_detail.postal_code", "postal_code_detail.warehouse"],
            name="fk_dashboard_postal_detail",
        ),
    )
