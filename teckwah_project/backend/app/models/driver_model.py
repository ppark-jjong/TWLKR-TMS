"""기사 모델"""
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.config.database import Base

class Driver(Base):
    """기사 테이블 모델"""
    __tablename__ = "driver"

    driver_id = Column(Integer, primary_key=True, autoincrement=True)
    driver_name = Column(String(100), nullable=False)
    driver_contact = Column(String(20), nullable=False)
    driver_remark = Column(String(255), nullable=True)

    # Relationships
    dashboards = relationship("Dashboard", back_populates="driver")

    class Config:
        from_attributes = True