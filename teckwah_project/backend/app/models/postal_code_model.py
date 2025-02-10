from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import relationship
from app.config.database import Base


class PostalCode(Base):
    """우편번호 모델"""

    __tablename__ = "postal_code"

    postal_code = Column(String(10), primary_key=True)
    district = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)
    distance = Column(Integer, nullable=True)
    bill_distance = Column(Integer, nullable=True)
    duration_time = Column(Integer, nullable=True)

    # Relationships
    dashboards = relationship("Dashboard", back_populates="postal_code_info")
