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
    OrderListResponse,
    GetOrderResponse,
    LockResponse,
    BasicSuccessResponse,
    DeleteMultipleResponse,
    StatusUpdateMultipleResponse,
    AssignDriverResponse,
    AssignDriverResponseData,
    GetOrderResponseData,
)
from backend.middleware.auth import get_current_user, admin_required
from backend.models.user import UserRole
from backend.utils.lock import (
    acquire_lock,
    release_lock,
    validate_lock,
    check_lock_status,
)
from backend.services.dashboard_service import (
    get_dashboard_orders as service_get_dashboard_orders,
    create_order as service_create_order,
    update_order as service_update_order,
    delete_order as service_delete_order,
    delete_multiple_orders as service_delete_multiple_orders,
    update_multiple_orders_status as service_update_multiple_orders_status,
    assign_driver_to_orders as service_assign_driver_to_orders,
)

router = APIRouter()


@router.get("/", response_model=OrderListResponse)
async def get_dashboard_orders(
    start_date: Optional[str] = Query(None, description="시작 날짜 (ISO 형식)"),
    end_date: Optional[str] = Query(None, description="종료 날짜 (ISO 형식)"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(10, ge=1, le=100, description="페이지당 항목 수"),
    order_no: Optional[str] = Query(None, description="주문 번호", alias="orderNo"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderListResponse:
    """
    대시보드 주문 목록 조회 (response_model 사용) + 디버깅 로그 추가
    """
    logger.api(
        f"주문 목록 조회 - 사용자: {current_user['user_id']}, 날짜: {start_date or '오늘'} ~ {end_date or '오늘+1일'}, 페이지: {page}"
    )

    # 서비스 레이어 호출
    response_data_dict = service_get_dashboard_orders(
        db=db,
        start_date=start_date,
        end_date=end_date,
        page=page,
        limit=limit,
        order_no=order_no,
        current_user_id=current_user["user_id"],
    )

    # --- 응답 모델 변환 전 로그 추가 ---
    logger.debug(
        f"서비스 반환 데이터 구조 (타입: {type(response_data_dict)}): {response_data_dict}"
    )
    if isinstance(response_data_dict, dict) and "data" in response_data_dict:
        # 수정: OrderListResponse 모델 구조에 맞게 접근
        data_part = response_data_dict["data"]
        raw_items = data_part.get("items", []) if isinstance(data_part, dict) else []
        logger.debug(f"서비스 반환 raw_items 개수: {len(raw_items)}")
        for i, item in enumerate(raw_items):
            # OrderResponse로 변환될 객체의 타입과 주요 값 로깅
            logger.debug(
                f"  Item {i} (타입: {type(item)}): ID={getattr(item, 'dashboard_id', 'N/A')}, "
                f"OrderNo={getattr(item, 'order_no', 'N/A')}, "
                f"Status={getattr(item, 'status', 'N/A')}, "
                f"ETA={getattr(item, 'eta', 'N/A')}"
            )
    # -------------------------------

    # 서비스가 Pydantic 모델 객체를 반환하는 경우 바로 반환
    if isinstance(response_data_dict, OrderListResponse):
        logger.debug("서비스가 OrderListResponse 객체를 반환하여 바로 사용.")
        return response_data_dict
    # 서비스가 딕셔너리를 반환하는 경우 (또는 다른 처리 필요시 추가)
    elif isinstance(response_data_dict, dict):
        try:
            logger.debug(
                "서비스가 딕셔너리를 반환. 구조가 OrderListResponse와 일치해야 함."
            )
            # 직접 반환 시 FastAPI가 response_model 기준으로 검증
            # FastAPI v1.x: response_model 검증은 성공 시 자동으로 이루어짐
            # Pydantic v2 호환성을 위해 명시적 변환 고려:
            # return OrderListResponse(**response_data_dict)
            return response_data_dict  # FastAPI가 검증하도록 위임
        except Exception as e:
            logger.error(f"OrderListResponse 변환/검증 실패: {e}", exc_info=True)
            raise HTTPException(
                status_code=500, detail="주문 목록 응답 처리 중 오류 발생"
            )
    else:
        logger.error(f"서비스에서 예기치 않은 타입 반환: {type(response_data_dict)}")
        raise HTTPException(
            status_code=500, detail="주문 목록 응답 처리 중 내부 오류 발생"
        )


@router.post("/", response_model=OrderResponse)
async def create_order(
    order: OrderCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dashboard:
    """
    새 주문 생성 (response_model 사용)
    """
    new_order = service_create_order(
        db=db, order_data=order.dict(), current_user_id=current_user["user_id"]
    )
    return new_order


@router.get("/{order_id}", response_model=GetOrderResponse)
async def get_order(
    order_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GetOrderResponse:
    """
    특정 주문 조회 (response_model 사용) + 디버깅 로그 추가
    """
    order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다"
        )

    lock_status_dict = check_lock_status(
        db, Dashboard, order_id, current_user["user_id"]
    )

    # --- from_orm 호출 전 로그 추가 ---
    logger.debug(f"GetOrderResponseData.from_orm 호출 전:")
    logger.debug(f"  Order 객체 타입: {type(order)}")
    logger.debug(
        f"  Order 데이터: ID={order.dashboard_id}, OrderNo={order.order_no}, Status={order.status}"
    )
    logger.debug(f"  Lock Status Dict: {lock_status_dict}")
    # ---------------------------------
    try:
        # from_orm 변환 시도
        # GetOrderResponseData 모델 정의에 맞게 from_orm 사용 (두 번째 인자 제거)
        order_resp_data = GetOrderResponseData.from_orm(order)
        # 락 정보는 별도로 할당
        order_resp_data.locked_info = LockStatus(**lock_status_dict)

        # --- from_orm 호출 후 로그 추가 ---
        logger.debug(f"GetOrderResponseData.from_orm 변환 성공:")
        logger.debug(f"  Pydantic 객체 타입: {type(order_resp_data)}")
        logger.debug(
            f"  Pydantic 데이터 (일부): ID={order_resp_data.dashboard_id}, OrderNo={order_resp_data.order_no}, Status={order_resp_data.status}, LockedInfo={order_resp_data.locked_info}"
        )
        # ---------------------------------

        # 최종 응답 모델 생성
        final_response = GetOrderResponse(data=order_resp_data)
        return final_response
    except Exception as e:
        logger.error(
            f"GetOrderResponseData.from_orm 변환 실패 (Order ID: {order_id}): {e}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="주문 상세 정보 처리 중 오류 발생")


@router.post("/{order_id}/lock", response_model=LockResponse)
async def lock_order(
    order_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LockResponse:
    """
    주문 락 획득 (response_model 사용)
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
        lock_status_data = check_lock_status(
            db, Dashboard, order_id, current_user["user_id"]
        )
        return LockResponse(
            success=False,
            message=lock_status_data["message"],
            lock_status=lock_status_data,
        )

    return LockResponse(
        success=True,
        message="주문 락 획득 성공",
        lock_status={
            "locked": True,
            "editable": True,
            "message": "현재 사용자가 편집 중입니다",
        },
    )


@router.post("/{order_id}/unlock", response_model=LockResponse)
async def unlock_order(
    order_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LockResponse:
    """
    주문 락 해제 (response_model 사용)
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
        lock_status_data = check_lock_status(
            db, Dashboard, order_id, current_user["user_id"]
        )
        return LockResponse(
            success=False,
            message="락을 해제할 권한이 없습니다",
            lock_status=lock_status_data,
        )

    return LockResponse(
        success=True,
        message="주문 락 해제 성공",
        lock_status={
            "locked": False,
            "editable": True,
            "message": "편집 가능합니다",
        },
    )


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: int,
    order_update: OrderUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderResponse:  # 반환 타입 수정
    """
    주문 정보 업데이트 (response_model 사용) + 디버깅 로그 추가
    """
    validate_lock(db, Dashboard, order_id, current_user["user_id"])
    order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다"
        )
    if order_update.status is not None:
        logger.warning(
            f"부적절한 상태 변경 시도 - 주문 ID: {order_id}, 사용자: {current_user['user_id']}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="주문 수정 API에서는 상태를 변경할 수 없습니다. status-multiple API를 사용하세요.",
        )

    updated_order = service_update_order(
        db=db,
        order_id=order_id,
        order_data=order_update.dict(exclude_unset=True, exclude={"status"}),
        current_user_id=current_user["user_id"],
    )

    # --- 응답 모델 변환 전 로그 추가 ---
    logger.debug(f"Service update_order 반환 객체 타입: {type(updated_order)}")
    if updated_order:
        logger.debug(
            f"  Order 데이터: ID={updated_order.dashboard_id}, OrderNo={updated_order.order_no}, Status={updated_order.status}"
        )
    # ---------------------------------
    try:
        # 서비스가 SQLAlchemy 객체를 반환하므로 명시적 변환
        if updated_order:
            response_obj = OrderResponse.from_orm(updated_order)
            logger.debug(f"OrderResponse 변환 성공 (Order ID: {order_id})")
            return response_obj
        else:
            # 서비스에서 None을 반환한 경우 (업데이트 실패 등)
            logger.error(f"서비스 update_order가 None 반환 (Order ID: {order_id})")
            raise HTTPException(status_code=500, detail="주문 업데이트 실패")
    except Exception as e:
        logger.error(
            f"OrderResponse 변환/검증 실패 (Order ID: {order_id}): {e}", exc_info=True
        )
        raise HTTPException(
            status_code=500, detail="주문 업데이트 응답 처리 중 오류 발생"
        )


@router.delete("/{order_id}", response_model=BasicSuccessResponse)
async def delete_order(
    order_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BasicSuccessResponse:
    """
    주문 삭제 (response_model 사용)
    """
    success = service_delete_order(db, order_id, current_user["user_id"])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="삭제할 주문을 찾을 수 없습니다",
        )
    return BasicSuccessResponse(message="주문 삭제 성공")


@router.post("/delete-multiple", response_model=DeleteMultipleResponse)
async def delete_multiple_orders(
    delete_data: OrderDeleteMultiple,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DeleteMultipleResponse:
    """
    주문 다중 삭제 (response_model 사용)
    """
    result = service_delete_multiple_orders(
        db, delete_data.order_ids, current_user["user_id"]
    )
    return DeleteMultipleResponse(**result)


# 상태 일괄 변경 API 명시적 파라미터 정의를 위한 모델
class StatusUpdateMultiple(BaseModel):
    order_ids: List[int] = Field(..., description="주문 ID 목록", alias="orderIds")
    status: OrderStatus = Field(..., description="변경할 상태")


@router.post("/status-multiple", response_model=StatusUpdateMultipleResponse)
async def update_multiple_orders_status(
    status_data: StatusUpdateMultiple,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StatusUpdateMultipleResponse:
    """
    주문 상태 일괄 변경 (response_model 사용)
    """
    result = service_update_multiple_orders_status(
        db, status_data.order_ids, status_data.status, current_user
    )
    return StatusUpdateMultipleResponse(**result)


# 기사 배정용 요청 모델 추가
class DriverAssignRequest(BaseModel):
    order_ids: List[int] = Field(..., description="주문 ID 목록", alias="orderIds")
    driver_name: str = Field(..., description="기사 이름", alias="driverName")
    driver_contact: Optional[str] = Field(
        None, description="기사 연락처", alias="driverContact"
    )


@router.post("/assign-driver", response_model=AssignDriverResponse)
async def assign_driver(
    driver_data: DriverAssignRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssignDriverResponse:
    """
    기사 일괄 배정 (response_model 사용)
    """
    assigned_count = service_assign_driver_to_orders(
        db,
        driver_data.order_ids,
        driver_data.driver_name,
        driver_data.driver_contact,
        current_user["user_id"],
    )
    return AssignDriverResponse(
        data=AssignDriverResponseData(assigned_count=assigned_count)
    )
