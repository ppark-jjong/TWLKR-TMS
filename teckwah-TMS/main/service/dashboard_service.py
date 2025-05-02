"""
대시보드(주문) 관련 서비스 로직
"""

from typing import Optional, List, Dict, Tuple, Any
from datetime import datetime, timedelta, date
from sqlalchemy import and_, or_, func, text, desc, case, extract
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from starlette import status

from main.models.dashboard_model import Dashboard
from main.models.postal_code_model import PostalCode
from main.schema.dashboard_schema import DashboardCreate, DashboardUpdate
from main.utils.lock import acquire_lock, release_lock, check_lock_status
from main.utils.pagination import calculate_dashboard_stats, paginate_query
import logging

logger = logging.getLogger(__name__)


def get_dashboard_by_id(db: Session, dashboard_id: int) -> Optional[Dashboard]:
    """ID로 주문 조회"""
    try:
        order = (
            db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
        )
        if not order:
            logger.warning(f"주문을 찾을 수 없음: ID {dashboard_id}")
        return order
    except SQLAlchemyError as e:
        logger.error(f"주문 조회 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터베이스 오류가 발생했습니다.",
        )


def get_dashboard_response_data(
    order: Dashboard, is_editable: bool = False
) -> Dict[str, Any]:
    """주문 정보를 응답 형식으로 변환"""
    logger.info(f"응답 데이터 변환: order_id={order.dashboard_id}")

    status_labels = {
        "WAITING": "대기",
        "IN_PROGRESS": "진행",
        "COMPLETE": "완료",
        "ISSUE": "이슈",
        "CANCEL": "취소",
    }
    type_labels = {"DELIVERY": "배송", "RETURN": "회수"}

    try:
        # 순환 참조 방지를 위해 postal_code_obj 속성 제외
        order_dict = order.__dict__.copy()
        if "postal_code_obj" in order_dict:
            del order_dict["postal_code_obj"]

        # 기본 필수 필드
        response_data = {
            "dashboardId": order.dashboard_id,
            "orderNo": order.order_no,
            "type": order.type,
            "status": order.status,
            "department": order.department,
            "warehouse": order.warehouse,
            "sla": order.sla,
            "eta": order.eta,
            "createTime": order.create_time,
            "departTime": order.depart_time,
            "completeTime": order.complete_time,
            "postalCode": order.postal_code,
            "address": order.address,
            "customer": order.customer,
            "contact": order.contact,
            "driverName": order.driver_name,
            "driverContact": order.driver_contact,
            "updatedBy": order.update_by,
            "remark": order.remark,
            "updateAt": order.update_at,
            "isLocked": order.is_locked,
            "statusLabel": status_labels.get(order.status, order.status),
            "typeLabel": type_labels.get(order.type, order.type),
            "editable": is_editable,
        }

        # 선택적 필드들은 getattr로 안전하게 접근
        optional_fields = [
            "city",
            "county",
            "district",
            "region",
            "distance",
            "durationTime",
        ]

        for field in optional_fields:
            # 스네이크 케이스에서 카멜 케이스로 변환 (duration_time -> durationTime)
            db_field = "duration_time" if field == "durationTime" else field
            value = getattr(order, db_field, None)
            if field in ["city", "county", "district", "region"] and (
                value is None or value == ""
            ):
                response_data[field] = ""
            else:
                response_data[field] = value

        return response_data

    except Exception as e:
        logger.error(f"응답 데이터 생성 중 오류: {str(e)}", exc_info=True)
        # 최소한의 필수 필드만 포함
        return {
            "dashboardId": order.dashboard_id,
            "orderNo": order.order_no,
            "type": order.type,
            "status": order.status,
            "department": order.department,
            "warehouse": order.warehouse,
            "region": "",
            "statusLabel": status_labels.get(order.status, order.status),
            "typeLabel": type_labels.get(order.type, order.type),
            "editable": is_editable,
        }


