"""
대시보드 관련 비즈니스 로직
"""
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models.dashboard import Dashboard, OrderStatus
from backend.models.user import UserRole
from backend.utils.logger import logger
from backend.utils.date_utils import get_date_range
from backend.utils.lock import check_lock_status


def get_dashboard_orders(
    db: Session, 
    start_date: Optional[str], 
    end_date: Optional[str], 
    page: int, 
    limit: int,
    current_user_id: str
) -> Dict[str, Any]:
    """
    대시보드 주문 목록 조회
    """
    # 날짜 범위 구하기
    start_datetime, end_datetime = get_date_range(start_date, end_date)
    
    # 기본 쿼리
    query = db.query(Dashboard)
    
    # ETA 필드 기준으로 날짜 필터링
    query = query.filter(Dashboard.eta >= start_datetime, Dashboard.eta < end_datetime)
    
    # 로깅
    logger.db(f"주문 데이터 조회 - 기간: {start_datetime.strftime('%Y-%m-%d')} ~ {end_datetime.strftime('%Y-%m-%d')}")
    
    # 총 항목 수 계산
    total_count = query.count()
    
    # 필터링된 데이터 가져오기
    query = query.order_by(Dashboard.eta.asc())
    query = query.offset((page - 1) * limit).limit(limit)
    results = query.all()
    
    # 상태별 카운트 계산
    status_counts = (
        db.query(Dashboard.status, func.count(Dashboard.dashboard_id).label("count"))
        .filter(Dashboard.eta >= start_datetime, Dashboard.eta < end_datetime)
        .group_by(Dashboard.status)
        .all()
    )
    
    # 상태별 카운트 변환
    status_count_dict = {
        "WAITING": 0,
        "IN_PROGRESS": 0,
        "COMPLETE": 0,
        "ISSUE": 0,
        "CANCEL": 0,
    }
    
    for status_name, count in status_counts:
        status_count_dict[status_name] = count
    
    # 각 주문의 락 상태 확인
    for order in results:
        order_lock_status = check_lock_status(
            db, Dashboard, order.dashboard_id, current_user_id
        )
        # 응답 데이터에 락 상태 정보 추가
        setattr(order, "locked_info", order_lock_status)
    
    # 응답 데이터 구성
    return {
        "success": True,
        "message": "주문 목록 조회 성공",
        "data": {
            "items": results,
            "total": total_count,
            "page": page,
            "limit": limit,
            "status_counts": status_count_dict,
            "filter": {
                "start_date": start_datetime,
                "end_date": end_datetime,
            },
        },
    }


def create_order(
    db: Session, 
    order_data: Dict[str, Any], 
    current_user_id: str
) -> Dashboard:
    """
    새 주문 생성
    """
    # 우편번호 처리 (5자리 표준화)
    postal_code = order_data.get("postal_code")
    if postal_code and len(postal_code) < 5:
        postal_code = postal_code.zfill(5)  # 앞에 0 추가하여 5자리로 맞춤
    else:
        postal_code = order_data.get("postal_code")
    
    # 새 주문 객체 생성
    new_order = Dashboard(
        order_no=order_data.get("order_no"),
        type=order_data.get("type"),
        status=OrderStatus.WAITING,
        department=order_data.get("department"),
        warehouse=order_data.get("warehouse"),
        sla=order_data.get("sla"),
        eta=order_data.get("eta"),
        create_time=datetime.now(),
        postal_code=postal_code,
        address=order_data.get("address"),
        customer=order_data.get("customer"),
        contact=order_data.get("contact"),
        driver_name=order_data.get("driver_name"),
        driver_contact=order_data.get("driver_contact"),
        remark=order_data.get("remark"),
        updated_by=current_user_id,
        update_at=datetime.now(),
    )
    
    # DB에 추가
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    
    logger.db(f"주문 생성 - ID: {new_order.dashboard_id}, 번호: {new_order.order_no}, 생성자: {current_user_id}")
    
    return new_order


def update_multiple_orders_status(
    db: Session,
    order_ids: List[int],
    status: str,
    current_user: Dict[str, Any]
) -> Dict[str, Any]:
    """
    여러 주문 상태 일괄 변경
    """
    # 주문 목록 조회
    orders = db.query(Dashboard).filter(Dashboard.dashboard_id.in_(order_ids)).all()
    
    logger.db(f"상태 변경 대상 조회 - 요청: {len(order_ids)}건, 조회됨: {len(orders)}건")
    
    if not orders:
        return {
            "success": False,
            "message": "선택한 주문을 찾을 수 없습니다",
            "data": None
        }
    
    # 현재 시간 및 유저 역할 정보
    current_time = datetime.now()
    is_admin = current_user["user_role"] == UserRole.ADMIN
    forbidden_ids = []
    updated_ids = []
    
    # 상태 전환 권한 체크 테이블
    allowed_transitions = {
        OrderStatus.WAITING: [OrderStatus.IN_PROGRESS],
        OrderStatus.IN_PROGRESS: [
            OrderStatus.COMPLETE,
            OrderStatus.ISSUE,
            OrderStatus.CANCEL,
        ],
    }
    
    # 상태 변경 실행
    for order in orders:
        # 상태 변경 권한 체크 (일반 사용자)
        can_update = True
        if not is_admin:
            if (
                order.status not in allowed_transitions
                or status not in allowed_transitions.get(order.status, [])
            ):
                can_update = False
                forbidden_ids.append(order.dashboard_id)
                logger.auth(f"권한 부족 - 주문 ID: {order.dashboard_id}, 상태변경: {order.status} → {status}, 사용자: {current_user['user_id']}")
                continue
        
        if can_update:
            prev_status = order.status
            
            # 상태 변경에 따른 시간 자동 업데이트
            if (
                prev_status == OrderStatus.WAITING
                and status == OrderStatus.IN_PROGRESS
            ):
                order.depart_time = current_time
            elif prev_status == OrderStatus.IN_PROGRESS and status in [
                OrderStatus.COMPLETE,
                OrderStatus.ISSUE,
                OrderStatus.CANCEL,
            ]:
                order.complete_time = current_time
            
            # 상태 업데이트
            order.status = status
            order.updated_by = current_user["user_id"]
            order.update_at = current_time
            updated_ids.append(order.dashboard_id)
            
            logger.db(f"상태 변경됨 - ID: {order.dashboard_id}, {prev_status} → {status}")
    
    # 변경사항 저장
    db.commit()
    
    # 결과 메시지 구성
    result_message = f"{len(updated_ids)}개 주문 상태 변경 성공"
    if forbidden_ids:
        result_message += f", {len(forbidden_ids)}개 주문은 권한이 없어 변경되지 않았습니다"
    
    # 응답 반환
    return {
        "success": True,
        "message": result_message,
        "data": {
            "updated_count": len(updated_ids),
            "updated_ids": updated_ids,
            "forbidden_ids": forbidden_ids,
        },
    }
