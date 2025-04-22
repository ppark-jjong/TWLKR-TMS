"""
시각화 API 응답 모델
"""

from pydantic import Field
from typing import List, Dict, Optional
from datetime import datetime

from backend.models.model_config import APIModel


# 시간대별 통계 데이터 모델
class TimeStatEntry(APIModel):
    time_range: str = Field(..., alias="timeRange")
    CS: int
    HES: int
    LENOVO: int


# 부서별 상태 통계 데이터 모델
class DepartmentStatusCounts(APIModel):
    WAITING: int
    IN_PROGRESS: int
    COMPLETE: int
    ISSUE: int
    CANCEL: int


class DepartmentStatEntry(APIModel):
    department: str
    total_count: int = Field(..., alias="totalCount")
    status_counts: DepartmentStatusCounts = Field(..., alias="statusCounts")


# 시각화 응답 데이터 부분 모델
class VisualizationData(APIModel):
    visualization_type: str = Field(..., alias="visualizationType")
    start_date: datetime = Field(..., alias="startDate")
    end_date: datetime = Field(..., alias="endDate")
    time_stats: Optional[List[TimeStatEntry]] = Field(None, alias="timeStats")
    department_stats: Optional[List[DepartmentStatEntry]] = Field(
        None, alias="departmentStats"
    )


# 시각화 전체 응답 모델
class VisualizationResponse(APIModel):
    success: bool = True
    message: str
    data: VisualizationData
