"""
시각화 관련 라우트 (관리자 전용)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from backend.utils.logger import logger
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from backend.database import get_db
from backend.models.dashboard import Dashboard, OrderStatus
from backend.middleware.auth import get_current_user, admin_required
from backend.services.visualization_service import get_visualization_stats as service_get_stats

router = APIRouter()


@router.get("/stats", dependencies=[Depends(admin_required)])
async def get_visualization_stats(
    start_date: Optional[str] = Query(None, description="시작 날짜 (ISO 형식)"),
    end_date: Optional[str] = Query(None, description="종료 날짜 (ISO 형식)"),
    visualization_type: Optional[str] = Query("time_based", description="시각화 유형 (time_based 또는 department_based)"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    시각화를 위한 통계 데이터 조회 (관리자 전용)
    시각화 유형: 
    - time_based: 시간대별 접수량 (기본값)
    - department_based: 부서별 접수량
    """
    try:
        # 요청 로깅
        logger.api(f"시각화 통계 요청 - 사용자: {current_user['user_id']}, 타입: {visualization_type}")
        
        # 서비스 레이어 호출
        result = service_get_stats(
            db=db,
            start_date=start_date,
            end_date=end_date,
            visualization_type=visualization_type
        )
        
        return result
    except Exception as e:
        logger.error(f"시각화 통계 조회 중 오류 발생: {str(e)}")
        return {
            "success": False,
            "message": "시각화 통계를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            "error_code": "VISUALIZATION_ERROR"
        }


# 모든 비즈니스 로직이 서비스 레이어로 이동했으므로 이 부분 제거