# backend/app/models/postal_code_model.py
from sqlalchemy import Column, String, Integer
from app.config.database import Base


class PostalCode(Base):
    __tablename__ = "postal_code"

    postal_code = Column(String(5), primary_key=True)
    district = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    county = Column(String(100), nullable=True)
    distance = Column(Integer, nullable=True)
    duration_time = Column(Integer, nullable=True)

    def __repr__(self):
        return f"<PostalCode(code={self.postal_code}, city={self.city})>"
