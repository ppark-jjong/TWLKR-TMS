"""
우편번호 및 우편번호 상세 정보 모델
"""

from sqlalchemy import Column, String, Integer, Enum, ForeignKey, Index
from pydantic import Field
from typing import Optional

from backend.database import Base

# Warehouse Enum 임포트 (Dashboard 모델에서 가져옴)
from backend.models.dashboard import Warehouse
from backend.models.model_config import APIModel


class PostalCode(Base):
    """우편번호 DB 모델 (init-db.sql 기준)"""

    __tablename__ = "postal_code"

    postal_code = Column(String(5), primary_key=True)
    city = Column(String(100), nullable=True)
    county = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)


class PostalCodeDetail(Base):
    """우편번호 상세 정보 DB 모델 (init-db.sql 기준)"""

    __tablename__ = "postal_code_detail"

    postal_code = Column(
        String(5), ForeignKey("postal_code.postal_code"), primary_key=True
    )
    # Warehouse Enum 사용
    warehouse = Column(Enum(Warehouse), primary_key=True)
    distance = Column(Integer, nullable=False)
    duration_time = Column(Integer, nullable=False)

    # 인덱스 정의 (선택적, 이미 DB 스키마에 있음)
    __table_args__ = (Index("idx_warehouse_postal", "warehouse"),)


# API 요청/응답 모델
class PostalCodeResponse(APIModel):
    postal_code: str = Field(..., alias="postalCode")
    city: Optional[str] = None
    county: Optional[str] = None
    district: Optional[str] = None


class PostalCodeDetailResponse(APIModel):
    postal_code: str = Field(..., alias="postalCode")
    warehouse: Warehouse  # Enum 타입 사용
    distance: int
    duration_time: int = Field(..., alias="durationTime")


class PostalCodeCreate(APIModel):
    postal_code: str = Field(..., description="우편번호", alias="postalCode")
    city: Optional[str] = Field(None, description="시")
    county: Optional[str] = Field(None, description="군/구")
    district: Optional[str] = Field(None, description="동/읍/면")


class PostalCodeDetailCreate(APIModel):
    postal_code: str = Field(..., description="우편번호", alias="postalCode")
    warehouse: Warehouse = Field(..., description="창고")
    distance: int = Field(..., description="거리(km)")
    duration_time: int = Field(..., description="소요시간(분)", alias="durationTime")
