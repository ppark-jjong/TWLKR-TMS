# teckwah_project/server/models/dashboard_model.py
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
    func,
)
from sqlalchemy.orm import relationship
from server.config.database import Base


class Dashboard(Base):
    __tablename__ = "dashboard"

    dashboard_id = Column(Integer, primary_key=True, autoincrement=True)
    order_no = Column(String(15), nullable=False)
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
    create_time = Column(DateTime, nullable=False)
    depart_time = Column(DateTime, nullable=True)
    complete_time = Column(DateTime, nullable=True)
    postal_code = Column(
        String(5), ForeignKey("postal_code.postal_code"), nullable=False
    )
    city = Column(String(21), nullable=True)
    county = Column(String(51), nullable=True)
    district = Column(String(51), nullable=True)
    region = Column(
        String(153), Computed("CONCAT(city, ' ', county, ' ', district)"), nullable=True
    )
    distance = Column(Integer, nullable=True)
    duration_time = Column(Integer, nullable=True)
    address = Column(Text, nullable=False)
    customer = Column(String(150), nullable=False)
    contact = Column(String(20), nullable=True)
    driver_name = Column(String(153), nullable=True)
    driver_contact = Column(String(50), nullable=True)
    updated_by = Column(
        String(50), nullable=True
    )  # 업데이트한 사용자 ID (생성자 정보도 포함)
    remark = Column(Text, nullable=True)  # 메모 내용
    update_at = Column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )  # 업데이트 시각

    # 관계 설정
    postal_code_info = relationship("PostalCode", backref="dashboards", viewonly=True)

    def __repr__(self):
        return f"<Dashboard(id={self.dashboard_id}, order_no={self.order_no})>"
