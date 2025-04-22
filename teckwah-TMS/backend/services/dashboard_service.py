"""
대시보드 관련 비즈니스 로직
"""

from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import ValidationError

# ORM 모델 import
from backend.models.dashboard import Dashboard
from backend.models.postal_code import PostalCode, PostalCodeDetail

# 스키마 import
from backend.schemas.dashboard_schema import (
    OrderStatus,
    OrderResponse,
    OrderListResponseData,
    OrderListFilterResponse,
    LockStatus,
    DeleteMultipleResponseData,
    StatusUpdateMultipleResponseData,
    AssignDriverResponseData,
)
from backend.schemas.user_schema import UserRole  # UserRole 스키마 가져오기

from backend.utils.logger import logger
from backend.utils.date_utils import get_date_range
from backend.utils.lock import check_lock_status, validate_lock


def get_dashboard_orders(
    db: Session,
    start_date: Optional[str],
    end_date: Optional[str],
    page: int,
    limit: int,
    current_user_id: str,
    order_no: Optional[str] = None,
    status: Optional[str] = None,
    department: Optional[str] = None,
    warehouse: Optional[str] = None,
) -> Dict[str, Any]:
    """
    대시보드 주문 목록 조회 (dict 반환) + order_no, status, department, warehouse 필터링 추가 + 상세 로깅
    """
    logger.debug(f"서비스 get_dashboard_orders 시작")
    # --- [로그 3] DB 조회 직전 파라미터/조건 로깅 ---
    try:
        start_datetime, end_datetime = get_date_range(start_date, end_date)
        logger.debug(f"  DB 조회를 위한 날짜 범위: {start_datetime} ~ {end_datetime}")
    except ValueError as date_err:
        logger.error(
            f"날짜 변환 오류: start='{start_date}', end='{end_date}'. 오류: {date_err}"
        )
        # 날짜 변환 실패 시 오류 응답 반환
        return {
            "success": False,
            "message": f"날짜 형식 오류: {date_err}",
            "data": None,
        }

    base_query = db.query(Dashboard).filter(
        Dashboard.eta >= start_datetime, Dashboard.eta <= end_datetime
    )
    log_msg_parts = [
        f"ETA >= {start_datetime.strftime('%Y-%m-%d')}",
        f"ETA <= {end_datetime.strftime('%Y-%m-%d')}",
    ]

    if order_no:
        base_query = base_query.filter(Dashboard.order_no.ilike(f"%{order_no}%"))
        log_msg_parts.append(f"order_no LIKE '%{order_no}%'")

    # status 필터링 추가
    if status:
        base_query = base_query.filter(Dashboard.status == status)
        log_msg_parts.append(f"status == '{status}'")

    # department 필터링 추가
    if department:
        base_query = base_query.filter(Dashboard.department == department)
        log_msg_parts.append(f"department == '{department}'")

    # warehouse 필터링 추가
    if warehouse:
        base_query = base_query.filter(Dashboard.warehouse == warehouse)
        log_msg_parts.append(f"warehouse == '{warehouse}'")

    logger.debug(f"  DB 기본 쿼리 조건: {' AND '.join(log_msg_parts)}")
    # -----------------------------------------------

    # --- DB 조회 실행 및 결과 로깅 ---
    results = []
    total_count = 0
    status_count_dict = {
        "WAITING": 0,
        "IN_PROGRESS": 0,
        "COMPLETE": 0,
        "ISSUE": 0,
        "CANCEL": 0,
    }
    try:
        # 전체 건수 조회 (필터링 적용)
        count_query = base_query.with_entities(func.count(Dashboard.dashboard_id))
        total_count = count_query.scalar()
        logger.db(f"  전체 건수 조회 성공: {total_count} 건")

        # 실제 데이터 조회 (정렬, 페이징 적용)
        data_query = (
            base_query.order_by(Dashboard.eta.asc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        results = data_query.all()
        logger.db(
            f"  DB 조회 성공: {len(results)} 건 조회 (페이지: {page}, Limit: {limit}, 전체 {total_count} 건)"
        )
        if results:
            logger.debug(f"    조회된 첫번째 ORM 객체 타입: {type(results[0])}")
            for i, order_orm in enumerate(results):
                try:
                    # ORM 객체의 모든 컬럼 값을 dict로 변환하여 로깅 (주의: 데이터 양이 많으면 성능 저하 가능)
                    orm_dict = {
                        c.name: getattr(order_orm, c.name, "N/A")
                        for c in order_orm.__table__.columns
                    }
                    logger.debug(f"    Raw ORM Data [{i}]: {orm_dict}")
                except Exception as e_orm_log:
                    logger.warning(f"    Raw ORM Data [{i}] 로깅 중 오류: {e_orm_log}")
                    logger.debug(
                        f"    Raw ORM Data [{i}] Type: {type(order_orm)}"
                    )  # 타입이라도 로깅
        else:
            logger.debug("    조회된 ORM 데이터 없음")
        # ---------------------------------------------

        # --- 상태 집계 로깅 (기존 로직 유지) ---
        status_query = base_query.with_entities(
            Dashboard.status, func.count(Dashboard.dashboard_id).label("count")
        ).group_by(Dashboard.status)
        status_counts_query = status_query.all()
        logger.db(f"  상태 집계 결과: {status_counts_query}")
        # 기본값 설정 후 조회 결과로 업데이트
        for status_name, count in status_counts_query:
            if status_name in status_count_dict:
                status_count_dict[status_name] = count
        logger.debug(f"    상태 집계 Dict: {status_count_dict}")
        # ----------------------

    except Exception as e:
        logger.error(f"DB 조회 또는 집계 중 오류 발생: {e}", exc_info=True)
        # 오류 발생 시 실패 응답 반환
        return {
            "success": False,
            "message": f"데이터베이스 조회 오류: {e}",
            "data": None,
        }
    # -----------------------------

    # --- [로그 5] OrderResponse 변환 및 로깅 ---
    order_responses = []
    logger.debug(f"Pydantic 모델(OrderResponse) 변환 시작 - 대상 {len(results)} 건")
    if results:
        for i, order_orm in enumerate(results):
            try:
                # 변환 시도 전 원본 데이터 다시 로깅 (선택적, 위에서 이미 로깅함)
                # logger.debug(f"  OrderResponse 변환 시도 [{i}]: ID={getattr(order_orm, 'dashboard_id', 'N/A')}, ...}")

                # Pydantic v2: model_validate 사용
                response_item = OrderResponse.model_validate(order_orm)

                # 변환 후 주요 값 로깅
                logger.debug(
                    f"    OrderResponse 변환 성공 [{i}]: ID={response_item.dashboard_id}, OrderNo={response_item.order_no}, Status={response_item.status}"
                )
                order_responses.append(response_item)

            except ValidationError as ve:
                # Pydantic 유효성 검사 오류 발생 시
                logger.error(
                    f"  OrderResponse.model_validate 유효성 검사 실패 [{i}]: order_id={getattr(order_orm, 'dashboard_id', 'N/A')}, 오류={ve.errors()}",
                    exc_info=True,  # Traceback 로깅
                )
                # 실패한 ORM 객체 데이터 상세 로깅
                try:
                    failed_orm_dict = {
                        c.name: getattr(order_orm, c.name, "N/A")
                        for c in order_orm.__table__.columns
                    }
                    logger.error(
                        f"    유효성 검사 실패한 원본 ORM 데이터 [{i}]: {failed_orm_dict}"
                    )
                except Exception as e_fail_log:
                    logger.error(f"    실패 ORM 데이터 로깅 중 오류: {e_fail_log}")
                # 중요: 여기서 오류를 발생시키지 않고, 실패 정보를 포함하여 반환하거나, 부분 성공으로 처리할지 결정 필요
                # 우선은 로그만 남기고 계속 진행 (라우터에서 최종적으로 422가 발생할 수 있음)
                # 또는 즉시 오류 응답 반환:
                # return {"success": False, "message": f"데이터 유효성 검증 실패 (ID: {getattr(order_orm, 'dashboard_id', 'N/A')}): {ve.errors()}", "data": None}

            except Exception as e:
                # 기타 예외 처리 (예: ORM 객체 속성 접근 오류 등)
                logger.error(
                    f"  OrderResponse.model_validate 변환 중 일반 오류 [{i}]: order_id={getattr(order_orm, 'dashboard_id', 'N/A')}, 오류={e}",
                    exc_info=True,
                )
                # 즉시 오류 응답 반환
                return {
                    "success": False,
                    "message": f"데이터 처리 중 오류 발생 (ID: {getattr(order_orm, 'dashboard_id', 'N/A')})",
                    "data": None,
                }

    logger.debug(
        f"  OrderResponse 변환 완료: 최종 {len(order_responses)} 건 (시도: {len(results)} 건)"
    )
    # -------------------------------

    # --- [로그 6] 최종 응답 딕셔너리 생성 전 데이터 로깅 ---
    filter_data = OrderListFilterResponse(
        start_date=start_datetime, end_date=end_datetime
    )
    # 최종 응답 데이터 구조 생성 (Pydantic 모델 사용)
    try:
        response_data_payload = OrderListResponseData(
            items=order_responses,
            total=total_count,
            page=page,
            limit=limit,
            status_counts=status_count_dict,
            filter=filter_data,
        )
        logger.debug(
            f"OrderListResponseData 생성 성공: items_len={len(response_data_payload.items)}, total={response_data_payload.total}, page={response_data_payload.page}"
        )
    except Exception as data_model_exc:
        logger.error(
            f"OrderListResponseData 생성 실패: {data_model_exc}", exc_info=True
        )
        logger.error(
            f"  실패 시점 데이터: items_len={len(order_responses)}, total={total_count}, page={page}, limit={limit}, status_counts={status_count_dict}, filter={filter_data.dict()}"
        )
        return {"success": False, "message": "응답 데이터 구조 생성 실패", "data": None}

    # 최종 반환 딕셔너리 구성 (APIResponse 형식 준수)
    final_response_dict = {
        "success": True,
        "message": "주문 목록 조회 성공",
        "data": response_data_payload.dict(by_alias=True),  # camelCase로 변환하여 반환
    }
    # 최종 반환 딕셔너리 로깅 (요약)
    log_final_summary = {
        k: type(v) if k == "data" else v for k, v in final_response_dict.items()
    }
    if "data" in final_response_dict and isinstance(final_response_dict["data"], dict):
        log_final_summary["data_summary"] = {
            "items_len": len(final_response_dict["data"].get("items", [])),
            "total": final_response_dict["data"].get("total"),
            # 필요한 키 추가...
        }
    logger.debug(
        f"서비스 get_dashboard_orders 최종 반환 딕셔너리 (요약): {log_final_summary}"
    )
    return final_response_dict


def create_order(
    db: Session, order_data: Dict[str, Any], current_user_id: str
) -> Dashboard:
    """
    새 주문 생성 (우편번호 기반 자동 정보 업데이트 포함) + 상세 로깅
    """
    logger.debug(f"create_order 서비스 시작. 입력 data: {order_data}")
    postal_code = order_data.get("postalCode")
    warehouse = order_data.get("warehouse")
    city, county, district, distance, duration_time = None, None, None, None, None

    if postal_code:
        # 우편번호 5자리 표준화
        if len(str(postal_code)) < 5:
            postal_code = str(postal_code).zfill(5)
            logger.db(
                f"우편번호 자동 보정: '{order_data.get('postalCode')}' → '{postal_code}'"
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

    logger.debug(
        f"  생성된 Dashboard 객체 (일부): OrderNo={new_order.order_no}, ETA={new_order.eta}, Customer={new_order.customer}"
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    logger.db(f"주문 생성 DB 반영 완료 - ID: {new_order.dashboard_id}")
    return new_order


def update_order(
    db: Session, order_id: int, order_data: Dict[str, Any], current_user_id: str
) -> Optional[Dashboard]:
    """
    주문 정보 업데이트 서비스 (우편번호/창고 변경 시 자동 정보 업데이트 포함) + 상세 로깅
    """
    logger.debug(f"서비스 update_order 시작. ID: {order_id}")
    logger.debug(f"  입력 data: {order_data}")  # 전달받은 dict 로깅
    try:
        order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()
    except Exception as db_exc:
        logger.error(
            f"주문 조회 중 DB 오류 발생 (order_id={order_id}): {db_exc}", exc_info=True
        )
        # DB 오류 시 None 반환 또는 예외 발생 (라우터에서 처리하도록 None 반환)
        return None

    if not order:
        logger.error(f"주문 수정 실패 - ID={order_id}, 주문 없음")
        # 라우터에서 처리하도록 None 반환 (또는 여기서 ValueError 발생시켜 라우터에서 잡도록 할 수도 있음)
        # raise ValueError("주문을 찾을 수 없습니다")
        return None

    # 락 검증 (서비스 레벨 - 라우터에서 이미 수행했더라도 방어적으로)
    try:
        validate_lock(db, Dashboard, order_id, current_user_id)
        logger.debug(f"  락 검증 통과 (order_id={order_id})")
    except Exception as lock_exc:
        logger.error(f"  락 검증 중 예상치 못한 오류: {lock_exc}", exc_info=True)
        # 예상치 못한 오류는 일반 오류로 처리 (None 반환 또는 새 예외 발생)
        return None

    # ... (우편번호/창고 변경 로직 및 로깅은 기존 유지) ...
    postal_code_changed = False
    warehouse_changed = False
    new_postal_code = order.postal_code
    new_warehouse = order.warehouse

    update_dict = {}
    logger.debug(f"  업데이트할 필드 확인 시작")
    for key, value in order_data.items():
        # status 필드는 업데이트 대상에서 제외 (다른 API 사용)
        if key == "status":
            logger.warning(
                f"    'status' 필드는 update_order에서 무시됨 (order_id={order_id})"
            )
            continue

        # 나머지 필드는 update_dict에 추가 (이후 우편번호/창고 로직에서 덮어쓸 수 있음)
        # 주의: 모델에 없는 필드가 들어올 경우 에러 발생 가능성 있음
        # hasattr(order, key) 체크는 DB 모델 기준이므로, camelCase key는 처리 못함
        # 라우터에서 받은 order_data는 이미 snake_case로 변환되었어야 함 (Pydantic 처리)
        # 만약 camelCase가 넘어왔다면 여기서 오류 발생 가능 -> 라우터 로그 확인 필요
        if hasattr(order, key):
            update_dict[key] = value
            logger.debug(f"    업데이트 대상 포함: {key} = {value}")
            # 우편번호/창고 변경 감지
            if key == "postal_code":
                original_postal_code = value
                if value and len(str(value)) < 5:
                    value = str(value).zfill(5)
                    logger.db(
                        f"    우편번호 자동 보정: '{original_postal_code}' → '{value}'"
                    )
                if order.postal_code != value:
                    postal_code_changed = True
                    new_postal_code = value
                update_dict["postal_code"] = value  # 보정된 값으로 다시 저장
            elif key == "warehouse":
                if order.warehouse != value:
                    warehouse_changed = True
                    new_warehouse = value
                update_dict["warehouse"] = value
        else:
            logger.warning(
                f"    업데이트 요청된 필드 '{key}'가 DB 모델에 없어 무시됨 (order_id={order_id})"
            )

    # 우편번호 또는 창고 변경 시 관련 정보 재조회 (기존 로깅 유지)
    if postal_code_changed or warehouse_changed:
        logger.debug(
            f"  우편번호/창고 변경 감지. 관련 정보 재조회 시작 (postal_code={new_postal_code}, warehouse={new_warehouse})"
        )
        # ... (재조회 로직 및 로그) ...
        city, county, district, distance, duration_time = None, None, None, None, None
        if new_postal_code:
            # ... (PostalCode 조회 로직 및 로그) ...
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
                    f"    우편번호 정보 재조회 성공: {new_postal_code} -> {city} {county} {district}"
                )
            else:
                logger.warn(f"    우편번호 정보 없음: {new_postal_code}")

            if new_warehouse:
                # ... (PostalCodeDetail 조회 로직 및 로그) ...
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
                        f"    우편번호 상세 정보 재조회 성공: {new_postal_code}, {new_warehouse} -> 거리:{distance}, 시간:{duration_time}"
                    )
                else:
                    logger.warn(
                        f"    우편번호 상세 정보 없음: {new_postal_code}, 창고: {new_warehouse}"
                    )
            else:
                logger.warn(
                    f"    상세 정보 조회를 위한 창고 정보 누락: {new_postal_code}"
                )

        # 재조회된 정보로 업데이트 딕셔너리에 추가/덮어쓰기
        update_dict["city"] = city
        update_dict["county"] = county
        update_dict["district"] = district
        update_dict["distance"] = distance
        update_dict["duration_time"] = duration_time
        logger.debug(f"  재조회된 정보 update_dict에 반영 완료")

    # 최종 업데이트 적용
    try:
        logger.debug(
            f"  최종 DB 업데이트 적용 시작. 대상 필드: {list(update_dict.keys())}"
        )
        for db_key, db_value in update_dict.items():
            # hasattr 체크는 위에서 했으므로 생략 가능하나, 안전을 위해 유지
            if hasattr(order, db_key):
                setattr(order, db_key, db_value)
            else:  # 이 경우는 발생하면 안됨
                logger.error(
                    f"    DB 업데이트 중 모델에 없는 필드 발생: {db_key}. 로직 오류 가능성."
                )

        order.updated_by = current_user_id
        order.update_at = datetime.now()

        db.commit()
        db.refresh(order)
        logger.db(f"주문 수정 DB 반영 완료 - ID: {order_id}")

        # --- [로그 6] 서비스 반환 직전 로깅 ---
        # 성공 시 업데이트된 ORM 객체 반환
        logger.debug(
            f"서비스 update_order 성공. 업데이트된 ORM 객체 반환 (order_id={order_id})"
        )
        try:
            updated_orm_dict = {
                c.name: getattr(order, c.name, "N/A") for c in order.__table__.columns
            }
            logger.debug(f"  반환될 ORM 데이터 (dict): {updated_orm_dict}")
        except Exception as e_final_orm_log:
            logger.error(f"  반환 ORM 데이터 로깅 중 오류: {e_final_orm_log}")
        # -------------------------------------
        return order

    except Exception as commit_exc:
        logger.error(
            f"DB commit/refresh 중 오류 발생 (order_id={order_id}): {commit_exc}",
            exc_info=True,
        )
        db.rollback()  # 오류 발생 시 롤백
        return None  # 실패 시 None 반환


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
