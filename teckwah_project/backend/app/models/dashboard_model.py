# backend/app/models/dashboard_model.py
from sqlalchemy import Column, Integer, String, Enum, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Dashboard(Base):
    __tablename__ = 'dashboard'

    dashboard_id = Column(Integer, primary_key=True, autoincrement=True)
    order_no = Column(Integer, nullable=False)
    type = Column(Enum('DELIVERY', 'RETURN'), nullable=False)
    status = Column(Enum('WAITING', 'IN_PROGRESS', 'COMPLETE', 'ISSUE'), default='WAITING', nullable=False)
    department = Column(Enum('CS', 'HES', 'LENOVO'), nullable=False)
    warehouse = Column(Enum('SEOUL', 'BUSAN', 'GWANGJU', 'DAEJEON'), nullable=False)
    sla = Column(Enum('XHR', 'POX', 'EMC', 'WEWORK', 'LENOVO', 'ETC'), nullable=False)
    eta = Column(DateTime, nullable=False)
    create_time = Column(DateTime, default='CURRENT_TIMESTAMP', nullable=False)
    depart_time = Column(DateTime, nullable=True)
    complete_time = Column(DateTime, nullable=True)
    postal_code = Column(String(5), ForeignKey('postal_code.postal_code'), nullable=False)
    city = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    region = Column(String(255), nullable=True)
    distance = Column(Integer, nullable=True)
    duration_time = Column(Integer, nullable=True)
    address = Column(Text, nullable=False)
    customer = Column(String(255), nullable=False)
    contact = Column(String(20), nullable=False)
    remark = Column(Text, nullable=True)
    driver_name = Column(String(255), nullable=True)
    driver_contact = Column(String(50), nullable=True)

    postal_code_rel = relationship("PostalCode", backref="dashboards")

    def __repr__(self):
        return f"<Dashboard(order_no='{self.order_no}', status='{self.status}')>" 