def get_dashboard_by_order_no(db: Session, order_no: str) -> Optional[Dashboard]:
    """주문번호로 주문 조회"""
    try:
        order = db.query(Dashboard).filter(Dashboard.order_no == order_no).first()
        if not order:
            logger.warning(f"주문을 찾을 수 없음: 주문번호 {order_no}")
        return order
    except SQLAlchemyError as e:
        logger.error(f"주문 조회 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터베이스 오류가 발생했습니다.",
        )


def get_dashboard_list(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> List[Dashboard]:
    """조건에 맞는 주문 목록 조회 (페이지네이션 없음)"""
    logger.info(f"전체 주문 목록 조회: {start_date} ~ {end_date}")
    try:
        query = db.query(Dashboard)

        if start_date:
            start_datetime = datetime.combine(start_date, datetime.min.time())
            query = query.filter(Dashboard.eta >= start_datetime)

        if end_date:
            end_datetime = datetime.combine(end_date, datetime.max.time())
            query = query.filter(Dashboard.eta <= end_datetime)

        query = query.order_by(desc(Dashboard.eta))
        all_orders = query.all()
        logger.info(f"조회 결과: {len(all_orders)}건")

        return all_orders

    except SQLAlchemyError as e:
        logger.error(f"주문 목록 조회 중 DB 오류: {str(e)}", exc_info=True)
        return []
    except Exception as e:
        logger.error(f"주문 목록 조회 중 일반 오류: {str(e)}", exc_info=True)
        return []


def search_dashboard_by_order_no(db: Session, order_no: str) -> Optional[Dashboard]:
    """주문번호로 정확히 일치하는 단일 주문 검색"""
    logger.info(f"주문번호 검색: {order_no}")
    try:
        order = db.query(Dashboard).filter(Dashboard.order_no == order_no).first()
        return order
    except Exception as e:
        logger.error(f"주문번호 검색 오류: {str(e)}", exc_info=True)
        return None


def create_dashboard(db: Session, data: DashboardCreate, user_id: str) -> Dashboard:
    """주문 생성"""
    try:
        # 우편번호 4자리인 경우 앞에 '0' 추가
        postal_code = data.postal_code
        if len(postal_code) == 4:
            postal_code = "0" + postal_code

        logger.info(f"주문 생성: {data.order_no}, 우편번호={postal_code}")

        # 우편번호 존재 확인
        postal_exists = (
            db.query(PostalCode).filter(PostalCode.postal_code == postal_code).first()
        )
        if not postal_exists:
            new_postal = PostalCode(
                postal_code=postal_code, city=None, county=None, district=None
            )
            db.add(new_postal)
            db.flush()

        # 주문 모델 생성 - region 필드 제외 (데이터베이스에서 자동 생성됨)
        order_data = {
            "order_no": data.order_no,
            "type": data.type,
            "status": "WAITING",
            "department": data.department,
            "warehouse": data.warehouse,
            "sla": data.sla,
            "eta": data.eta,
            "create_time": datetime.now(),
            "postal_code": postal_code,
            "address": data.address,
            "customer": data.customer,
            "contact": data.contact if hasattr(data, "contact") else None,
            "driver_name": None,
            "driver_contact": None,
            "update_by": user_id,
            "update_at": datetime.now(),
            "remark": data.remark if hasattr(data, "remark") and data.remark else None,
            "is_locked": False,
        }

        order = Dashboard(**order_data)

        # 명시적으로 region 필드 None으로 설정
        if hasattr(order, "region"):
            order.region = None

        db.add(order)
        db.flush()

        logger.info(f"주문 생성 완료: ID {order.dashboard_id}")
        return order

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"주문 생성 오류: {str(e)}")
        if hasattr(e, "orig") and e.orig:
            logger.error(f"원본 오류: {type(e.orig).__name__}: {str(e.orig)}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터베이스 오류가 발생했습니다.",
        )


