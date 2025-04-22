"""
시각화 데이터 모델
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional


class TimeStatEntry(BaseModel):
    """시간대별 통계 항목"""

    time_range: str = Field(..., alias="timeRange")
    총무: int = 0
    회계: int = 0
    인사: int = 0
    영업: int = 0
    개발: int = 0

    class Config:
        populate_by_field_name = True
        allow_population_by_field_name = True


class DepartmentStatEntry(BaseModel):
    """부서별 통계 항목"""

    department: str
    total_count: int = Field(..., alias="totalCount")
    status_counts: Dict[str, int] = Field(..., alias="statusCounts")

    class Config:
        populate_by_field_name = True
        allow_population_by_field_name = True


class VisualizationResponse(BaseModel):
    """시각화 API 응답 모델"""

    success: bool
    message: str
    time_stats: List[TimeStatEntry] = Field([], alias="timeStats")
    department_stats: List[DepartmentStatEntry] = Field([], alias="departmentStats")

    class Config:
        populate_by_field_name = True
        allow_population_by_field_name = True
