"""
대시보드 관련 비즈니스 로직
"""

from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models.dashboard import (
    Dashboard,
    OrderStatus,
    OrderUpdate,
    OrderResponse,
    OrderListResponse,
    OrderListResponseData,
    OrderListFilterResponse,
    LockStatus,
    DeleteMultipleResponseData,
    StatusUpdateMultipleResponseData,
    AssignDriverResponseData,
)
from backend.models.postal_code import PostalCode, PostalCodeDetail
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
    current_user_id: str,
    order_no: Optional[str] = None,
) -> OrderListResponse:
    """
    대시보드 주문 목록 조회 (Pydantic 모델 반환) + order_no 필터링 추가
    """
    start_datetime, end_datetime = get_date_range(start_date, end_date)
    query = db.query(Dashboard).filter(
        Dashboard.eta >= start_datetime, Dashboard.eta < end_datetime
    )
    log_msg = f"주문 데이터 조회 - 기간: {start_datetime.strftime('%Y-%m-%d')} ~ {end_datetime.strftime('%Y-%m-%d')}"

    if order_no:
        query = query.filter(Dashboard.order_no.ilike(f"%{order_no}%"))
        log_msg += f", 주문번호: *{order_no}*"

    logger.db(log_msg)

    total_count = query.count()
    results = (
        query.order_by(Dashboard.eta.asc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    status_query = db.query(
        Dashboard.status, func.count(Dashboard.dashboard_id).label("count")
    ).filter(Dashboard.eta >= start_datetime, Dashboard.eta < end_datetime)
    if order_no:
        status_query = status_query.filter(Dashboard.order_no.ilike(f"%{order_no}%"))
    status_counts_query = status_query.group_by(Dashboard.status).all()

    status_count_dict = {
        "WAITING": 0,
        "IN_PROGRESS": 0,
        "COMPLETE": 0,
        "ISSUE": 0,
        "CANCEL": 0,
    }
    for status_name, count in status_counts_query:
        status_count_dict[status_name] = count

    order_responses = []
    if results:
        for order in results:
            try:
                order_responses.append(OrderResponse.from_orm(order))
            except Exception as e:
                logger.error(
                    f"OrderResponse.from_orm 변환 실패 (서비스): order_id={order.dashboard_id}, 오류={e}"
                )
                continue

    response_data = OrderListResponseData(
        items=order_responses,
        total=total_count,
        page=page,
        limit=limit,
        statusCounts=status_count_dict,
        filter=OrderListFilterResponse(startDate=start_datetime, endDate=end_datetime),
    )

    return OrderListResponse(data=response_data)


def create_order(
    db: Session, order_data: Dict[str, Any], current_user_id: str
) -> Dashboard:
    """
    새 주문 생성 (우편번호 기반 자동 정보 업데이트 포함)
    """
    postal_code = order_data.get("postalCode")
    warehouse = order_data.get("warehouse")
    city, county, district, distance, duration_time = None, None, None, None, None

    if postal_code:
        # 우편번호 5자리 표준화
        if len(str(postal_code)) < 5:
            postal_code = str(postal_code).zfill(5)
            logger.db(
                f"우편번호 자동 보정: '{order_data.get("postalCode")}' → '{postal_code}'"
            )

        # PostalCode 테이블에서 city, county, district 조회
        pc_info = (
            db.query(PostalCode).filter(PostalCode.postal_code == postal_code).first()
        )
        if pc_info:
            city = pc_info.city
            county = pc_info.county
            district = pc_info.district
            logger.db(
                f"우편번호 정보 조회 성공: {postal_code} -> {city} {county} {district}"
            )
        else:
            logger.warn(f"우편번호 정보 없음: {postal_code}")

        # PostalCodeDetail 테이블에서 distance, duration_time 조회 (창고 정보 필요)
        if warehouse:
            pc_detail = (
                db.query(PostalCodeDetail)
                .filter(
                    PostalCodeDetail.postal_code == postal_code,
                    PostalCodeDetail.warehouse == warehouse,
                )
                .first()
            )
            if pc_detail:
                distance = pc_detail.distance
                duration_time = pc_detail.duration_time
                logger.db(
                    f"우편번호 상세 정보 조회 성공: {postal_code}, {warehouse} -> 거리:{distance}, 시간:{duration_time}"
                )
            else:
                logger.warn(
                    f"우편번호 상세 정보 없음: {postal_code}, 창고: {warehouse}"
                )
        else:
            logger.warn(f"우편번호 상세 정보 조회를 위한 창고 정보 누락: {postal_code}")

    new_order = Dashboard(
        order_no=order_data.get("orderNo"),
        type=order_data.get("type"),
        status=OrderStatus.WAITING,
        department=order_data.get("department"),
        warehouse=warehouse,
        sla=order_data.get("sla"),
        eta=order_data.get("eta"),
        create_time=datetime.now(),
        postal_code=postal_code,
        # 조회된 정보로 필드 업데이트
        city=city,
        county=county,
        district=district,
        distance=distance,
        duration_time=duration_time,
        # 나머지 필드
        address=order_data.get("address"),
        customer=order_data.get("customer"),
        contact=order_data.get("contact"),
        driver_name=order_data.get("driverName"),
        driver_contact=order_data.get("driverContact"),
        remark=order_data.get("remark"),
        updated_by=current_user_id,
        update_at=datetime.now(),
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    logger.db(
        f"주문 생성 - ID: {new_order.dashboard_id}, 번호: {new_order.order_no}, 생성자: {current_user_id}"
    )
    return new_order


def update_order(
    db: Session, order_id: int, order_data: Dict[str, Any], current_user_id: str
) -> Dashboard:
    """
    주문 정보 업데이트 서비스 (우편번호/창고 변경 시 자동 정보 업데이트 포함)
    """
    order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()
    if not order:
        logger.error(f"주문 수정 실패 - ID={order_id}, 주문 없음")
        raise ValueError("주문을 찾을 수 없습니다")

    # 락 검증 (서비스 레벨에서도 추가 - 라우트에서 이미 수행하지만 안전을 위해)
    validate_lock(db, Dashboard, order_id, current_user_id)

    postal_code_changed = False
    warehouse_changed = False
    new_postal_code = order.postal_code
    new_warehouse = order.warehouse

    # 입력된 데이터로 기본 업데이트 준비
    update_dict = {}
    for key, value in order_data.items():
        if key == "postalCode":
            original_postal_code = value
            # 5자리 표준화
            if value and len(str(value)) < 5:
                value = str(value).zfill(5)
                logger.db(f"우편번호 자동 보정: '{original_postal_code}' → '{value}'")
            # 변경 여부 확인
            if order.postal_code != value:
                postal_code_changed = True
                new_postal_code = value
            update_dict["postal_code"] = value
        elif key == "warehouse":
            if order.warehouse != value:
                warehouse_changed = True
                new_warehouse = value
            update_dict["warehouse"] = value
        elif key == "driverName":
            update_dict["driver_name"] = value
        elif key == "driverContact":
            update_dict["driver_contact"] = value
        elif hasattr(order, key):
            update_dict[key] = value

    # 우편번호 또는 창고가 변경된 경우, 관련 정보 재조회 및 업데이트
    if postal_code_changed or warehouse_changed:
        city, county, district, distance, duration_time = None, None, None, None, None
        if new_postal_code:
            pc_info = (
                db.query(PostalCode)
                .filter(PostalCode.postal_code == new_postal_code)
                .first()
            )
            if pc_info:
                city = pc_info.city
                county = pc_info.county
                district = pc_info.district
                logger.db(
                    f"우편번호 정보 재조회 성공: {new_postal_code} -> {city} {county} {district}"
                )
            else:
                logger.warn(f"우편번호 정보 없음: {new_postal_code}")

            if new_warehouse:
                pc_detail = (
                    db.query(PostalCodeDetail)
                    .filter(
                        PostalCodeDetail.postal_code == new_postal_code,
                        PostalCodeDetail.warehouse == new_warehouse,
                    )
                    .first()
                )
                if pc_detail:
                    distance = pc_detail.distance
                    duration_time = pc_detail.duration_time
                    logger.db(
                        f"우편번호 상세 정보 재조회 성공: {new_postal_code}, {new_warehouse} -> 거리:{distance}, 시간:{duration_time}"
                    )
                else:
                    logger.warn(
                        f"우편번호 상세 정보 없음: {new_postal_code}, 창고: {new_warehouse}"
                    )
            else:
                logger.warn(
                    f"우편번호 상세 정보 조회를 위한 창고 정보 누락: {new_postal_code}"
                )

        # 재조회된 정보로 업데이트 딕셔너리에 추가/덮어쓰기
        update_dict["city"] = city
        update_dict["county"] = county
        update_dict["district"] = district
        update_dict["distance"] = distance
        update_dict["duration_time"] = duration_time

    # 최종 업데이트 적용
    for db_key, db_value in update_dict.items():
        if hasattr(order, db_key):
            setattr(order, db_key, db_value)

    order.updated_by = current_user_id
    order.update_at = datetime.now()

    db.commit()
    db.refresh(order)
    logger.db(f"주문 수정 - ID: {order_id}, 수정자: {current_user_id}")
    return order


def delete_order(db: Session, order_id: int, current_user_id: str) -> bool:
    """단일 주문 삭제 서비스 (락/권한 검증 추가)"""
    order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()
    if not order:
        return False

    # 락 검증
    validate_lock(db, Dashboard, order_id, current_user_id)
    # TODO: 필요 시 추가 권한 검증 (예: 관리자 또는 특정 상태만 삭제 가능)

    logger.db(f"주문 삭제 시도 - ID: {order_id}, 사용자: {current_user_id}")
    db.delete(order)
    db.commit()
    logger.db(f"주문 삭제 완료 - ID: {order_id}")
    return True


def delete_multiple_orders(
    db: Session,
    order_ids: List[int],
    current_user_id: str,
    current_user_role: str,  # 역할 추가
) -> Dict[str, Any]:
    """다중 주문 삭제 서비스 (락/권한 검증 추가)"""
    logger.api(
        f"주문 일괄 삭제 요청 - 사용자: {current_user_id}, 대상: {len(order_ids)}건"
    )

    # 권한 검증 (관리자만 삭제 가능하도록)
    if current_user_role != UserRole.ADMIN:
        logger.auth(f"권한 부족 - 주문 일괄 삭제 시도: {current_user_id}")
        return {
            "success": False,
            "message": "관리자만 주문을 삭제할 수 있습니다.",
            "data": None,
        }

    if not order_ids:
        return {"success": False, "message": "삭제할 주문을 선택해주세요", "data": None}

    orders = db.query(Dashboard).filter(Dashboard.dashboard_id.in_(order_ids)).all()
    if not orders:
        return {
            "success": False,
            "message": "선택한 주문을 찾을 수 없습니다",
            "data": None,
        }

    # 락 검증
    locked_ids = []
    for order in orders:
        lock_status = check_lock_status(
            db, Dashboard, order.dashboard_id, current_user_id
        )
        if lock_status["locked"] and not lock_status["editable"]:
            locked_ids.append(order.dashboard_id)

    if locked_ids:
        # 락 걸린 주문 제외하고 진행 또는 오류 반환 (여기서는 오류 반환)
        error_msg = f"일부 주문({locked_ids})이 다른 사용자에 의해 잠겨 있어 삭제할 수 없습니다."
        logger.lock(f"주문 일괄 삭제 락 충돌 - {error_msg}, 요청자: {current_user_id}")
        return {"success": False, "message": error_msg, "data": None}

    deleted_count = 0
    for order in orders:
        db.delete(order)
        deleted_count += 1

    db.commit()
    logger.db(f"주문 삭제 완료 - {deleted_count}건, 처리자: {current_user_id}")

    return {
        "success": True,
        "message": f"{deleted_count}개 주문 삭제 성공",
        # forbidden_ids는 현재 로직에서 발생하지 않으므로 빈 리스트 전달
        "data": DeleteMultipleResponseData(
            deleted_count=deleted_count, forbidden_ids=[]
        ).dict(by_alias=True),
    }


def update_multiple_orders_status(
    db: Session, order_ids: List[int], status: str, current_user: Dict[str, Any]
) -> Dict[str, Any]:
    """
    여러 주문 상태 일괄 변경 (락 검증 추가)
    """
    logger.api(
        f"상태 일괄 변경 요청 - 상태: {status}, 대상: {len(order_ids)}건, 사용자: {current_user['user_id']}"
    )
    if not order_ids:
        return {"success": False, "message": "변경할 주문을 선택해주세요", "data": None}
    orders = db.query(Dashboard).filter(Dashboard.dashboard_id.in_(order_ids)).all()
    if not orders:
        return {
            "success": False,
            "message": "선택한 주문을 찾을 수 없습니다",
            "data": None,
        }

    # 락 검증
    locked_ids = []
    for order in orders:
        lock_status = check_lock_status(
            db, Dashboard, order.dashboard_id, current_user["user_id"]
        )
        if lock_status["locked"] and not lock_status["editable"]:
            locked_ids.append(order.dashboard_id)

    if locked_ids:
        # 락 걸린 주문 제외하고 진행 또는 오류 반환 (여기서는 오류 반환)
        error_msg = f"일부 주문({locked_ids})이 다른 사용자에 의해 잠겨 있어 상태를 변경할 수 없습니다."
        logger.lock(
            f"상태 일괄 변경 락 충돌 - {error_msg}, 요청자: {current_user['user_id']}"
        )
        return {"success": False, "message": error_msg, "data": None}

    current_time = datetime.now()
    is_admin = current_user["user_role"] == UserRole.ADMIN
    allowed_transitions = {
        OrderStatus.WAITING: [OrderStatus.IN_PROGRESS],
        OrderStatus.IN_PROGRESS: [
            OrderStatus.COMPLETE,
            OrderStatus.ISSUE,
            OrderStatus.CANCEL,
        ],
    }

    updated_count = 0
    forbidden_ids = []

    for order in orders:
        can_update = True
        if not is_admin:
            if (
                order.status not in allowed_transitions
                or status not in allowed_transitions.get(order.status, [])
            ):
                can_update = False
                forbidden_ids.append(order.dashboard_id)
                logger.auth(
                    f"권한 부족 - 주문 ID: {order.dashboard_id}, 상태변경: {order.status} → {status}, 사용자: {current_user['user_id']}"
                )
                continue

        if can_update:
            prev_status = order.status
            if prev_status == OrderStatus.WAITING and status == OrderStatus.IN_PROGRESS:
                order.depart_time = current_time
            elif prev_status == OrderStatus.IN_PROGRESS and status in [
                OrderStatus.COMPLETE,
                OrderStatus.ISSUE,
                OrderStatus.CANCEL,
            ]:
                order.complete_time = current_time

            order.status = status
            order.updated_by = current_user["user_id"]
            order.update_at = current_time
            updated_count += 1

    db.commit()

    message = f"{updated_count}개 주문 상태 변경 완료"
    if forbidden_ids:
        message += f" (실패: {len(forbidden_ids)}개 - 권한 부족)"
    logger.db(message + f", 처리자: {current_user['user_id']}")

    return {
        "success": True,
        "message": message,
        "data": StatusUpdateMultipleResponseData(
            updated_count=updated_count, forbidden_ids=forbidden_ids
        ).dict(by_alias=True),
    }


def assign_driver_to_orders(
    db: Session,
    order_ids: List[int],
    driver_name: str,
    driver_contact: Optional[str],
    current_user_id: str,
) -> int:
    """기사 일괄 배정 서비스 (락 검증 추가)"""
    logger.api(
        f"기사 배정 요청 - 기사: {driver_name}, 대상: {len(order_ids)}건, 사용자: {current_user_id}"
    )
    if not order_ids:
        return 0
    orders = db.query(Dashboard).filter(Dashboard.dashboard_id.in_(order_ids)).all()
    if not orders:
        return 0

    # 락 검증
    locked_ids = []
    for order in orders:
        lock_status = check_lock_status(
            db, Dashboard, order.dashboard_id, current_user_id
        )
        if lock_status["locked"] and not lock_status["editable"]:
            locked_ids.append(order.dashboard_id)

    if locked_ids:
        # 락 걸린 주문 제외하고 진행 또는 오류 반환 (여기서는 오류 반환)
        # 실제 운영 시에는 락 풀릴 때까지 대기하거나, 락 걸리지 않은 주문만 처리하는 등 정책 결정 필요
        error_msg = f"일부 주문({locked_ids})이 다른 사용자에 의해 잠겨 있어 기사를 배정할 수 없습니다."
        logger.lock(f"기사 배정 락 충돌 - {error_msg}, 요청자: {current_user_id}")
        raise ValueError(error_msg)  # 라우터에서 처리하도록 예외 발생

    assigned_count = 0
    current_time = datetime.now()
    for order in orders:
        order.driver_name = driver_name
        order.driver_contact = driver_contact
        order.updated_by = current_user_id
        order.update_at = current_time
        assigned_count += 1

    db.commit()
    logger.db(f"기사 배정 완료 - {assigned_count}건, 처리자: {current_user_id}")
    return assigned_count
