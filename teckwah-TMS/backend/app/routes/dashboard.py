"""
대시보드(주문) 관련 라우트
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.utils.logger import logger
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.dashboard import (
    Dashboard, OrderCreate, OrderUpdate, OrderResponse, 
    OrderStatusUpdate, DriverAssign, OrderStatus, OrderFilter,
    OrderDeleteMultiple
)
from app.middleware.auth import get_current_user, admin_required
from app.models.user import UserRole

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
async def get_dashboard_orders(
    start_date: Optional[datetime] = Query(None, description="시작 날짜"),
    end_date: Optional[datetime] = Query(None, description="종료 날짜"),
    status: Optional[str] = Query(None, description="상태 필터"),
    department: Optional[str] = Query(None, description="부서 필터"),
    warehouse: Optional[str] = Query(None, description="창고 필터"),
    order_no: Optional[str] = Query(None, description="주문번호 검색"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(10, ge=1, le=100, description="페이지당 항목 수"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    대시보드 주문 목록 조회
    """
    # 기본 쿼리
    query = db.query(Dashboard)
    
    # 날짜 필터링
    if not start_date:
        # 기본값: 오늘
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        start_date = today
        end_date = today + timedelta(days=1)
    elif not end_date:
        end_date = start_date + timedelta(days=1)
    
    query = query.filter(Dashboard.eta >= start_date, Dashboard.eta < end_date)
    
    # 추가 필터링
    if status:
        query = query.filter(Dashboard.status == status)
    
    if department:
        query = query.filter(Dashboard.department == department)
    
    if warehouse:
        query = query.filter(Dashboard.warehouse == warehouse)
    
    if order_no:
        query = query.filter(Dashboard.order_no.like(f"%{order_no}%"))
    
    # 총 항목 수 계산
    total_count = query.count()
    
    # 페이지네이션
    query = query.order_by(Dashboard.eta.asc())
    query = query.offset((page - 1) * limit).limit(limit)
    
    # 결과 반환
    results = query.all()
    
    # 상태별 카운트 쿼리
    status_counts = db.query(
        Dashboard.status, 
        func.count(Dashboard.dashboard_id).label("count")
    ).filter(
        Dashboard.eta >= start_date,
        Dashboard.eta < end_date
    ).group_by(Dashboard.status).all()
    
    # 상태별 카운트 변환
    status_count_dict = {
        "WAITING": 0,
        "IN_PROGRESS": 0,
        "COMPLETE": 0,
        "ISSUE": 0,
        "CANCEL": 0
    }
    
    for status_name, count in status_counts:
        status_count_dict[status_name] = count
    
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
                "start_date": start_date,
                "end_date": end_date,
                "status": status,
                "department": department,
                "warehouse": warehouse,
                "order_no": order_no
            }
        }
    }

@router.post("/", response_model=Dict[str, Any])
async def create_order(
    order: OrderCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    새 주문 생성
    """
    new_order = Dashboard(
        order_no=order.order_no,
        type=order.type,
        status=OrderStatus.WAITING,
        department=order.department,
        warehouse=order.warehouse,
        sla=order.sla,
        eta=order.eta,
        create_time=datetime.now(),
        postal_code=order.postal_code,
        address=order.address,
        customer=order.customer,
        contact=order.contact,
        driver_name=order.driver_name,
        driver_contact=order.driver_contact,
        remark=order.remark,
        updated_by=current_user["user_id"],
        update_at=datetime.now()
    )
    
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    
    logger.info(f"주문 생성: ID {new_order.dashboard_id}, 번호: {new_order.order_no}, 생성자: {current_user['user_id']}")
    
    return {
        "success": True,
        "message": "주문 생성 성공",
        "data": new_order
    }

@router.get("/{order_id}", response_model=Dict[str, Any])
async def get_order(
    order_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    특정 주문 조회
    """
    order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="주문을 찾을 수 없습니다"
        )
    
    return {
        "success": True,
        "message": "주문 조회 성공",
        "data": order
    }

