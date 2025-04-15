"""
대시보드(주문) 관련 라우트
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from backend.utils.logger import logger
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from backend.database import get_db
from backend.models.dashboard import (
    Dashboard,
    OrderCreate,
    OrderUpdate,
    OrderResponse,
    OrderStatusUpdate,
    DriverAssign,
    OrderStatus,
    OrderFilter,
    OrderDeleteMultiple,
)
from backend.middleware.auth import get_current_user, admin_required
from backend.models.user import UserRole
from backend.utils.lock import acquire_lock, release_lock, validate_lock, check_lock_status

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
    db: Session = Depends(get_db),
):
    """
    대시보드 주문 목록 조회
    """
    # 기본 쿼리
    query = db.query(Dashboard)

    # 날짜 필터링 - 개선: 기본값 적용 로직 수정
    if not start_date:
        # 기본값: 오늘
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        start_date = today
        end_date = today + timedelta(days=1)
    elif not end_date:
        end_date = start_date + timedelta(days=1)

    # 개선: ETA 필드 기준으로 날짜 필터링
    query = query.filter(Dashboard.eta >= start_date, Dashboard.eta < end_date)

    # 총 항목 수 계산 (필터링 전)
    total_count = query.count()

    # 서버 사이드 필터링은 여기까지 적용 (추가 필터링은 클라이언트에서 수행)
    
    # 필터링된 데이터 가져오기
    query = query.order_by(Dashboard.eta.asc())
    query = query.offset((page - 1) * limit).limit(limit)
    results = query.all()

    # 상태별 카운트 계산
    status_counts = (
        db.query(Dashboard.status, func.count(Dashboard.dashboard_id).label("count"))
        .filter(Dashboard.eta >= start_date, Dashboard.eta < end_date)
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
        order_lock_status = check_lock_status(db, Dashboard, order.dashboard_id, current_user["user_id"])
        # 응답 데이터에 락 상태 정보 추가
        setattr(order, "locked_info", order_lock_status)

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
                "order_no": order_no,
            },
        },
    }


@router.post("/", response_model=Dict[str, Any])
async def create_order(
    order: OrderCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    새 주문 생성
    """
    # 우편번호 처리 (5자리 표준화)
    postal_code = order.postal_code
    if len(postal_code) < 5:
        postal_code = postal_code.zfill(5)  # 앞에 0 추가하여 5자리로 맞춤
    
    new_order = Dashboard(
        order_no=order.order_no,
        type=order.type,
        status=OrderStatus.WAITING,
        department=order.department,
        warehouse=order.warehouse,
        sla=order.sla,
        eta=order.eta,
        create_time=datetime.now(),
        postal_code=postal_code,
        address=order.address,
        customer=order.customer,
        contact=order.contact,
        driver_name=order.driver_name,
        driver_contact=order.driver_contact,
        remark=order.remark,
        updated_by=current_user["user_id"],
        update_at=datetime.now(),
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    logger.info(
        f"주문 생성: ID {new_order.dashboard_id}, 번호: {new_order.order_no}, 생성자: {current_user['user_id']}"
    )

    return {"success": True, "message": "주문 생성 성공", "data": new_order}


@router.get("/{order_id}", response_model=Dict[str, Any])
async def get_order(
    order_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    특정 주문 조회
    """
    order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다"
        )
    
    # 락 상태 확인
    lock_status = check_lock_status(db, Dashboard, order_id, current_user["user_id"])

    return {
        "success": True, 
        "message": "주문 조회 성공", 
        "data": order,
        "lock_status": lock_status
    }


@router.post("/{order_id}/lock", response_model=Dict[str, Any])
async def lock_order(
    order_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    주문 락 획득
    """
    order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다"
        )
    
    # 락 획득 시도
    lock_acquired = acquire_lock(db, Dashboard, order_id, current_user["user_id"])
    
    if not lock_acquired:
        # 현재 락 상태 확인
        lock_status = check_lock_status(db, Dashboard, order_id, current_user["user_id"])
        return {
            "success": False,
            "message": lock_status["message"],
            "lock_status": lock_status
        }
    
    return {
        "success": True,
        "message": "주문 락 획득 성공",
        "lock_status": {"locked": True, "editable": True, "message": "현재 사용자가 편집 중입니다"}
    }


@router.post("/{order_id}/unlock", response_model=Dict[str, Any])
async def unlock_order(
    order_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    주문 락 해제
    """
    order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다"
        )
    
    # 락 해제 시도
    lock_released = release_lock(db, Dashboard, order_id, current_user["user_id"])
    
    if not lock_released:
        # 현재 락 상태 확인
        lock_status = check_lock_status(db, Dashboard, order_id, current_user["user_id"])
        return {
            "success": False,
            "message": "락을 해제할 권한이 없습니다",
            "lock_status": lock_status
        }
    
    return {
        "success": True,
        "message": "주문 락 해제 성공",
        "lock_status": {"locked": False, "editable": True, "message": "편집 가능합니다"}
    }


@router.put("/{order_id}", response_model=Dict[str, Any])
async def update_order(
    order_id: int,
    order_update: OrderUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    주문 정보 업데이트
    """
    # 락 검증
    validate_lock(db, Dashboard, order_id, current_user["user_id"])
    
    # 기존 주문 조회
    order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다"
        )

    # 우편번호 처리 (5자리 표준화)
    if order_update.postal_code and len(order_update.postal_code) < 5:
        order_update.postal_code = order_update.postal_code.zfill(5)

    # 상태 변경 확인 및 권한 체크
    prev_status = order.status
    if order_update.status and order_update.status != order.status:
        # 관리자는 모든 상태 변경 가능
        if current_user["user_role"] != UserRole.ADMIN:
            # 일반 사용자는 제한된 상태 변경만 가능
            current_status = order.status
            new_status = order_update.status

            allowed_transitions = {
                OrderStatus.WAITING: [OrderStatus.IN_PROGRESS],
                OrderStatus.IN_PROGRESS: [
                    OrderStatus.COMPLETE,
                    OrderStatus.ISSUE,
                    OrderStatus.CANCEL,
                ],
            }

            if (
                current_status not in allowed_transitions
                or new_status not in allowed_transitions.get(current_status, [])
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="현재 상태에서 해당 상태로 변경할 권한이 없습니다",
                )

        # 상태 변경에 따른 시간 자동 업데이트
        current_time = datetime.now()

        if (
            order.status == OrderStatus.WAITING
            and order_update.status == OrderStatus.IN_PROGRESS
        ):
            order.depart_time = current_time
            logger.info(f"출발 시간 기록: 주문 ID {order_id}, 시간: {current_time}")
        elif order.status == OrderStatus.IN_PROGRESS and order_update.status in [
            OrderStatus.COMPLETE,
            OrderStatus.ISSUE,
            OrderStatus.CANCEL,
        ]:
            order.complete_time = current_time
            logger.info(
                f"완료/이슈/취소 시간 기록: 주문 ID {order_id}, 상태: {order_update.status}, 시간: {current_time}"
            )

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
        logger.info(
            f"주문 상태 변경: ID {order_id}, {prev_status} → {order_update.status}, 처리자: {current_user['user_id']}"
        )

    return {"success": True, "message": "주문 업데이트 성공", "data": order}


@router.delete("/{order_id}", response_model=Dict[str, Any])
async def delete_order(
    order_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    단일 주문 삭제 (일괄 삭제 API로 리다이렉트)
    """
    # 개선: 개별 삭제도 일괄 삭제 로직을 사용하도록 리다이렉트
    delete_data = OrderDeleteMultiple(order_ids=[order_id])
    return await delete_multiple_orders(delete_data, current_user, db)


@router.post("/delete-multiple", response_model=Dict[str, Any])
async def delete_multiple_orders(
    delete_data: OrderDeleteMultiple,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    여러 주문 일괄 삭제
    권한 제한: 관리자는 모든 항목, 일반 사용자는 본인 생성 항목만 삭제 가능
    """
    # 관리자만 삭제 가능하도록 제한 (개선사항)
    if current_user["user_role"] != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자만 주문을 삭제할 수 있습니다",
        )

    if not delete_data.order_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="삭제할 주문을 선택해주세요"
        )

    # 주문 목록 조회
    orders = (
        db.query(Dashboard)
        .filter(Dashboard.dashboard_id.in_(delete_data.order_ids))
        .all()
    )

    if not orders:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="선택한 주문을 찾을 수 없습니다",
        )

    # 락 검증
    locked_orders = []
    for order in orders:
        lock_status = check_lock_status(db, Dashboard, order.dashboard_id, current_user["user_id"])
        if lock_status["locked"] and not lock_status["editable"]:
            locked_orders.append(order.dashboard_id)
    
    if locked_orders:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"일부 주문({locked_orders})이 다른 사용자에 의해 잠겨 있습니다",
        )

    # 삭제 실행
    deleted_ids = []
    for order in orders:
        deleted_ids.append(order.dashboard_id)
        db.delete(order)

    db.commit()

    logger.info(
        f"일괄 주문 삭제: IDs {deleted_ids}, 총 {len(deleted_ids)}건, 처리자: {current_user['user_id']}"
    )

    return {
        "success": True,
        "message": f"{len(deleted_ids)}개 주문 삭제 성공",
        "data": {
            "deleted_count": len(deleted_ids),
            "deleted_ids": deleted_ids,
        },
    }


