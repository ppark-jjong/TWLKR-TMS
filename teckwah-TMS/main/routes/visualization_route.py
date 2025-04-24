"""
시각화(데이터 대시보드) 관련 라우터
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query, Path, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from main.core.templating import templates
from main.utils.database import get_db
from main.utils.security import get_admin_user  # 관리자 전용 페이지
from main.utils.logger import logger
from main.service.dashboard_service import (
    get_time_block_stats,
    get_department_status_stats,
    get_daily_trend_stats
)

# 라우터 생성 (관리자 전용)
router = APIRouter()

@router.get("")
async def visualization_page(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),  # 관리자만 접근 가능
):
    """
    시각화 페이지 렌더링 (관리자 전용)
    """
    try:
        logger.info(f"시각화 페이지 접근: 사용자 '{current_user.get('user_id')}'")
        
        # 템플릿 렌더링
        return templates.TemplateResponse(
            "visualization.html",
            {
                "request": request,
                "user": current_user,
            }
        )
    except Exception as e:
        logger.error(f"시각화 페이지 렌더링 중 오류 발생: {str(e)}", exc_info=True)
        # 오류 발생 시 에러 페이지 렌더링
        return templates.TemplateResponse(
            "error.html",
            {
                "request": request,
                "error_message": "시각화 페이지를 불러오는 중 오류가 발생했습니다.",
                "error_detail": str(e),
            },
            status_code=500
        )

@router.get("/api/time-blocks")
async def get_time_block_chart_data(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),  # 관리자만 접근 가능
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """
    시간대별 접수량 차트 데이터 API (관리자 전용)
    """
    try:
        # 날짜 기본값 설정
        today = datetime.now().date()
        start = today
        end = today
        
        # URL 파라미터에서 날짜 가져오기
        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d").date()
            except ValueError:
                logger.warning(f"잘못된 시작 날짜 형식: {start_date}. 오늘 날짜로 대체합니다.")
        
        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d").date()
            except ValueError:
                logger.warning(f"잘못된 종료 날짜 형식: {end_date}. 오늘 날짜로 대체합니다.")
                
        # 시간대별 통계 조회
        stats = get_time_block_stats(db, start, end)
        
        # 응답 데이터 구성
        time_blocks = ["09-18", "18-20", "20-00", "00-09"]
        departments = ["CS", "HES", "LENOVO"]
        
        # 차트 데이터 형식으로 변환
        chart_data = []
        for block in time_blocks:
            block_data = {
                "timeBlock": block,
                "total": 0,
            }
            
            for dept in departments:
                # stats에서 해당 시간대, 부서의 건수 찾기
                count = 0
                for stat in stats:
                    if stat["time_block"] == block and stat["department"] == dept:
                        count = stat["count"]
                        block_data["total"] += count
                        break
                
                block_data[dept] = count
                
            chart_data.append(block_data)
        
        return {
            "success": True, 
            "data": chart_data,
            "timeRange": {
                "start": start.strftime("%Y-%m-%d"),
                "end": end.strftime("%Y-%m-%d")
            }
        }
    except Exception as e:
        logger.error(f"시간대별 통계 조회 중 오류 발생: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "시간대별 통계 조회 중 오류가 발생했습니다."}
        )

@router.get("/api/department-status")
async def get_department_status_data(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),  # 관리자만 접근 가능
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """
    부서별 상태 현황 차트 데이터 API (관리자 전용)
    """
    try:
        # 날짜 기본값 설정
        today = datetime.now().date()
        start = today
        end = today
        
        # URL 파라미터에서 날짜 가져오기
        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d").date()
            except ValueError:
                logger.warning(f"잘못된 시작 날짜 형식: {start_date}. 오늘 날짜로 대체합니다.")
        
        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d").date()
            except ValueError:
                logger.warning(f"잘못된 종료 날짜 형식: {end_date}. 오늘 날짜로 대체합니다.")
                
        # 부서별 상태 통계 조회
        stats = get_department_status_stats(db, start, end)
        
        # 응답 데이터 구성
        departments = ["CS", "HES", "LENOVO"]
        statuses = ["WAITING", "IN_PROGRESS", "COMPLETE", "ISSUE", "CANCEL"]
        status_labels = {
            "WAITING": "대기",
            "IN_PROGRESS": "진행",
            "COMPLETE": "완료",
            "ISSUE": "이슈",
            "CANCEL": "취소"
        }
        
        # 부서별 데이터 구성
        dept_data = {}
        for dept in departments:
            dept_data[dept] = {
                "total": 0,
                "statuses": []
            }
            
            for status in statuses:
                # stats에서 해당 부서, 상태의 건수 찾기
                count = 0
                for stat in stats:
                    if stat["department"] == dept and stat["status"] == status:
                        count = stat["count"]
                        dept_data[dept]["total"] += count
                        break
                
                dept_data[dept]["statuses"].append({
                    "status": status,
                    "label": status_labels[status],
                    "count": count
                })
        
        return {
            "success": True, 
            "data": dept_data,
            "timeRange": {
                "start": start.strftime("%Y-%m-%d"),
                "end": end.strftime("%Y-%m-%d")
            }
        }
    except Exception as e:
        logger.error(f"부서별 상태 통계 조회 중 오류 발생: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "부서별 상태 통계 조회 중 오류가 발생했습니다."}
        )

@router.get("/api/daily-trend")
async def get_daily_trend_data(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),  # 관리자만 접근 가능
    days: int = Query(7, ge=1, le=30),  # 기본값 7일, 최대 30일
):
    """
    일별 주문 추세 차트 데이터 API (관리자 전용)
    """
    try:
        # 날짜 범위 계산 (오늘 포함 최근 N일)
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days-1)  # days-1 일 전부터 (오늘 포함)
        
        # 일별 주문 통계 조회
        stats = get_daily_trend_stats(db, start_date, end_date)
        
        # 날짜 리스트 생성 (시작일부터 종료일까지)
        date_range = []
        current_date = start_date
        while current_date <= end_date:
            date_range.append(current_date)
            current_date = current_date + timedelta(days=1)
        
        # 차트 데이터 형식으로 변환
        chart_data = []
        for date in date_range:
            date_str = date.strftime("%Y-%m-%d")
            day_data = {
                "date": date_str,
                "dayOfWeek": date.strftime("%a"),
                "total": 0,
                "WAITING": 0,
                "IN_PROGRESS": 0,
                "COMPLETE": 0,
                "ISSUE": 0,
                "CANCEL": 0
            }
            
            # stats에서 해당 날짜의 데이터 찾기
            for stat in stats:
                if stat["date"].strftime("%Y-%m-%d") == date_str:
                    status = stat["status"]
                    count = stat["count"]
                    day_data[status] = count
                    day_data["total"] += count
            
            chart_data.append(day_data)
        
        return {
            "success": True, 
            "data": chart_data,
            "timeRange": {
                "start": start_date.strftime("%Y-%m-%d"),
                "end": end_date.strftime("%Y-%m-%d"),
                "days": days
            }
        }
    except Exception as e:
        logger.error(f"일별 추세 통계 조회 중 오류 발생: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "일별 추세 통계 조회 중 오류가 발생했습니다."}
        )

@router.get("/api/summary")
async def get_summary_stats(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),  # 관리자만 접근 가능
    period: str = Query("today", enum=["today", "week", "month"]),
):
    """
    요약 통계 데이터 API (관리자 전용)
    """
    try:
        # 날짜 범위 계산
        today = datetime.now().date()
        
        if period == "today":
            start_date = today
            end_date = today
        elif period == "week":
            start_date = today - timedelta(days=6)  # 오늘 포함 최근 7일
            end_date = today
        elif period == "month":
            start_date = today - timedelta(days=29)  # 오늘 포함 최근 30일
            end_date = today
        else:
            start_date = today
            end_date = today
            
        # 각 API 호출하여 통계 데이터 조합
        # (실제로는 더 효율적인 통합 쿼리를 만들겠지만, 예시로 기존 API 재사용)
        
        # 임의의 예시 데이터 (실제로는 DB 쿼리 결과를 사용)
        summary_data = {
            "total": 120,
            "waiting": 25,
            "in_progress": 35,
            "complete": 40,
            "issue": 15,
            "cancel": 5,
            "delayed": 10,  # 지연된 배송 (ETA를 초과한 배송)
        }
        
        return {
            "success": True, 
            "data": summary_data,
            "timeRange": {
                "start": start_date.strftime("%Y-%m-%d"),
                "end": end_date.strftime("%Y-%m-%d"),
                "period": period
            }
        }
    except Exception as e:
        logger.error(f"요약 통계 조회 중 오류 발생: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "요약 통계 조회 중 오류가 발생했습니다."}
        )