def update_dashboard(
    db: Session, dashboard_id: int, data: DashboardUpdate, user_id: str
) -> Dashboard:
    """주문 업데이트 및 락 관리"""
    logger.info(f"주문 업데이트: id={dashboard_id}, user={user_id}")

    # 락 획득 시도
    lock_success, lock_info = acquire_lock(db, "dashboard", dashboard_id, user_id)

    if not lock_success:
        logger.warning(f"주문 업데이트 실패 (락 획득 불가): ID {dashboard_id}")
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=lock_info.get(
                "message", "현재 다른 사용자가 이 주문을 편집 중입니다."
            ),
        )

    try:
        # 주문 조회
        order = (
            db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
        )

        if not order:
            release_lock(db, "dashboard", dashboard_id, user_id)
            logger.warning(f"주문 업데이트 실패 (주문 없음): ID {dashboard_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="수정할 주문을 찾을 수 없습니다.",
            )

        # 변경된 데이터만 업데이트
        update_data = data.model_dump(exclude_unset=True)

        # 우편번호 처리
        if "postal_code" in update_data:
            postal_code = update_data["postal_code"]
            if postal_code and len(postal_code) != 5:
                release_lock(db, "dashboard", dashboard_id, user_id)
                raise HTTPException(
                    status_code=400, detail="우편번호는 5자리여야 합니다."
                )

            # 우편번호 테이블 확인/추가
            if postal_code and order.postal_code != postal_code:
                postal_exists = (
                    db.query(PostalCode)
                    .filter(PostalCode.postal_code == postal_code)
                    .first()
                )
                if not postal_exists:
                    new_postal = PostalCode(
                        postal_code=postal_code, city=None, county=None, district=None
                    )
                    db.add(new_postal)

        # 모델 필드 업데이트
        for key, value in update_data.items():
            if hasattr(order, key):
                setattr(order, key, value)

        # 업데이트 정보 갱신
        if update_data:
            order.update_by = user_id
            order.update_at = datetime.now()
            logger.info(
                f"주문 정보 업데이트: ID={dashboard_id}, 필드={list(update_data.keys())}"
            )

        db.commit()
        db.refresh(order)
        logger.info(f"주문 업데이트 완료: ID {dashboard_id}")
        return order

    except HTTPException as http_exc:
        db.rollback()
        raise http_exc
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"주문 업데이트 DB 오류: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터베이스 오류 발생",
        )
    except Exception as e:
        db.rollback()
        logger.error(f"주문 업데이트 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="주문 업데이트 중 오류 발생")
    finally:
        # 락 해제 (성공/실패 무관)
        try:
            release_lock(db, "dashboard", dashboard_id, user_id)
        except Exception as e:
            logger.error(f"주문 락 해제 실패: ID {dashboard_id}, 오류: {str(e)}")


def change_status(
    db: Session, dashboard_ids: List[int], new_status: str, user_id: str, user_role: str
) -> List[Dict[str, Any]]:
    """
    주문 상태 변경

    Args:
        db: 데이터베이스 세션
        dashboard_ids: 상태 변경할 주문 ID 목록
        new_status: 변경할 상태
        user_id: 변경 사용자 ID
        user_role: 사용자 역할(ADMIN/USER)

    Returns:
        List[Dict[str, Any]]: 상태 변경 결과 목록
    """
    results = []
    status_mapping = {
        "WAITING": "대기",
        "IN_PROGRESS": "진행",
        "COMPLETE": "완료",
        "ISSUE": "이슈",
        "CANCEL": "취소",
    }

    for dashboard_id in dashboard_ids:
        try:
            # 주문 조회
            order = (
                db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .first()
            )

            if not order:
                results.append(
                    {
                        "id": dashboard_id,
                        "success": False,
                        "message": "주문을 찾을 수 없습니다.",
                    }
                )
                continue

            # 현재 상태와 동일한 경우
            if order.status == new_status:
                results.append(
                    {
                        "id": dashboard_id,
                        "success": True,
                        "message": "이미 해당 상태입니다.",
                    }
                )
                continue

            # 일반 사용자의 상태 변경 제약 검증
            if user_role != "ADMIN":
                if order.status == "WAITING" and new_status != "IN_PROGRESS":
                    results.append(
                        {
                            "id": dashboard_id,
                            "success": False,
                            "message": f"대기 상태에서는 진행 상태로만 변경 가능합니다.",
                        }
                    )
                    continue

                if order.status == "IN_PROGRESS" and new_status not in [
                    "COMPLETE",
                    "ISSUE",
                    "CANCEL",
                ]:
                    results.append(
                        {
                            "id": dashboard_id,
                            "success": False,
                            "message": f"진행 상태에서는 완료/이슈/취소 상태로만 변경 가능합니다.",
                        }
                    )
                    continue

                if order.status in ["COMPLETE", "ISSUE", "CANCEL"]:
                    results.append(
                        {
                            "id": dashboard_id,
                            "success": False,
                            "message": f"완료/이슈/취소 상태에서는 상태 변경이 불가능합니다.",
                        }
                    )
                    continue

            # 락 획득 시도
            lock_success, lock_info = acquire_lock(
                db, "dashboard", dashboard_id, user_id
            )

            if not lock_success:
                results.append(
                    {
                        "id": dashboard_id,
                        "success": False,
                        "message": f"현재 다른 사용자가 이 주문을 편집 중입니다.",
                    }
                )
                continue

            # 상태 변경
            old_status = order.status
            order.status = new_status

            # 상태 진행 및 롤백 시간 처리
            status_order = ["WAITING", "IN_PROGRESS", "COMPLETE", "ISSUE", "CANCEL"]
            old_idx = status_order.index(old_status)
            new_idx = status_order.index(new_status)
            is_rollback = new_idx < old_idx

            # 대기 → 진행 시 depart_time 기록
            if old_status == "WAITING" and new_status == "IN_PROGRESS":
                order.depart_time = datetime.now()
                logger.info(
                    f"주문 ID {dashboard_id}: 대기→진행 상태 변경, 출발 시간 기록: {order.depart_time}"
                )

            # 진행 → 완료/이슈/취소 시 complete_time 기록
            elif old_status == "IN_PROGRESS" and new_status in [
                "COMPLETE",
                "ISSUE",
                "CANCEL",
            ]:
                order.complete_time = datetime.now()
                logger.info(
                    f"주문 ID {dashboard_id}: 진행→{new_status} 상태 변경, 완료 시간 기록: {order.complete_time}"
                )

            # 관리자 권한으로 상태 롤백 처리 추가
            elif is_rollback and user_role == "ADMIN":
                # 완료/이슈/취소 → 진행 또는 대기로 롤백 시 complete_time 초기화
                if old_status in ["COMPLETE", "ISSUE", "CANCEL"]:
                    order.complete_time = None
                    logger.info(
                        f"주문 ID {dashboard_id}: 완료/이슈/취소→{new_status} 상태 롤백, 완료 시간 초기화"
                    )

                # 진행 → 대기로 롤백 시 depart_time 초기화
                if old_status == "IN_PROGRESS" and new_status == "WAITING":
                    order.depart_time = None
                    logger.info(
                        f"주문 ID {dashboard_id}: 진행→대기 상태 롤백, 출발 시간 초기화"
                    )

            # 업데이트 정보 갱신
            order.update_by = user_id
            order.update_at = datetime.now()

            # 락 해제
            order.is_locked = False

            db.flush()

            # 결과 추가
            if is_rollback:
                message = f"상태 롤백 완료: {status_mapping.get(old_status)} → {status_mapping.get(new_status)}"
            else:
                message = f"상태 변경 완료: {status_mapping.get(old_status)} → {status_mapping.get(new_status)}"

            results.append(
                {
                    "id": dashboard_id,
                    "success": True,
                    "message": message,
                    "rollback": is_rollback,
                    "old_status": old_status,
                    "new_status": new_status,
                }
            )

        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"주문 상태 변경 중 오류 발생: ID {dashboard_id}, {str(e)}")
            results.append(
                {
                    "id": dashboard_id,
                    "success": False,
                    "message": "데이터베이스 오류가 발생했습니다.",
                }
            )

    # 모든 변경 사항 커밋
    db.commit()

    logger.info(f"상태 변경 처리 완료: {len(results)}건, 사용자 {user_id}")
    return results