@router.post("/status-multiple", response_model=Dict[str, Any])
async def update_multiple_orders_status(
    status_data: OrderStatusUpdate,
    order_ids: List[int],
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    여러 주문 상태 일괄 변경
    """
    if not order_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="변경할 주문을 선택해주세요"
        )

    # 주문 목록 조회
    orders = (
        db.query(Dashboard)
        .filter(Dashboard.dashboard_id.in_(order_ids))
        .all()
    )

    if not orders:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="선택한 주문을 찾을 수 없습니다",
        )

    # 락 검증
    locked_orders = []
    for order in orders:
        lock_status = check_lock_status(db, Dashboard, order.dashboard_id, current_user["user_id"])
        if lock_status["locked"] and not lock_status["editable"]:
            locked_orders.append(order.dashboard_id)
    
    if locked_orders:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"일부 주문({locked_orders})이 다른 사용자에 의해 잠겨 있습니다",
        )

    # 상태 변경 처리
    updated_count = 0
    updated_ids = []
    forbidden_ids = []
    current_time = datetime.now()

    for order in orders:
        # 상태 변경 권한 체크
        can_update = True
        
        if current_user["user_role"] != UserRole.ADMIN:
            current_status = order.status
            new_status = status_data.status

            allowed_transitions = {
                OrderStatus.WAITING: [OrderStatus.IN_PROGRESS],
                OrderStatus.IN_PROGRESS: [
                    OrderStatus.COMPLETE,
                    OrderStatus.ISSUE,
                    OrderStatus.CANCEL,
                ],
            }

            if (
                current_status not in allowed_transitions
                or new_status not in allowed_transitions.get(current_status, [])
            ):
                can_update = False
                forbidden_ids.append(order.dashboard_id)
                continue

        if can_update:
            # 이전 상태 저장
            prev_status = order.status
            
            # 상태 변경에 따른 시간 자동 업데이트
            if (
                order.status == OrderStatus.WAITING
                and status_data.status == OrderStatus.IN_PROGRESS
            ):
                order.depart_time = current_time
            elif (
                order.status == OrderStatus.IN_PROGRESS 
                and status_data.status in [OrderStatus.COMPLETE, OrderStatus.ISSUE, OrderStatus.CANCEL]
            ):
                order.complete_time = current_time

            # 상태 업데이트
            order.status = status_data.status
            order.updated_by = current_user["user_id"]
            order.update_at = current_time
            
            updated_ids.append(order.dashboard_id)
            updated_count += 1
            
            logger.info(
                f"주문 상태 변경: ID {order.dashboard_id}, {prev_status} → {status_data.status}, 처리자: {current_user['user_id']}"
            )

    db.commit()

    # 결과 메시지
    result_message = f"{updated_count}개 주문 상태 변경 성공"
    if forbidden_ids:
        result_message += f", {len(forbidden_ids)}개 주문은 권한이 없어 변경되지 않았습니다"

    return {
        "success": True,
        "message": result_message,
        "data": {
            "updated_count": updated_count,
            "updated_ids": updated_ids,
            "forbidden_ids": forbidden_ids,
        },
    }


@router.post("/assign-driver", response_model=Dict[str, Any])
async def assign_driver(
    driver_data: DriverAssign,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    여러 주문에 기사 일괄 배정
    """
    if not driver_data.order_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="배정할 주문을 선택해주세요"
        )

    # 주문 목록 조회
    orders = (
        db.query(Dashboard)
        .filter(Dashboard.dashboard_id.in_(driver_data.order_ids))
        .all()
    )

    if not orders:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="선택한 주문을 찾을 수 없습니다",
        )

    # 락 검증
    locked_orders = []
    for order in orders:
        lock_status = check_lock_status(db, Dashboard, order.dashboard_id, current_user["user_id"])
        if lock_status["locked"] and not lock_status["editable"]:
            locked_orders.append(order.dashboard_id)
    
    if locked_orders:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"일부 주문({locked_orders})이 다른 사용자에 의해 잠겨 있습니다",
        )

    # 기사 정보 배정
    for order in orders:
        order.driver_name = driver_data.driver_name
        order.driver_contact = driver_data.driver_contact
        order.updated_by = current_user["user_id"]
        order.update_at = datetime.now()

    db.commit()

    return {"success": True, "message": f"{len(orders)}개 주문에 기사 배정 성공"}


