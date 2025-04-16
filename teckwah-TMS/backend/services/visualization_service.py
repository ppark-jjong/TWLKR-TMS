"""
시각화 관련 비즈니스 로직
"""
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models.dashboard import Dashboard
from backend.utils.logger import logger
from backend.utils.date_utils import get_date_range


def get_visualization_stats(
    db: Session,
    start_date: Optional[str],
    end_date: Optional[str],
    visualization_type: str = "time_based",
) -> Dict[str, Any]:
    """
    시각화용 통계 데이터 조회
    
    Args:
        db: 데이터베이스 세션
        start_date: 시작 날짜 (ISO 형식)
        end_date: 종료 날짜 (ISO 형식)
        visualization_type: 시각화 타입 (time_based 또는 department_based)
        
    Returns:
        시각화 데이터
    """
    # 날짜 범위 구하기
    start_datetime, end_datetime = get_date_range(start_date, end_date)
    
    # 로깅
    logger.db(f"시각화 데이터 조회 - 기간: {start_datetime.strftime('%Y-%m-%d')} ~ {end_datetime.strftime('%Y-%m-%d')}, 타입: {visualization_type}")
    
    # 시각화 데이터 구성
    if visualization_type == "time_based":
        # 시간대별 접수량 (create_time 기준)
        time_stats = get_time_based_stats(db, start_datetime, end_datetime)
        
        return {
            "success": True,
            "message": "시간대별 접수량 통계 조회 성공",
            "data": {
                "visualization_type": visualization_type,
                "start_date": start_datetime,
                "end_date": end_datetime,
                "time_stats": time_stats,
            },
        }
    
    elif visualization_type == "department_based":
        # 부서별 상태 현황 (ETA 기준)
        department_stats = get_department_based_stats(db, start_datetime, end_datetime)
        
        return {
            "success": True,
            "message": "부서별 상태 통계 조회 성공",
            "data": {
                "visualization_type": visualization_type,
                "start_date": start_datetime,
                "end_date": end_datetime,
                "department_stats": department_stats,
            },
        }
    
    else:
        return {
            "success": False,
            "message": f"지원하지 않는 시각화 타입: {visualization_type}",
            "data": None,
        }


def get_time_based_stats(
    db: Session, start_datetime: datetime, end_datetime: datetime
) -> List[Dict[str, Any]]:
    """
    시간대별 접수량 통계 (create_time 기준)
    09~18시(1시간 단위), 18~20, 20~00, 00~09 구간별 주문 건수
    
    Returns:
        시간대별 통계 데이터
    """
    # 시간대 정의
    time_ranges = []
    
    # 09~18시 (1시간 단위)
    for hour in range(9, 18):
        time_ranges.append({
            "name": f"{hour:02d}:00~{hour+1:02d}:00",
            "start_hour": hour,
            "end_hour": hour + 1,
        })
    
    # 추가 시간대
    time_ranges.extend([
        {"name": "18:00~20:00", "start_hour": 18, "end_hour": 20},
        {"name": "20:00~00:00", "start_hour": 20, "end_hour": 24},
        {"name": "00:00~09:00", "start_hour": 0, "end_hour": 9},
    ])
    
    # 결과 데이터 초기화
    departments = ["CS", "HES", "LENOVO"]
    results = []
    
    # 각 시간대별 데이터 조회
    for time_range in time_ranges:
        entry = {"time_range": time_range["name"]}
        
        for dept in departments:
            # 해당 시간대, 해당 부서의 주문 수 조회
            count = (
                db.query(func.count(Dashboard.dashboard_id))
                .filter(
                    Dashboard.create_time >= start_datetime,
                    Dashboard.create_time < end_datetime,
                    Dashboard.department == dept,
                    # 시간대 필터링
                    func.extract('hour', Dashboard.create_time) >= time_range["start_hour"],
                    func.extract('hour', Dashboard.create_time) < time_range["end_hour"],
                )
                .scalar() or 0
            )
            
            entry[dept] = count
        
        results.append(entry)
    
    return results


def get_department_based_stats(
    db: Session, start_datetime: datetime, end_datetime: datetime
) -> List[Dict[str, Any]]:
    """
    부서별 상태 현황 통계 (ETA 기준)
    
    Returns:
        부서별 상태 통계 데이터
    """
    # 부서 목록
    departments = ["CS", "HES", "LENOVO"]
    
    # 결과 데이터 초기화
    results = []
    
    # 각 부서별 데이터 조회
    for dept in departments:
        # 상태별 카운트 조회
        status_counts = (
            db.query(Dashboard.status, func.count(Dashboard.dashboard_id).label("count"))
            .filter(
                Dashboard.eta >= start_datetime,
                Dashboard.eta < end_datetime,
                Dashboard.department == dept,
            )
            .group_by(Dashboard.status)
            .all()
        )
        
        # 상태별 카운트 변환
        status_data = {
            "WAITING": 0,
            "IN_PROGRESS": 0,
            "COMPLETE": 0,
            "ISSUE": 0,
            "CANCEL": 0,
        }
        
        total_count = 0
        for status_name, count in status_counts:
            status_data[status_name] = count
            total_count += count
        
        # 결과에 추가
        results.append({
            "department": dept,
            "total_count": total_count,
            "status_counts": status_data,
        })
    
    return results