@router.put("/{order_id}", response_model=Dict[str, Any])
async def update_order(
    order_id: int,
    order_update: OrderUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    주문 정보 업데이트
    """
    # 기존 주문 조회
    order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="주문을 찾을 수 없습니다"
        )
    
    # 상태 변경 확인 및 권한 체크
    if order_update.status and order_update.status != order.status:
        prev_status = order.status
        # 관리자는 모든 상태 변경 가능
        if current_user["user_role"] != UserRole.ADMIN:
            # 일반 사용자는 제한된 상태 변경만 가능
            current_status = order.status
            new_status = order_update.status
            
            allowed_transitions = {
                OrderStatus.WAITING: [OrderStatus.IN_PROGRESS],
                OrderStatus.IN_PROGRESS: [OrderStatus.COMPLETE, OrderStatus.ISSUE, OrderStatus.CANCEL]
            }
            
            if current_status not in allowed_transitions or new_status not in allowed_transitions.get(current_status, []):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="현재 상태에서 해당 상태로 변경할 권한이 없습니다"
                )
        
        # 상태 변경에 따른 시간 자동 업데이트 (상세 동작 설명서 참조)
        current_time = datetime.now()
        
        if order.status == OrderStatus.WAITING and order_update.status == OrderStatus.IN_PROGRESS:
            order.depart_time = current_time
            logger.info(f"출발 시간 기록: 주문 ID {order_id}, 시간: {current_time}")
        elif order.status == OrderStatus.IN_PROGRESS and order_update.status in [
            OrderStatus.COMPLETE, OrderStatus.ISSUE, OrderStatus.CANCEL
        ]:
            order.complete_time = current_time
            logger.info(f"완료/이슈/취소 시간 기록: 주문 ID {order_id}, 상태: {order_update.status}, 시간: {current_time}")
    
    # 필드 업데이트
    for key, value in order_update.dict(exclude_unset=True).items():
        setattr(order, key, value)
    
    # 업데이트 정보 갱신
    order.updated_by = current_user["user_id"]
    order.update_at = datetime.now()
    
    db.commit()
    db.refresh(order)
    
    # 상태 변경 로그
    if order_update.status and order_update.status != prev_status:
        logger.info(f"주문 상태 변경: ID {order_id}, {prev_status} → {order_update.status}, 처리자: {current_user['user_id']}")
    
    return {
        "success": True,
        "message": "주문 업데이트 성공",
        "data": order
    }

@router.delete("/{order_id}", response_model=Dict[str, Any])
async def delete_order(
    order_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    단일 주문 삭제
    권한 제한: 관리자는 모든 항목, 일반 사용자는 본인 생성 항목만 삭제 가능
    """
    order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="주문을 찾을 수 없습니다"
        )
    
    # 권한 검사
    if current_user["user_role"] != UserRole.ADMIN and order.updated_by != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인이 생성한 항목만 삭제할 수 있습니다"
        )
    
    db.delete(order)
    db.commit()
    
    logger.info(f"주문 삭제: ID {order_id}, 처리자: {current_user['user_id']}")
    
    return {
        "success": True,
        "message": "주문 삭제 성공"
    }

