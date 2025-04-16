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
    # 디버깅용 상세 요청 정보 로깅
    logger.info("======= 대시보드 주문 목록 조회 시작 =======")
    logger.info(f"사용자: {current_user['user_id']}, 권한: {current_user['user_role']}")
    logger.info(
        f"요청 파라미터: start_date={start_date}, end_date={end_date}, page={page}, limit={limit}"
    )

    # 문자열 날짜를 datetime으로 변환
    start_datetime = None
    end_datetime = None

    if start_date:
        try:
            start_datetime = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except ValueError:
            try:
                # ISO 8601 형식이 아닐 경우 다른 형식 시도
                start_datetime = datetime.strptime(start_date, "%Y-%m-%dT%H:%M:%S.%fZ")
            except ValueError:
                logger.warning(f"유효하지 않은 시작 날짜 형식: {start_date}")
                # 기본값: 오늘
                start_datetime = datetime.now().replace(
                    hour=0, minute=0, second=0, microsecond=0
                )

    if end_date:
        try:
            end_datetime = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except ValueError:
            try:
                # ISO 8601 형식이 아닐 경우 다른 형식 시도
                end_datetime = datetime.strptime(end_date, "%Y-%m-%dT%H:%M:%S.%fZ")
            except ValueError:
                logger.warning(f"유효하지 않은 종료 날짜 형식: {end_date}")
                # 시작 날짜가 있으면 +1일, 없으면 오늘 자정
                if start_datetime:
                    end_datetime = start_datetime + timedelta(days=1)
                else:
                    end_datetime = datetime.now().replace(
                        hour=23, minute=59, second=59, microsecond=999999
                    )

    # 기본 쿼리
    query = db.query(Dashboard)

    # 날짜 필터링 - 개선: 기본값 적용 로직 수정
    if not start_datetime:
        # 기본값: 오늘
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        start_datetime = today
        end_datetime = today + timedelta(days=1)
    elif not end_datetime:
        end_datetime = start_datetime + timedelta(days=1)

    # 개선: ETA 필드 기준으로 날짜 필터링만 적용
    query = query.filter(Dashboard.eta >= start_datetime, Dashboard.eta < end_datetime)

    # 로깅: 변환된 날짜 범위
    logger.info(
        f"대시보드 쿼리: start={start_datetime.isoformat()}, end={end_datetime.isoformat()}"
    )

    # 총 항목 수 계산
    total_count = query.count()
    logger.info(f"쿼리 조건 적용 후 검색된 총 주문 수: {total_count}")

    # 필터링된 데이터 가져오기
    query = query.order_by(Dashboard.eta.asc())
    query = query.offset((page - 1) * limit).limit(limit)
    results = query.all()

    # 상태별 카운트 계산 - 클라이언트 필터링에 유용한 통계 정보는 유지
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
            db, Dashboard, order.dashboard_id, current_user["user_id"]
        )
        # 응답 데이터에 락 상태 정보 추가
        setattr(order, "locked_info", order_lock_status)

    # 개선된 응답 - 필터 정보는 날짜만 포함
    response_data = {
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

    # 로그 추가
    logger.info(f"대시보드 응답: 결과 {len(results)}건, 총 {total_count}건")

    return response_data


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

    # 상태 변경 불가능 처리
    if order_update.status is not None:
        logger.warning(
            f"주문 수정 API에서 상태 변경 시도: ID {order_id}, 사용자: {current_user['user_id']}"
        )
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
    logger.info(
        f"주문 일괄 삭제: user_id={current_user['user_id']}, order_count={len(delete_data.order_ids)}"
    )
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
        logger.warning(locked_msg)
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


# 상태 일괄 변경 API 명시적 파라미터 정의를 위한 모델
class StatusUpdateMultiple(BaseModel):
    order_ids: List[int] = Field(..., description="주문 ID 목록")
    status: OrderStatus = Field(..., description="변경할 상태")


@router.post("/status-multiple", response_model=Dict[str, Any])
async def update_multiple_orders_status(
    status_data: StatusUpdateMultiple,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    여러 주문 상태 일괄 변경 (개선됨)
    - 기사 배정 API와 유사한 간결한 로직으로 변경
    - 1개 이상의 주문 상태 변경 처리
    """
    # 요청 로깅
    logger.info(
        f"주문 상태 일괄 변경: user_id={current_user['user_id']}, status={status_data.status}, order_count={len(status_data.order_ids)}"
    )

    if not status_data.order_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="변경할 주문을 선택해주세요"
        )

    # 주문 목록 조회
    orders = (
        db.query(Dashboard)
        .filter(Dashboard.dashboard_id.in_(status_data.order_ids))
        .all()
    )

    found_ids = [order.dashboard_id for order in orders]
    logger.info(f"상태 변경 대상 주문 수: {len(orders)}")

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
        error_msg = (
            f"일부 주문(IDs: {locked_orders})이 다른 사용자에 의해 잠겨 있습니다"
        )
        logger.warning(error_msg)
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=error_msg,
        )

    # 상태 변경 처리 준비
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
                or status_data.status not in allowed_transitions.get(order.status, [])
            ):
                can_update = False
                forbidden_ids.append(order.dashboard_id)
                logger.warning(
                    f"권한 없는 상태 변경 시도: 주문 ID {order.dashboard_id}, {order.status} → {status_data.status}, 사용자: {current_user['user_id']}"
                )
                continue

        if can_update:
            prev_status = order.status

            # 상태 변경에 따른 시간 자동 업데이트
            if (
                prev_status == OrderStatus.WAITING
                and status_data.status == OrderStatus.IN_PROGRESS
            ):
                order.depart_time = current_time
            elif prev_status == OrderStatus.IN_PROGRESS and status_data.status in [
                OrderStatus.COMPLETE,
                OrderStatus.ISSUE,
                OrderStatus.CANCEL,
            ]:
                order.complete_time = current_time

            # 상태 업데이트
            order.status = status_data.status
            order.updated_by = current_user["user_id"]
            order.update_at = current_time
            updated_ids.append(order.dashboard_id)

            logger.info(
                f"주문 상태 변경: ID {order.dashboard_id}, {prev_status} → {status_data.status}, 처리자: {current_user['user_id']}"
            )

    # 변경사항 저장
    db.commit()

    # 결과 메시지 구성
    result_message = f"{len(updated_ids)}개 주문 상태 변경 성공"
    if forbidden_ids:
        result_message += (
            f", {len(forbidden_ids)}개 주문은 권한이 없어 변경되지 않았습니다"
        )

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
    logger.info(
        f"기사 일괄 배정: user_id={current_user['user_id']}, order_count={len(driver_data.order_ids)}, driver_name={driver_data.driver_name}"
    )

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

    logger.info(f"기사 배정 대상 주문 수: {len(orders)}")

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
