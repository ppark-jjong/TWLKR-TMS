"""
시각화 관련 라우터
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, Path, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, distinct, text
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from backend.database import get_db
from backend.models.dashboard import Dashboard
from backend.schemas.common import SuccessResponse, ErrorResponse
from backend.utils.security import get_current_user, get_admin_user
from backend.utils.logger import logger

router = APIRouter()


@router.get("/time-stats", response_model=SuccessResponse)
async def get_time_stats(
    request: Request = None,
    start_date: Optional[datetime] = Query(None, alias="startDate"),
    end_date: Optional[datetime] = Query(None, alias="endDate"),
    db: Session = Depends(get_db)
):
    """
    시간대별 접수량 통계 (관리자 전용)
    - start_date, end_date: 기간 필터링
    """
    try:
        # 관리자 권한 확인
        admin_data = get_admin_user(get_current_user(request))
        
        # 기본 날짜 설정 (기간이 지정되지 않은 경우 기본값 설정)
        if not start_date:
            start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=7)
        if not end_date:
            end_date = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999)
        
        # 시간대 별 접수량 통계 쿼리
        # - 09~18시: 1시간 단위
        # - 18~20, 20~00, 00~09: 구간별
        time_stats_query = """
        SELECT 
            department,
            CASE 
                WHEN HOUR(create_time) = 9 THEN '09-10'
                WHEN HOUR(create_time) = 10 THEN '10-11'
                WHEN HOUR(create_time) = 11 THEN '11-12'
                WHEN HOUR(create_time) = 12 THEN '12-13'
                WHEN HOUR(create_time) = 13 THEN '13-14'
                WHEN HOUR(create_time) = 14 THEN '14-15'
                WHEN HOUR(create_time) = 15 THEN '15-16'
                WHEN HOUR(create_time) = 16 THEN '16-17'
                WHEN HOUR(create_time) = 17 THEN '17-18'
                WHEN HOUR(create_time) BETWEEN 18 AND 19 THEN '18-20'
                WHEN HOUR(create_time) BETWEEN 20 AND 23 THEN '20-00'
                ELSE '00-09'
            END AS time_range,
            COUNT(*) AS count
        FROM dashboard
        WHERE create_time BETWEEN :start_date AND :end_date
        GROUP BY department, time_range
        ORDER BY 
            department,
            CASE time_range
                WHEN '00-09' THEN 1
                WHEN '09-10' THEN 2
                WHEN '10-11' THEN 3
                WHEN '11-12' THEN 4
                WHEN '12-13' THEN 5
                WHEN '13-14' THEN 6
                WHEN '14-15' THEN 7
                WHEN '15-16' THEN 8
                WHEN '16-17' THEN 9
                WHEN '17-18' THEN 10
                WHEN '18-20' THEN 11
                WHEN '20-00' THEN 12
            END
        """
        
        time_stats_result = db.execute(
            text(time_stats_query), 
            {"start_date": start_date, "end_date": end_date}
        ).fetchall()
        
        # 결과 가공
        time_stats = []
        for row in time_stats_result:
            time_stats.append({
                "department": row[0],
                "timeRange": row[1],
                "count": row[2]
            })
        
        # 응답 데이터
        return SuccessResponse(
            success=True,
            message="시간대별 접수량 통계 조회 성공",
            data={
                "visualizationType": "time_stats",
                "startDate": start_date,
                "endDate": end_date,
                "timeStats": time_stats
            }
        ).model_dump()
        
    except HTTPException as e:
        return ErrorResponse(
            success=False,
            message=e.detail
        ).model_dump()
    except Exception as e:
        logger.error(f"시간대별 접수량 통계 조회 중 오류: {str(e)}")
        return ErrorResponse(
            success=False,
            message="시간대별 접수량 통계 조회 중 오류가 발생했습니다"
        ).model_dump()


@router.get("/department-stats", response_model=SuccessResponse)
async def get_department_stats(
    request: Request = None,
    start_date: Optional[datetime] = Query(None, alias="startDate"),
    end_date: Optional[datetime] = Query(None, alias="endDate"),
    db: Session = Depends(get_db)
):
    """
    부서별 상태 현황 통계 (관리자 전용)
    - start_date, end_date: 기간 필터링
    """
    try:
        # 관리자 권한 확인
        admin_data = get_admin_user(get_current_user(request))
        
        # 기본 날짜 설정 (기간이 지정되지 않은 경우 기본값 설정)
        if not start_date:
            start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=7)
        if not end_date:
            end_date = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999)
        
        # 부서별 상태 현황 쿼리
        department_stats_query = """
        SELECT 
            department,
            status,
            COUNT(*) AS count
        FROM dashboard
        WHERE eta BETWEEN :start_date AND :end_date
        GROUP BY department, status
        ORDER BY department, status
        """
        
        department_stats_result = db.execute(
            text(department_stats_query), 
            {"start_date": start_date, "end_date": end_date}
        ).fetchall()
        
        # 결과 가공
        department_stats = []
        for row in department_stats_result:
            department_stats.append({
                "department": row[0],
                "status": row[1],
                "count": row[2]
            })
        
        # 응답 데이터
        return SuccessResponse(
            success=True,
            message="부서별 상태 현황 통계 조회 성공",
            data={
                "visualizationType": "department_stats",
                "startDate": start_date,
                "endDate": end_date,
                "departmentStats": department_stats
            }
        ).model_dump()
        
    except HTTPException as e:
        return ErrorResponse(
            success=False,
            message=e.detail
        ).model_dump()
    except Exception as e:
        logger.error(f"부서별 상태 현황 통계 조회 중 오류: {str(e)}")
        return ErrorResponse(
            success=False,
            message="부서별 상태 현황 통계 조회 중 오류가 발생했습니다"
        ).model_dump()
