# teckwah_project/main/server/models/postal_code_model.py
from sqlalchemy import Column, String, Integer, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.config.database import Base


class PostalCode(Base):
    __tablename__ = "postal_code"

    postal_code = Column(String(5), primary_key=True)
    city = Column(String(100), nullable=True)
    county = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)

    # Relationships
    postal_code_details = relationship(
        "PostalCodeDetail", back_populates="postal_code_info"
    )

    def __repr__(self):
        return f"<PostalCode(code={self.postal_code}, city={self.city})>"


class PostalCodeDetail(Base):
    __tablename__ = "postal_code_detail"

    postal_code = Column(
        String(5), ForeignKey("postal_code.postal_code"), primary_key=True
    )
    warehouse = Column(Enum("SEOUL", "BUSAN", "GWANGJU", "DAEJEON"), primary_key=True)
    distance = Column(Integer, nullable=False)
    duration_time = Column(Integer, nullable=False)

    # Relationships
    postal_code_info = relationship("PostalCode", back_populates="postal_code_details")
