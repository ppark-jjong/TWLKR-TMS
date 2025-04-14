"""
시각화 관련 라우트 (관리자 전용)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.utils.logger import logger
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract, text
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.dashboard import Dashboard, OrderStatus, Warehouse, OrderType
from app.middleware.auth import get_current_user, admin_required

router = APIRouter()

@router.get("/stats", dependencies=[Depends(admin_required)])
async def get_visualization_stats(
    start_date: Optional[datetime] = Query(None, description="시작 날짜"),
    end_date: Optional[datetime] = Query(None, description="종료 날짜"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    시각화를 위한 통계 데이터 조회 (관리자 전용)
    """
    # 날짜 기본값 설정 (기본: 저번 주)
    if not start_date:
        today = datetime.now()
        start_date = today - timedelta(days=today.weekday() + 7)  # 저번 주 월요일
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if not end_date:
        end_date = start_date + timedelta(days=7)  # 일주일
    
    # 1. 일별 주문 건수
    daily_orders = db.query(
        func.date(Dashboard.eta).label("date"),
        func.count(Dashboard.dashboard_id).label("count")
    ).filter(
        Dashboard.eta >= start_date,
        Dashboard.eta < end_date
    ).group_by(
        func.date(Dashboard.eta)
    ).all()
    
    daily_orders_data = [{"date": str(date), "count": count} for date, count in daily_orders]
    
    # 2. 상태별 주문 비율
    status_counts = db.query(
        Dashboard.status,
        func.count(Dashboard.dashboard_id).label("count")
    ).filter(
        Dashboard.eta >= start_date,
        Dashboard.eta < end_date
    ).group_by(
        Dashboard.status
    ).all()
    
    status_data = [{"status": status, "count": count} for status, count in status_counts]
    
    # 3. 창고별 주문 건수
    warehouse_counts = db.query(
        Dashboard.warehouse,
        func.count(Dashboard.dashboard_id).label("count")
    ).filter(
        Dashboard.eta >= start_date,
        Dashboard.eta < end_date
    ).group_by(
        Dashboard.warehouse
    ).all()
    
    warehouse_data = [{"warehouse": warehouse, "count": count} for warehouse, count in warehouse_counts]
    
    # 4. 평균 배송 소요 시간 (완료된 주문 기준)
    avg_delivery_time = db.query(
        func.avg(
            func.timestampdiff(
                text("MINUTE"), 
                Dashboard.depart_time, 
                Dashboard.complete_time
            )
        ).label("avg_minutes")
    ).filter(
        Dashboard.eta >= start_date,
        Dashboard.eta < end_date,
        Dashboard.status == OrderStatus.COMPLETE,
        Dashboard.depart_time.isnot(None),
        Dashboard.complete_time.isnot(None)
    ).scalar()
    
    # 5. 창고별 평균 배송 거리
    avg_distance_by_warehouse = db.query(
        Dashboard.warehouse,
        func.avg(Dashboard.distance).label("avg_distance")
    ).filter(
        Dashboard.eta >= start_date,
        Dashboard.eta < end_date,
        Dashboard.distance.isnot(None)
    ).group_by(
        Dashboard.warehouse
    ).all()
    
    distance_data = [
        {"warehouse": warehouse, "avg_distance": float(avg_distance) if avg_distance else 0}
        for warehouse, avg_distance in avg_distance_by_warehouse
    ]
    
    return {
        "success": True,
        "message": "시각화 데이터 조회 성공",
        "data": {
            "date_range": {
                "start_date": start_date,
                "end_date": end_date
            },
            "daily_orders": daily_orders_data,
            "status_distribution": status_data,
            "warehouse_distribution": warehouse_data,
            "avg_delivery_time_minutes": avg_delivery_time or 0,
            "avg_distance_by_warehouse": distance_data
        }
    }
