# teckwah_project/server/schemas/common_schema.py
from typing import TypeVar, Generic, Optional, Any, Dict, List, Union
from pydantic import BaseModel, Field
from datetime import datetime

T = TypeVar("T")


class ErrorDetail(BaseModel):
    """에러 상세 정보 스키마"""

    code: str
    detail: str
    fields: Optional[Dict[str, Any]] = None


class ApiResponse(BaseModel, Generic[T]):
    """통합 API 응답 스키마"""

    success: bool = True
    message: str
    data: Optional[T] = None
    meta: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "요청이 성공적으로 처리되었습니다",
                "data": {},
                "meta": {"total": 0, "page": 1},
                "timestamp": "2023-01-01T00:00:00+09:00",
            }
        }


# 특화된 응답 타입을 위한 유틸리티 클래스
class MetaBuilder:
    """응답 메타데이터 생성 유틸리티"""

    @staticmethod
    def pagination(total: int, page: int, size: int) -> Dict[str, Any]:
        """페이지네이션 메타데이터 생성"""
        total_pages = (total + size - 1) // size if size > 0 else 0
        return {
            "total": total,
            "page": page,
            "size": size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        }

    @staticmethod
    def date_range(oldest_date: datetime, latest_date: datetime) -> Dict[str, str]:
        """날짜 범위 메타데이터 생성"""
        return {
            "oldest_date": oldest_date.strftime("%Y-%m-%d"),
            "latest_date": latest_date.strftime("%Y-%m-%d"),
        }

    @staticmethod
    def lock_info(
        is_locked: bool, lock_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """락 정보 메타데이터 생성"""
        meta = {"is_locked": is_locked}
        if is_locked and lock_data:
            meta.update(
                {
                    "locked_by": lock_data.get("locked_by"),
                    "lock_type": lock_data.get("lock_type"),
                    "expires_at": lock_data.get("expires_at"),
                }
            )
        return meta

    @staticmethod
    def search_info(
        search_term: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        date_range: Optional[Dict[str, datetime]] = None,
    ) -> Dict[str, Any]:
        """검색 조건 메타데이터 생성"""
        meta = {}
        if search_term:
            meta["search_term"] = search_term
        if filters:
            meta["filters"] = filters
        if date_range:
            meta["date_range"] = {
                "start_date": (
                    date_range.get("start_date").strftime("%Y-%m-%d")
                    if date_range.get("start_date")
                    else None
                ),
                "end_date": (
                    date_range.get("end_date").strftime("%Y-%m-%d")
                    if date_range.get("end_date")
                    else None
                ),
            }
        return meta

    @staticmethod
    def user_info(user_id: str, role: str, department: str) -> Dict[str, Any]:
        """사용자 정보 메타데이터 생성"""
        return {
            "user_id": user_id,
            "role": role,
            "department": department,
            "is_admin": role == "ADMIN",
        }
