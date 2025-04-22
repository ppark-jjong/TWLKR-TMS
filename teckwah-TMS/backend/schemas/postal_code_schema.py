"""
우편번호 관련 Pydantic 스키마
"""

from pydantic import Field
from typing import Optional

# Warehouse Enum은 dashboard 스키마에서 가져옴
from backend.schemas.dashboard_schema import Warehouse
from backend.models.model_config import APIModel


# API 요청/응답 모델
class PostalCodeResponse(APIModel):
    postal_code: str = Field(..., alias="postalCode")
    city: Optional[str] = None
    county: Optional[str] = None
    district: Optional[str] = None

    # ORM 모드 활성화 (PostalCode 모델과 매핑)
    model_config = {"from_attributes": True}


class PostalCodeDetailResponse(APIModel):
    postal_code: str = Field(..., alias="postalCode")
    warehouse: Warehouse  # Enum 타입 사용
    distance: int
    duration_time: int = Field(..., alias="durationTime")

    # ORM 모드 활성화 (PostalCodeDetail 모델과 매핑)
    model_config = {"from_attributes": True}


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