@router.post("/{order_id}/status", response_model=Dict[str, Any])
async def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    주문 상태 변경
    """
    # 락 검증
    validate_lock(db, Dashboard, order_id, current_user["user_id"])
    
    # 기존 주문 조회
    order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다"
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
                OrderStatus.IN_PROGRESS: [
                    OrderStatus.COMPLETE,
                    OrderStatus.ISSUE,
                    OrderStatus.CANCEL,
                ],
            }

            if (
                current_status not in allowed_transitions
                or new_status not in allowed_transitions.get(current_status, [])
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="현재 상태에서 해당 상태로 변경할 권한이 없습니다",
                )

        # 상태 변경에 따른 시간 자동 업데이트
        if (
            order.status == OrderStatus.WAITING
            and status_update.status == OrderStatus.IN_PROGRESS
        ):
            order.depart_time = datetime.now()
        elif order.status == OrderStatus.IN_PROGRESS and status_update.status in [
            OrderStatus.COMPLETE,
            OrderStatus.ISSUE,
            OrderStatus.CANCEL,
        ]:
            order.complete_time = datetime.now()

    # 상태 업데이트
    order.status = status_update.status

    # 업데이트 정보 갱신
    order.updated_by = current_user["user_id"]
    order.update_at = datetime.now()

    db.commit()
    db.refresh(order)

    return {"success": True, "message": "주문 상태 업데이트 성공", "data": order}