def assign_driver(
    db: Session,
    dashboard_ids: List[int],
    driver_name: str,
    driver_contact: Optional[str],
    user_id: str,
) -> List[Dict[str, Any]]:
    """
    주문에 기사 배정

    Args:
        db: 데이터베이스 세션
        dashboard_ids: 기사 배정할 주문 ID 목록
        driver_name: 기사 이름
        driver_contact: 기사 연락처(선택)
        user_id: 변경 사용자 ID

    Returns:
        List[Dict[str, Any]]: 기사 배정 결과 목록
    """
    results = []

    for dashboard_id in dashboard_ids:
        try:
            # 주문 조회
            order = (
                db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .first()
            )

            if not order:
                results.append(
                    {
                        "id": dashboard_id,
                        "success": False,
                        "message": "주문을 찾을 수 없습니다.",
                    }
                )
                continue

            # 락 획득 시도
            lock_success, lock_info = acquire_lock(
                db, "dashboard", dashboard_id, user_id
            )

            if not lock_success:
                results.append(
                    {
                        "id": dashboard_id,
                        "success": False,
                        "message": f"현재 다른 사용자가 이 주문을 편집 중입니다.",
                    }
                )
                continue

            # 기사 정보 업데이트
            order.driver_name = driver_name
            order.driver_contact = driver_contact

            # 업데이트 정보 갱신
            order.update_by = user_id
            order.update_at = datetime.now()

            # 락 해제
            order.is_locked = False

            db.flush()

            # 결과 추가
            results.append(
                {
                    "id": dashboard_id,
                    "success": True,
                    "message": f"기사 배정 완료: {driver_name}",
                }
            )

        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"기사 배정 중 오류 발생: ID {dashboard_id}, {str(e)}")
            results.append(
                {
                    "id": dashboard_id,
                    "success": False,
                    "message": "데이터베이스 오류가 발생했습니다.",
                }
            )

    # 모든 변경 사항 커밋
    db.commit()

    logger.info(f"기사 배정 처리 완료: {len(results)}건, 사용자 {user_id}")
    return results


