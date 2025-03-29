# teckwah_project/main/server/schemas/download_schema.py
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from datetime import datetime
from main.server.schemas.common_schema import BaseResponse


class DownloadRequest(BaseModel):
    """대시보드 데이터 다운로드 요청 스키마"""

    start_date: str = Field(..., description="조회 시작 날짜 (YYYY-MM-DD)")
    end_date: str = Field(..., description="조회 종료 날짜 (YYYY-MM-DD)")


class DownloadResponse(BaseResponse):
    """대시보드 데이터 다운로드 응답 스키마"""

    file_name: Optional[str] = None
    total_count: Optional[int] = None


class DownloadDateRangeResponse(BaseResponse):
    """다운로드 가능 날짜 범위 응답 스키마"""

    date_range: Optional[Dict[str, str]] = None


class DownloadParams(BaseModel):
    """다운로드 파라미터 스키마"""

    start_date: Optional[str] = Field(None, description="시작 날짜 (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="종료 날짜 (YYYY-MM-DD)")
    status: Optional[str] = Field(None, description="상태 필터")
    type: Optional[str] = Field(None, description="유형 필터")
    department: Optional[str] = Field(None, description="부서 필터")
    warehouse: Optional[str] = Field(None, description="창고 필터")