@router.post("/delete-multiple", response_model=Dict[str, Any])
async def delete_multiple_orders(
    delete_data: OrderDeleteMultiple,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    여러 주문 일괄 삭제
    권한 제한: 관리자는 모든 항목, 일반 사용자는 본인 생성 항목만 삭제 가능
    """
    if not delete_data.order_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="삭제할 주문을 선택해주세요"
        )
    
    # 주문 목록 조회
    orders = db.query(Dashboard).filter(Dashboard.dashboard_id.in_(delete_data.order_ids)).all()
    
    if not orders:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="선택한 주문을 찾을 수 없습니다"
        )
    
    # 권한에 따른 삭제 가능 항목 필터링
    deletable_orders = []
    forbidden_ids = []
    
    for order in orders:
        if current_user["user_role"] == UserRole.ADMIN or order.updated_by == current_user["user_id"]:
            deletable_orders.append(order)
        else:
            forbidden_ids.append(order.dashboard_id)
    
    # 일부라도 삭제 권한이 없는 경우 알림
    if forbidden_ids and current_user["user_role"] != UserRole.ADMIN:
        logger.warning(f"권한 없는 주문 삭제 시도: {forbidden_ids}, 처리자: {current_user['user_id']}")
        
        if not deletable_orders:  # 모든 항목에 대해 권한이 없는 경우
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="선택한 주문에 대한 삭제 권한이 없습니다"
            )
    
    # 삭제 실행
    deleted_count = 0
    deleted_ids = []
    
    for order in deletable_orders:
        deleted_ids.append(order.dashboard_id)
        db.delete(order)
        deleted_count += 1
    
    db.commit()
    
    logger.info(f"일괄 주문 삭제: IDs {deleted_ids}, 총 {deleted_count}건, 처리자: {current_user['user_id']}")
    
    # 결과 반환
    result_message = f"{deleted_count}개 주문 삭제 성공"
    
    if forbidden_ids and current_user["user_role"] != UserRole.ADMIN:
        result_message += f", {len(forbidden_ids)}개 주문은 권한이 없어 삭제되지 않았습니다"
    
    return {
        "success": True,
        "message": result_message,
        "data": {
            "deleted_count": deleted_count,
            "deleted_ids": deleted_ids,
            "forbidden_ids": forbidden_ids if current_user["user_role"] != UserRole.ADMIN else []
        }
    }

@router.post("/assign-driver", response_model=Dict[str, Any])
async def assign_driver(
    driver_data: DriverAssign,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    여러 주문에 기사 일괄 배정
    """
    if not driver_data.order_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="배정할 주문을 선택해주세요"
        )
    
    # 주문 목록 조회
    orders = db.query(Dashboard).filter(Dashboard.dashboard_id.in_(driver_data.order_ids)).all()
    
    if not orders:
        logger.warning(f"존재하지 않는 주문에 기사 배정 시도: {driver_data.order_ids}, 처리자: {current_user['user_id']}")
    
    if not orders:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="선택한 주문을 찾을 수 없습니다"
        )
    
    # 기사 정보 배정
    for order in orders:
        order.driver_name = driver_data.driver_name
        order.driver_contact = driver_data.driver_contact
        order.updated_by = current_user["user_id"]
        order.update_at = datetime.now()
    
    db.commit()
    
    return {
        "success": True,
        "message": f"{len(orders)}개 주문에 기사 배정 성공"
    }

@router.post("/{order_id}/status", response_model=Dict[str, Any])
async def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    주문 상태 변경
    """
    # 기존 주문 조회
    order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="주문을 찾을 수 없습니다"
        )
    
    # 상태 변경 확인 및 권한 체크
    if status_update.status != order.status:
        # 관리자는 모든 상태 변경 가능
        if current_user["user_role"] != UserRole.ADMIN:
            # 일반 사용자는 제한된 상태 변경만 가능
            current_status = order.status
            new_status = status_update.status
            
            allowed_transitions = {
                OrderStatus.WAITING: [OrderStatus.IN_PROGRESS],
                OrderStatus.IN_PROGRESS: [OrderStatus.COMPLETE, OrderStatus.ISSUE, OrderStatus.CANCEL]
            }
            
            if current_status not in allowed_transitions or new_status not in allowed_transitions.get(current_status, []):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="현재 상태에서 해당 상태로 변경할 권한이 없습니다"
                )
        
        # 상태 변경에 따른 시간 자동 업데이트
        if order.status == OrderStatus.WAITING and status_update.status == OrderStatus.IN_PROGRESS:
            order.depart_time = datetime.now()
        elif order.status == OrderStatus.IN_PROGRESS and status_update.status in [
            OrderStatus.COMPLETE, OrderStatus.ISSUE, OrderStatus.CANCEL
        ]:
            order.complete_time = datetime.now()
    
    # 상태 업데이트
    order.status = status_update.status
    
    # 업데이트 정보 갱신
    order.updated_by = current_user["user_id"]
    order.update_at = datetime.now()
    
    db.commit()
    db.refresh(order)
    
    return {
        "success": True,
        "message": "주문 상태 업데이트 성공",
        "data": order
    }