def delete_dashboard(
    db: Session, dashboard_ids: List[int], user_id: str, user_role: str
) -> List[Dict[str, Any]]:
    """
    주문 삭제

    Args:
        db: 데이터베이스 세션
        dashboard_ids: 삭제할 주문 ID 목록
        user_id: 변경 사용자 ID
        user_role: 사용자 역할(ADMIN/USER)

    Returns:
        List[Dict[str, Any]]: 삭제 결과 목록
    """
    results = []

    # 관리자 권한 확인
    if user_role != "ADMIN":
        logger.warning(f"주문 삭제 권한 없음: 사용자 {user_id}")
        return [
            {
                "success": False,
                "message": "삭제 권한이 없습니다. 관리자에게 문의하세요.",
            }
        ]

    for dashboard_id in dashboard_ids:
        try:
            # 주문 조회
            order = (
                db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .first()
            )

            if not order:
                results.append(
                    {
                        "id": dashboard_id,
                        "success": False,
                        "message": "주문을 찾을 수 없습니다.",
                    }
                )
                continue

            # 락 획득 시도
            lock_success, lock_info = acquire_lock(
                db, "dashboard", dashboard_id, user_id
            )

            if not lock_success:
                results.append(
                    {
                        "id": dashboard_id,
                        "success": False,
                        "message": f"현재 다른 사용자가 이 주문을 편집 중입니다.",
                    }
                )
                continue

            # 주문 삭제
            db.delete(order)
            db.flush()

            # 결과 추가
            results.append(
                {
                    "id": dashboard_id,
                    "success": True,
                    "message": f"주문 삭제 완료: {order.order_no}",
                }
            )

        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"주문 삭제 중 오류 발생: ID {dashboard_id}, {str(e)}")
            results.append(
                {
                    "id": dashboard_id,
                    "success": False,
                    "message": "데이터베이스 오류가 발생했습니다.",
                }
            )

    # 모든 변경 사항 커밋
    db.commit()

    logger.info(f"주문 삭제 처리 완료: {len(results)}건, 사용자 {user_id}")
    return results


