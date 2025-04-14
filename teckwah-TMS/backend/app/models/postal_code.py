"""
우편번호 및 우편번호 상세 정보 모델
"""
from sqlalchemy import Column, String, Integer, Enum, ForeignKey, Index
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field
from typing import Optional, List

from app.database import Base
from app.models.dashboard import Warehouse

class PostalCode(Base):
    """우편번호 DB 모델"""
    __tablename__ = "postal_code"
    
    postal_code = Column(String(5), primary_key=True)
    city = Column(String(100), nullable=True)
    county = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)

class PostalCodeDetail(Base):
    """우편번호 상세 정보 DB 모델"""
    __tablename__ = "postal_code_detail"
    
    postal_code = Column(String(5), ForeignKey("postal_code.postal_code"), primary_key=True)
    warehouse = Column(Enum("SEOUL", "BUSAN", "GWANGJU", "DAEJEON", name="warehouse_enum"), primary_key=True)
    distance = Column(Integer, nullable=False)
    duration_time = Column(Integer, nullable=False)
    
    # 인덱스 생성
    __table_args__ = (
        Index('idx_warehouse_postal', 'warehouse'),
    )

# API 요청/응답 모델
class PostalCodeResponse(BaseModel):
    postal_code: str
    city: Optional[str] = None
    county: Optional[str] = None
    district: Optional[str] = None
    
    class Config:
        orm_mode = True

class PostalCodeDetailResponse(BaseModel):
    postal_code: str
    warehouse: str
    distance: int
    duration_time: int
    
    class Config:
        orm_mode = True

class PostalCodeCreate(BaseModel):
    postal_code: str = Field(..., description="우편번호")
    city: Optional[str] = Field(None, description="시")
    county: Optional[str] = Field(None, description="군/구")
    district: Optional[str] = Field(None, description="동/읍/면")

class PostalCodeDetailCreate(BaseModel):
    postal_code: str = Field(..., description="우편번호")
    warehouse: Warehouse = Field(..., description="창고")
    distance: int = Field(..., description="거리(km)")
    duration_time: int = Field(..., description="소요시간(분)")
