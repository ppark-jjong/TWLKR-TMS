"""
시각화 데이터 API 라우트
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from backend.services.visualization_service import VisualizationService
from backend.auth.auth_handler import get_current_user
from backend.models.user import User
from backend.models.visualization import VisualizationResponse

router = APIRouter(prefix="/visualization", tags=["visualization"])


@router.get("/stats", response_model=VisualizationResponse)
async def get_visualization_data(
    visualization_type: str = Query(
        "time", description="시각화 유형 (time/department)"
    ),
    date_from: Optional[str] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
) -> VisualizationResponse:
    """시각화 데이터 조회 API

    Args:
        visualization_type: 시각화 유형 (time 또는 department)
        date_from: 시작 날짜 (YYYY-MM-DD)
        date_to: 종료 날짜 (YYYY-MM-DD)
        current_user: 현재 인증된 사용자

    Returns:
        VisualizationResponse: 시각화 데이터 응답 객체
    """
    # 관리자 권한 확인
    if current_user.role != "ADMIN":
        return VisualizationResponse(
            success=False,
            message="관리자 권한이 필요합니다.",
            timeStats=[],
            departmentStats=[],
        )

    # 시각화 서비스 호출
    visualization_service = VisualizationService()
    return visualization_service.get_visualization_stats(
        date_from=date_from, date_to=date_to, visualization_type=visualization_type
    )