def get_lock_status(db: Session, dashboard_id: int, user_id: str) -> Dict[str, Any]:
    """
    주문 락 상태 확인

    Args:
        db: 데이터베이스 세션
        dashboard_id: 확인할 주문 ID
        user_id: 확인 사용자 ID

    Returns:
        Dict[str, Any]: 락 상태 정보
    """
    return check_lock_status(db, "dashboard", dashboard_id, user_id)


def get_dashboard_list_paginated(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = 1,
    page_size: int = 30,
) -> Tuple[List[Dashboard], Dict[str, Any]]:
    """
    조건에 맞는 주문 목록 조회 (페이지네이션 적용)
    대시보드 초기 페이지 로드(/dashboard SSR)에서 사용됩니다.

    Args:
        db: 데이터베이스 세션
        start_date: 시작 날짜
        end_date: 종료 날짜
        page: 페이지 번호
        page_size: 페이지 크기

    Returns:
        Tuple[List[Dashboard], Dict[str, Any]]: (해당 페이지 주문 목록, 페이지네이션 정보)
    """
    logger.info(
        f"get_dashboard_list_paginated 시작: page={page}, size={page_size}, ..."
    )
    try:
        logger.debug("대시보드 기본 쿼리 생성 (페이지네이션용)")
        query = db.query(Dashboard)

        # 날짜 필터 적용 (기본값은 라우터에서 처리됨)
        if start_date:
            start_datetime = datetime.combine(start_date, datetime.min.time())
            query = query.filter(Dashboard.eta >= start_datetime)
        if end_date:
            end_datetime = datetime.combine(end_date, datetime.max.time())
            query = query.filter(Dashboard.eta <= end_datetime)

        # 정렬 적용
        query = query.order_by(desc(Dashboard.eta))
        logger.debug("정렬 조건 적용: eta 내림차순")

        # 페이지네이션 적용
        logger.debug(f"페이지네이션 적용 시작 (페이지 {page}, 크기 {page_size})")
        orders, pagination_info = paginate_query(query, page, page_size)
        logger.info(f"페이지네이션 결과: {len(orders)}건 조회됨")

        logger.info(
            f"대시보드 페이지네이션 조회 결과: {len(orders)}건 (페이지 {page}/{pagination_info['total_pages']})"
        )

        return orders, pagination_info

    except SQLAlchemyError as e:
        logger.error(f"페이지네이션 주문 목록 조회 중 DB 오류: {str(e)}", exc_info=True)
        # 오류 시 빈 목록과 기본 페이지네이션 정보 반환
        empty_pagination = {
            "totalCount": 0,
            "page": page,
            "pageSize": page_size,
            "totalPages": 0,
        }
        logger.info(f"페이지네이션 주문 목록 조회 실패: {str(e)}")
        return [], empty_pagination
    except Exception as e:
        logger.error(
            f"페이지네이션 주문 목록 조회 중 일반 오류: {str(e)}", exc_info=True
        )
        empty_pagination = {
            "totalCount": 0,
            "page": page,
            "pageSize": page_size,
            "totalPages": 0,
        }
        logger.info(f"페이지네이션 주문 목록 조회 실패: {str(e)}")
        return [], empty_pagination
