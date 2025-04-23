"""
공통 스키마
"""

from typing import Generic, TypeVar, Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

# 제네릭 타입 변수
T = TypeVar('T')


class PaginationParams(BaseModel):
    """페이지네이션 파라미터"""
    page: Optional[int] = Field(1, alias="page", description="페이지 번호")
    limit: Optional[int] = Field(10, alias="limit", description="페이지당 항목 수")
    
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "page": 1,
                "limit": 10
            }
        }
    )


class ErrorResponse(BaseModel):
    """에러 응답 스키마"""
    success: bool = Field(False, description="성공 여부")
    message: str = Field(..., description="에러 메시지")
    error_code: Optional[str] = Field(None, alias="errorCode", description="에러 코드")
    
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "success": False,
                "message": "요청한 리소스를 찾을 수 없습니다",
                "errorCode": "NOT_FOUND"
            }
        }
    )


class SuccessResponse(BaseModel, Generic[T]):
    """성공 응답 스키마"""
    success: bool = Field(True, description="성공 여부")
    message: Optional[str] = Field(None, description="성공 메시지")
    data: Optional[T] = Field(None, description="응답 데이터")
    
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "success": True,
                "message": "데이터 조회 성공",
                "data": None
            }
        }
    )


class PaginatedResponse(BaseModel, Generic[T]):
    """페이지네이션된 응답 스키마"""
    items: List[T] = Field(..., description="항목 목록")
    total: int = Field(..., description="전체 항목 수")
    page: int = Field(..., description="현재 페이지")
    limit: int = Field(..., description="페이지당 항목 수")
    
    model_config = ConfigDict(
        populate_by_name=True
    )
