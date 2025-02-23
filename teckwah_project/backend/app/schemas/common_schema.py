# backend/app/schemas/common_schema.py
from typing import TypeVar, Generic, Optional, Any
from pydantic import BaseModel
from pydantic.generics import GenericModel

T = TypeVar("T")


class BaseResponse(GenericModel, Generic[T]):
    """기본 API 응답 스키마"""

    success: bool = True
    message: str
    data: Optional[T] = None


class ErrorDetail(BaseModel):
    """에러 상세 정보 스키마"""

    code: str
    detail: str
    fields: Optional[dict] = None


class ErrorResponse(BaseModel):
    """에러 응답 스키마"""

    success: bool = False
    message: str
    error: Optional[ErrorDetail] = None


class DateRangeInfo(BaseModel):
    """날짜 범위 정보"""

    oldest_date: str
    latest_date: str
