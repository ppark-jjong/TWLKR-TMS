"""
시각화 관련 라우트 (관리자 전용)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from backend.utils.logger import logger
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract, text
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from backend.database import get_db
from backend.models.dashboard import Dashboard, OrderStatus, Warehouse, OrderType, Department
from backend.middleware.auth import get_current_user, admin_required

router = APIRouter()


@router.get("/stats", dependencies=[Depends(admin_required)])
async def get_visualization_stats(
    start_date: Optional[str] = Query(None, description="시작 날짜 (ISO 형식)"),
    end_date: Optional[str] = Query(None, description="종료 날짜 (ISO 형식)"),
    visualization_type: Optional[str] = Query("time_based", description="시각화 유형 (time_based 또는 department_based)"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        logger.info(f"시각화 통계 요청 시작: 시각화 유형={visualization_type}, 요청자={current_user['user_id']}")
        # 서비스 로직: 문자열 날짜를 datetime으로 변환
        logger.info(f"날짜 변환 시작: start_date={start_date}, end_date={end_date}")
        start_datetime = None
        end_datetime = None
        
        if start_date:
            try:
                logger.info(f"시작 날짜 변환 시도: {start_date}")
                start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                logger.info(f"시작 날짜 변환 완료: {start_datetime}")
            except ValueError:
                try:
                    # ISO 8601 형식이 아닐 경우 다른 형식 시도
                    logger.info(f"시작 날짜 대체 형식 변환 시도: {start_date}")
                    start_datetime = datetime.strptime(start_date, "%Y-%m-%dT%H:%M:%S.%fZ")
                    logger.info(f"시작 날짜 대체 형식 변환 완료: {start_datetime}")
                except ValueError as e:
                    logger.error(f"시작 날짜 형식 오류: {start_date}, 오류: {str(e)}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"유효하지 않은 시작 날짜 형식: {start_date}"
                    )
        
        if end_date:
            try:
                logger.info(f"종료 날짜 변환 시도: {end_date}")
                end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                logger.info(f"종료 날짜 변환 완료: {end_datetime}")
            except ValueError:
                try:
                    # ISO 8601 형식이 아닐 경우 다른 형식 시도
                    logger.info(f"종료 날짜 대체 형식 변환 시도: {end_date}")
                    end_datetime = datetime.strptime(end_date, "%Y-%m-%dT%H:%M:%S.%fZ")
                    logger.info(f"종료 날짜 대체 형식 변환 완료: {end_datetime}")
                except ValueError as e:
                    logger.error(f"종료 날짜 형식 오류: {end_date}, 오류: {str(e)}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"유효하지 않은 종료 날짜 형식: {end_date}"
                    )
        """
        시각화를 위한 통계 데이터 조회 (관리자 전용)
        시각화 유형: 
        - time_based: 시간대별 접수량 (기본값)
        - department_based: 부서별 접수량
        """
        # 서비스 로직: 날짜 기본값 설정 (기본: 오늘)
        if not start_datetime:
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            start_datetime = today
            end_datetime = today + timedelta(days=1)
            logger.info(f"기본 날짜 설정: 시작={start_datetime}, 종료={end_datetime}")
        elif not end_datetime:
            end_datetime = start_datetime + timedelta(days=1)
            logger.info(f"종료 날짜 자동 설정: 시작+1일={end_datetime}")
        
        # 로그 추가
        logger.info(f"시각화 통계 조회 준비 완료: 시작={start_datetime}, 종료={end_datetime}, 타입={visualization_type}")
        
        # 서비스 로직: 시각화 타입에 따른 데이터 조회
        logger.info(f"시각화 타입 '{visualization_type}' 데이터 조회 시작")
        if visualization_type == "time_based":
            logger.info("시간대별 접수량 통계 조회 요청")
            result = await get_time_based_stats(db, start_datetime, end_datetime)
            logger.info("시간대별 접수량 통계 조회 완료")
            return result
        elif visualization_type == "department_based":
            logger.info("부서별 접수량 통계 조회 요청")
            result = await get_department_based_stats(db, start_datetime, end_datetime)
            logger.info("부서별 접수량 통계 조회 완료")
            return result
        else:
            logger.error(f"지원하지 않는 시각화 유형: {visualization_type}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="지원하지 않는 시각화 유형입니다. 'time_based' 또는 'department_based'를 사용하세요."
            )
    except HTTPException as he:
        # HTTP 예외는 그대로 전달
        logger.warning(f"시각화 통계 HTTP 오류: {he.detail}")
        raise he
    except Exception as e:
        logger.error(f"시각화 통계 조회 중 오류 발생: {str(e)}")
        import traceback
        logger.error(f"상세 오류: {traceback.format_exc()}")
        return {
            "success": False,
            "message": "시각화 통계를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            "error_code": "VISUALIZATION_ERROR"
        }


async def get_time_based_stats(db: Session, start_date: datetime, end_date: datetime):
    """
    시간대별 접수량 통계 조회
    """
    try:
        logger.info(f"시간대별 접수량 통계 조회 시작: 기간={start_date}~{end_date}")
        
        # 서비스 로직: 시간대 정의
        time_slots = [
            {"start": 9, "end": 10, "label": "09-10"}, 
            {"start": 10, "end": 11, "label": "10-11"}, 
            {"start": 11, "end": 12, "label": "11-12"}, 
            {"start": 12, "end": 13, "label": "12-13"}, 
            {"start": 13, "end": 14, "label": "13-14"}, 
            {"start": 14, "end": 15, "label": "14-15"}, 
            {"start": 15, "end": 16, "label": "15-16"}, 
            {"start": 16, "end": 17, "label": "16-17"}, 
            {"start": 17, "end": 18, "label": "17-18"}, 
            {"start": 18, "end": 20, "label": "18-20"}, 
            {"start": 20, "end": 0, "label": "20-00"}, 
            {"start": 0, "end": 9, "label": "00-09"}
        ]
        logger.info(f"시간대 정의 완료: {len(time_slots)}개 시간대")
    
        # 서비스 로직: 각 부서별, 시간대별 접수량 쿼리
        departments = ["CS", "HES", "LENOVO"]
        logger.info(f"부서 목록: {departments}")
        department_time_data = []
        
        for dept in departments:
            logger.info(f"부서 '{dept}' 시간대별 데이터 조회 시작")
            time_data = []
            
            for slot in time_slots:
                start_hour = slot["start"]
                end_hour = slot["end"]
                logger.info(f"부서 '{dept}' 시간대 {slot['label']} 데이터 쿼리 실행")
                
                # 시간대가 자정을 넘는 경우 처리
                if start_hour > end_hour:
                    logger.info(f"자정을 넘는 시간대 처리: {start_hour}~{end_hour}")
                    # 시작 시간부터 자정까지
                    count1_query = db.query(func.count(Dashboard.dashboard_id)).filter(
                        Dashboard.create_time >= start_date,
                        Dashboard.create_time < end_date,
                        Dashboard.department == dept,
                        extract('hour', Dashboard.create_time) >= start_hour
                    )
                    count1 = count1_query.scalar() or 0
                    logger.info(f"시작~자정 카운트: {count1}")
                    
                    # 자정부터 종료 시간까지
                    count2_query = db.query(func.count(Dashboard.dashboard_id)).filter(
                        Dashboard.create_time >= start_date,
                        Dashboard.create_time < end_date,
                        Dashboard.department == dept,
                        extract('hour', Dashboard.create_time) < end_hour
                    )
                    count2 = count2_query.scalar() or 0
                    logger.info(f"자정~종료 카운트: {count2}")
                    
                    count = count1 + count2
                else:
                    # 일반적인 시간대 쿼리
                    count_query = db.query(func.count(Dashboard.dashboard_id)).filter(
                        Dashboard.create_time >= start_date,
                        Dashboard.create_time < end_date,
                        Dashboard.department == dept,
                        extract('hour', Dashboard.create_time) >= start_hour,
                        extract('hour', Dashboard.create_time) < end_hour
                    )
                    count = count_query.scalar() or 0
                
                logger.info(f"부서 '{dept}' 시간대 {slot['label']} 접수량: {count}건")
                time_data.append({
                    "time_slot": slot["label"],
                    "count": count
                })
            
            logger.info(f"부서 '{dept}' 전체 시간대 데이터 수집 완료")
            department_time_data.append({
                "department": dept,
                "data": time_data
            })
    
        # 응답 준비 및 반환
        result = {
            "success": True,
            "message": "시간대별 접수량 조회 성공",
            "data": {
                "visualization_type": "time_based",
                "start_date": start_date,
                "end_date": end_date,
                "departments": department_time_data
            }
        }
        logger.info("시간대별 접수량 통계 조회 완료")
        return result
    except Exception as e:
        logger.error(f"시간대별 통계 조회 중 오류 발생: {str(e)}")
        import traceback
        logger.error(f"상세 오류: {traceback.format_exc()}")
        # 호출자에게 예외 전파
        raise


async def get_department_based_stats(db: Session, start_date: datetime, end_date: datetime):
    """
    부서별 접수량 통계 조회
    각 부서별 상태 비율을 원그래프 데이터로 제공
    """
    departments = ["CS", "HES", "LENOVO"]
    statuses = ["WAITING", "IN_PROGRESS", "COMPLETE", "ISSUE", "CANCEL"]
    
    department_stats = []
    
    for dept in departments:
        # 부서별 총 건수
        total_count = db.query(func.count(Dashboard.dashboard_id)).filter(
            Dashboard.eta >= start_date,
            Dashboard.eta < end_date,
            Dashboard.department == dept
        ).scalar() or 0
        
        # 부서별 상태 통계
        status_data = []
        
        for status_val in statuses:
            count = db.query(func.count(Dashboard.dashboard_id)).filter(
                Dashboard.eta >= start_date,
                Dashboard.eta < end_date,
                Dashboard.department == dept,
                Dashboard.status == status_val
            ).scalar() or 0
            
            # 비율 계산 (소수점 2자리까지)
            ratio = round((count / total_count * 100), 2) if total_count > 0 else 0
            
            # 상태 정보에 따른 색상 매핑
            color = "#808080"  # 기본 회색
            if status_val == "WAITING":
                color = "#1890FF"  # 파란색
            elif status_val == "IN_PROGRESS":
                color = "#FAAD14"  # 노란색
            elif status_val == "COMPLETE":
                color = "#52C41A"  # 녹색
            elif status_val == "ISSUE":
                color = "#FF4D4F"  # 빨간색
            elif status_val == "CANCEL":
                color = "#D9D9D9"  # 회색
            
            status_data.append({
                "status": status_val,
                "count": count,
                "ratio": ratio,
                "color": color
            })
        
        department_stats.append({
            "department": dept,
            "total_count": total_count,
            "status_data": status_data
        })
    
    return {
        "success": True,
        "message": "부서별 접수량 조회 성공",
        "data": {
            "visualization_type": "department_based",
            "start_date": start_date,
            "end_date": end_date,
            "departments": department_stats
        }
    }