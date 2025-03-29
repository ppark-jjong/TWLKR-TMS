# teckwah_project/server/api/visualization_router.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, cast, Integer, and_
from typing import Dict, List, Optional
from datetime import datetime, timedelta

from server.config.database import get_db
from server.api.deps import get_current_user
from server.schemas.auth_schema import TokenData
from server.models.dashboard_model import Dashboard
from server.schemas.visualization_schema import (
    DeliveryStatusData,
    HourlyOrdersData,
    DeliveryStatusByWarehouse,
    HourlyDistribution,
)
from server.schemas.common_schema import ApiResponse, MetaBuilder
from server.utils.error import error_handler
from server.utils.datetime import get_kst_now, get_date_range, format_datetime

router = APIRouter(prefix="/visualization", tags=["시각화"])


@router.get("/delivery-status", response_model=ApiResponse[DeliveryStatusData])
@error_handler("배송 현황 데이터 조회")
async def get_delivery_status(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """배송 현황 시각화 데이터 조회 API"""

    # 날짜 범위 계산
    date_range = get_date_range(start_date, end_date)
    start = date_range["start_date"]
    end = date_range["end_date"]

    # 창고별 배송 현황 데이터 조회
    delivery_status_data = []
    for warehouse in ["SEOUL", "BUSAN", "GWANGJU", "DAEJEON"]:
        query = (
            db.query(
                Dashboard.status, func.count(Dashboard.dashboard_id).label("count")
            )
            .filter(
                Dashboard.create_time.between(start, end),
                Dashboard.warehouse == warehouse,
            )
            .group_by(Dashboard.status)
        )

        # 결과 가공
        result = {row.status: row.count for row in query.all()}

        # 모든 상태에 대한 데이터 포함
        delivery_status_data.append(
            DeliveryStatusByWarehouse(
                warehouse=warehouse,
                waiting=result.get("WAITING", 0),
                in_progress=result.get("IN_PROGRESS", 0),
                complete=result.get("COMPLETE", 0),
                issue=result.get("ISSUE", 0),
                cancel=result.get("CANCEL", 0),
                total=sum(result.values()),
            )
        )

    # 전체 집계
    total_query = (
        db.query(Dashboard.status, func.count(Dashboard.dashboard_id).label("count"))
        .filter(Dashboard.create_time.between(start, end))
        .group_by(Dashboard.status)
    )

    total_result = {row.status: row.count for row in total_query.all()}
    overall = DeliveryStatusByWarehouse(
        warehouse="TOTAL",
        waiting=total_result.get("WAITING", 0),
        in_progress=total_result.get("IN_PROGRESS", 0),
        complete=total_result.get("COMPLETE", 0),
        issue=total_result.get("ISSUE", 0),
        cancel=total_result.get("CANCEL", 0),
        total=sum(total_result.values()),
    )

    return ApiResponse(
        success=True,
        message="배송 현황 데이터를 조회했습니다",
        data=DeliveryStatusData(by_warehouse=delivery_status_data, overall=overall),
        meta=MetaBuilder.date_range(start, end),
    )


@router.get("/hourly-orders", response_model=ApiResponse[HourlyOrdersData])
@error_handler("시간대별 접수량 데이터 조회")
async def get_hourly_orders(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """시간대별 접수량 시각화 데이터 조회 API"""

    # 날짜 범위 계산
    date_range = get_date_range(start_date, end_date)
    start = date_range["start_date"]
    end = date_range["end_date"]

    # 시간대별 접수량 데이터 조회
    hourly_data = []
    for hour in range(24):
        next_hour = (hour + 1) % 24

        # 해당 시간대의 접수량 조회
        query = db.query(func.count(Dashboard.dashboard_id).label("count")).filter(
            Dashboard.create_time.between(start, end),
            func.extract("hour", Dashboard.create_time) == hour,
        )

        count = query.scalar() or 0

        hourly_data.append(
            HourlyDistribution(hour=f"{hour:02d}:00-{next_hour:02d}:00", count=count)
        )

    # 부서별 시간대 접수량 (상위 3개 시간대만)
    department_peak_hours = {}
    for department in ["CS", "HES", "LENOVO"]:
        # 부서별 시간대 접수량 조회
        dept_hourly_query = (
            db.query(
                func.extract("hour", Dashboard.create_time).label("hour"),
                func.count(Dashboard.dashboard_id).label("count"),
            )
            .filter(
                Dashboard.create_time.between(start, end),
                Dashboard.department == department,
            )
            .group_by("hour")
            .order_by(func.count(Dashboard.dashboard_id).desc())
            .limit(3)
        )

        peak_hours = [
            {"hour": int(row.hour), "count": row.count}
            for row in dept_hourly_query.all()
        ]

        department_peak_hours[department] = peak_hours

    return ApiResponse(
        success=True,
        message="시간대별 접수량 데이터를 조회했습니다",
        data=HourlyOrdersData(
            hourly_distribution=hourly_data, department_peak_hours=department_peak_hours
        ),
        meta=MetaBuilder.date_range(start, end),
    )


@router.get("/date-range", response_model=ApiResponse[Dict[str, str]])
@error_handler("시각화 날짜 범위 조회")
async def get_visualization_date_range(
    db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)
):
    """시각화 가능 날짜 범위 조회 API"""

    # 가장 오래된 데이터와 최신 데이터의 날짜 조회
    oldest_create_time = db.query(func.min(Dashboard.create_time)).scalar()
    latest_create_time = db.query(func.max(Dashboard.create_time)).scalar()

    # 데이터가 없는 경우 현재를 기준으로 범위 설정
    if not oldest_create_time or not latest_create_time:
        now = get_kst_now()
        oldest_create_time = now - timedelta(days=30)
        latest_create_time = now

    # 응답 생성
    date_range = {
        "oldest_date": format_datetime(oldest_create_time, "%Y-%m-%d"),
        "latest_date": format_datetime(latest_create_time, "%Y-%m-%d"),
    }

    return ApiResponse(
        success=True, message="날짜 범위를 조회했습니다", data=date_range
    )
