"""
시각화 관련 비즈니스 로직
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models.dashboard import Dashboard
from backend.models.visualization import (
    TimeStatEntry,
    DepartmentStatEntry,
    DepartmentStatusCounts,
    VisualizationData,
    VisualizationResponse,
)
from backend.utils.logger import logger
from backend.utils.date_utils import get_date_range


def get_visualization_stats(
    db: Session,
    start_date: Optional[str],
    end_date: Optional[str],
    visualization_type: str = "time_based",
) -> Dict[str, Any]:
    """
    시각화용 통계 데이터 조회 (라우트에서 Pydantic 변환)
    """
    start_datetime, end_datetime = get_date_range(start_date, end_date)
    logger.db(
        f"시각화 데이터 조회 - 기간: {start_datetime.strftime('%Y-%m-%d')} ~ {end_datetime.strftime('%Y-%m-%d')}, 타입: {visualization_type}"
    )

    response_data = VisualizationData(
        visualizationType=visualization_type,
        startDate=start_datetime,
        endDate=end_datetime,
    )
    message = ""

    if visualization_type == "time_based":
        time_stats = get_time_based_stats(db, start_datetime, end_datetime)
        response_data.timeStats = time_stats
        message = "시간대별 접수량 통계 조회 성공"

    elif visualization_type == "department_based":
        department_stats = get_department_based_stats(db, start_datetime, end_datetime)
        response_data.departmentStats = department_stats
        message = "부서별 상태 통계 조회 성공"

    else:
        return {
            "success": False,
            "message": f"지원하지 않는 시각화 타입: {visualization_type}",
            "data": None,
        }

    # 라우트에서 VisualizationResponse로 변환할 수 있도록 Dict 반환
    return {
        "success": True,
        "message": message,
        "data": response_data.dict(by_alias=True),
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
        time_ranges.append(
            {
                "name": f"{hour:02d}:00~{hour+1:02d}:00",
                "start_hour": hour,
                "end_hour": hour + 1,
            }
        )

    # 추가 시간대
    time_ranges.extend(
        [
            {"name": "18:00~20:00", "start_hour": 18, "end_hour": 20},
            {"name": "20:00~00:00", "start_hour": 20, "end_hour": 24},
            {"name": "00:00~09:00", "start_hour": 0, "end_hour": 9},
        ]
    )

    # 결과 데이터 초기화
    departments = ["CS", "HES", "LENOVO"]
    results = []

    # 각 시간대별 데이터 조회
    for time_range in time_ranges:
        # TimeStatEntry 모델 구조에 맞는 Dict 생성 (camelCase 키 사용)
        entry_dict = {TimeStatEntry.__fields__["time_range"].alias: time_range["name"]}

        for dept in departments:
            # 해당 시간대, 해당 부서의 주문 수 조회
            count = (
                db.query(func.count(Dashboard.dashboard_id))
                .filter(
                    Dashboard.create_time >= start_datetime,
                    Dashboard.create_time < end_datetime,
                    Dashboard.department == dept,
                    # 시간대 필터링
                    func.extract("hour", Dashboard.create_time)
                    >= time_range["start_hour"],
                    func.extract("hour", Dashboard.create_time)
                    < time_range["end_hour"],
                )
                .scalar()
                or 0
            )

            entry_dict[dept] = count  # CS, HES, LENOVO는 alias 없음

        results.append(entry_dict)

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
        status_counts_query = (
            db.query(
                Dashboard.status, func.count(Dashboard.dashboard_id).label("count")
            )
            .filter(
                Dashboard.eta >= start_datetime,
                Dashboard.eta < end_datetime,
                Dashboard.department == dept,
            )
            .group_by(Dashboard.status)
            .all()
        )

        # DepartmentStatusCounts 구조에 맞는 Dict 생성
        status_data_dict = {
            field_name: 0 for field_name in DepartmentStatusCounts.__fields__
        }
        total_count = 0
        for status_name, count in status_counts_query:
            if status_name in status_data_dict:
                status_data_dict[status_name] = count
            total_count += count

        # DepartmentStatEntry 구조에 맞는 Dict 생성 (camelCase 키 사용)
        entry_dict = {
            "department": dept,
            DepartmentStatEntry.__fields__["total_count"].alias: total_count,
            DepartmentStatEntry.__fields__["status_counts"].alias: status_data_dict,
        }
        results.append(entry_dict)

    return results
