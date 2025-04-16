"""
대시보드(주문) 관련 라우트
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from backend.utils.logger import logger
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

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
from backend.utils.lock import (
    acquire_lock,
    release_lock,
    validate_lock,
    check_lock_status,
)

router = APIRouter()


from backend.services.dashboard_service import get_dashboard_orders as service_get_dashboard_orders

@router.get("/", response_model=Dict[str, Any])
async def get_dashboard_orders(
    start_date: Optional[str] = Query(None, description="시작 날짜 (ISO 형식)"),
    end_date: Optional[str] = Query(None, description="종료 날짜 (ISO 형식)"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(10, ge=1, le=100, description="페이지당 항목 수"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    대시보드 주문 목록 조회 (개선됨)
    - 날짜 기간으로만 필터링 (ETA 기준)
    - 클라이언트 측에서 추가 필터링 처리
    """
    # 간결한 요청 정보 로깅
    logger.api(f"주문 목록 조회 - 사용자: {current_user['user_id']}, 날짜: {start_date or '오늘'} ~ {end_date or '오늘+1일'}, 페이지: {page}")
    
    # 서비스 레이어 호출
    response_data = service_get_dashboard_orders(
        db=db,
        start_date=start_date,
        end_date=end_date,
        page=page,
        limit=limit,
        current_user_id=current_user["user_id"]
    )
    
    # 로그 간소화
    logger.api(f"주문 목록 응답 - 페이지: {page}, 결과: {len(response_data['data']['items'])}건")
    
    return response_data


from backend.services.dashboard_service import create_order as service_create_order

@router.post("/", response_model=Dict[str, Any])
async def create_order(
    order: OrderCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    새 주문 생성
    """
    # 서비스 레이어 호출
    new_order = service_create_order(
        db=db,
        order_data=order.dict(),
        current_user_id=current_user["user_id"]
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
        "lock_status": lock_status,
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
        lock_status = check_lock_status(
            db, Dashboard, order_id, current_user["user_id"]
        )
        return {
            "success": False,
            "message": lock_status["message"],
            "lock_status": lock_status,
        }

    return {
        "success": True,
        "message": "주문 락 획득 성공",
        "lock_status": {
            "locked": True,
            "editable": True,
            "message": "현재 사용자가 편집 중입니다",
        },
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
        lock_status = check_lock_status(
            db, Dashboard, order_id, current_user["user_id"]
        )
        return {
            "success": False,
            "message": "락을 해제할 권한이 없습니다",
            "lock_status": lock_status,
        }

    return {
        "success": True,
        "message": "주문 락 해제 성공",
        "lock_status": {
            "locked": False,
            "editable": True,
            "message": "편집 가능합니다",
        },
    }


@router.put("/{order_id}", response_model=Dict[str, Any])
async def update_order(
    order_id: int,
    order_update: OrderUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    주문 정보 업데이트 (상태 변경 제외)
    - 상태 변경은 status-multiple API를 통해서만 가능
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

    # 상태 변경 불가능 처리 - 경고 로그 간소화
    if order_update.status is not None:
        logger.warning(f"부적절한 상태 변경 시도 - 주문 ID: {order_id}, 사용자: {current_user['user_id']}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="주문 수정 API에서는 상태를 변경할 수 없습니다. status-multiple API를 사용하세요.",
        )

    # 필드 업데이트 (상태 제외)
    update_dict = order_update.dict(exclude_unset=True, exclude={"status"})
    for key, value in update_dict.items():
        setattr(order, key, value)

    # 업데이트 정보 갱신
    order.updated_by = current_user["user_id"]
    order.update_at = datetime.now()

    db.commit()
    db.refresh(order)

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
    logger.api(f"주문 일괄 삭제 요청 - 사용자: {current_user['user_id']}, 대상: {len(delete_data.order_ids)}건")
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
        lock_status = check_lock_status(
            db, Dashboard, order.dashboard_id, current_user["user_id"]
        )
        if lock_status["locked"] and not lock_status["editable"]:
            locked_orders.append(order.dashboard_id)

    if locked_orders:
        locked_msg = f"일부 주문({locked_orders})이 다른 사용자에 의해 잠겨 있습니다"
        logger.lock(f"락 충돌 발생 - {locked_msg}, 요청자: {current_user['user_id']}")
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=locked_msg,
        )

    # 삭제 실행
    deleted_ids = []
    for order in orders:
        deleted_ids.append(order.dashboard_id)
        db.delete(order)

    db.commit()

    logger.db(f"주문 삭제 완료 - {len(deleted_ids)}건, 처리자: {current_user['user_id']}")

    return {
        "success": True,
        "message": f"{len(deleted_ids)}개 주문 삭제 성공",
        "data": {
            "deleted_count": len(deleted_ids),
            "deleted_ids": deleted_ids,
        },
    }


# 상태 일괄 변경 API 명시적 파라미터 정의를 위한 모델
class StatusUpdateMultiple(BaseModel):
    order_ids: List[int] = Field(..., description="주문 ID 목록")
    status: OrderStatus = Field(..., description="변경할 상태")


from backend.services.dashboard_service import update_multiple_orders_status as service_update_status

@router.post("/status-multiple", response_model=Dict[str, Any])
async def update_multiple_orders_status(
    status_data: StatusUpdateMultiple,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    여러 주문 상태 일괄 변경 (개선됨)
    """
    # 요청 로깅 간소화
    logger.api(f"상태 일괄 변경 요청 - 상태: {status_data.status}, 대상: {len(status_data.order_ids)}건, 사용자: {current_user['user_id']}")

    if not status_data.order_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="변경할 주문을 선택해주세요"
        )
        
    # 락 검증
    orders = (
        db.query(Dashboard)
        .filter(Dashboard.dashboard_id.in_(status_data.order_ids))
        .all()
    )
    
    # 락 검증
    locked_orders = []
    for order in orders:
        lock_status = check_lock_status(
            db, Dashboard, order.dashboard_id, current_user["user_id"]
        )
        if lock_status["locked"] and not lock_status["editable"]:
            locked_orders.append(order.dashboard_id)

    if locked_orders:
        error_msg = f"일부 주문(IDs: {locked_orders})이 다른 사용자에 의해 잠겨 있습니다"
        logger.lock(f"상태 변경 락 충돌 - {error_msg}, 요청자: {current_user['user_id']}")
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=error_msg,
        )

    # 서비스 레이어 호출
    response = service_update_status(
        db=db,
        order_ids=status_data.order_ids,
        status=status_data.status,
        current_user=current_user
    )
    
    return response


# 기사 배정용 요청 모델 추가
class DriverAssignRequest(BaseModel):
    order_ids: List[int] = Field(..., description="주문 ID 목록")
    driver_name: str = Field(..., description="기사 이름")
    driver_contact: Optional[str] = Field(None, description="기사 연락처")


@router.post("/assign-driver", response_model=Dict[str, Any])
async def assign_driver(
    driver_data: DriverAssignRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    여러 주문에 기사 일괄 배정
    """
    logger.api(f"기사 배정 요청 - 기사: {driver_data.driver_name}, 대상: {len(driver_data.order_ids)}건, 사용자: {current_user['user_id']}")

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

    logger.db(f"기사 배정 대상 조회됨 - {len(orders)}건")

    if not orders:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="선택한 주문을 찾을 수 없습니다",
        )

    # 락 검증
    locked_orders = []
    for order in orders:
        lock_status = check_lock_status(
            db, Dashboard, order.dashboard_id, current_user["user_id"]
        )
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
