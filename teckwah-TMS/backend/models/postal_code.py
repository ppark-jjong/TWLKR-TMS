"""
우편번호 및 우편번호 상세 정보 모델
"""

from sqlalchemy import Column, String, Integer, Enum, ForeignKey, Index

# from pydantic import Field # 삭제
# from typing import Optional # 삭제

from backend.database import Base

# Warehouse Enum은 dashboard 스키마에서 가져옴
from backend.schemas.dashboard_schema import Warehouse

# Warehouse Enum 임포트 제거 (스키마로 이동)
# from backend.models.dashboard import Warehouse
# from backend.models.model_config import APIModel # 삭제


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
    # Warehouse Enum 객체 사용
    warehouse = Column(Enum(Warehouse), primary_key=True)
    distance = Column(Integer, nullable=False)
    duration_time = Column(Integer, nullable=False)

    # 인덱스 정의 (선택적, 이미 DB 스키마에 있음)
    __table_args__ = (Index("idx_warehouse_postal", "warehouse"),)


# API 요청/응답 모델 (schemas/postal_code_schema.py로 이동)
# class PostalCodeResponse(APIModel): ...
# class PostalCodeDetailResponse(APIModel): ...
# class PostalCodeCreate(APIModel): ...
# class PostalCodeDetailCreate(APIModel): ...
