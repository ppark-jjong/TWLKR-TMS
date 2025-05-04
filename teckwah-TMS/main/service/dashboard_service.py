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

# 전역 변수로 status_labels, type_labels 정의 (get_dashboard_response_data 와 공유)
status_labels = {
    "WAITING": "대기",
    "IN_PROGRESS": "진행",
    "COMPLETE": "완료",
    "ISSUE": "이슈",
    "CANCEL": "취소",
}
type_labels = {"DELIVERY": "배송", "RETURN": "회수"}


def get_dashboard_by_id(db: Session, dashboard_id: int) -> Optional[Dashboard]:
    """ID로 주문 조회"""
    try:
        return (
            db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
        )
    except SQLAlchemyError as e:
        logger.error(
            f"주문 조회 중 오류 발생 (ID: {dashboard_id}): {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터베이스 오류가 발생했습니다.",
        )


def get_dashboard_response_data(
    order: Dashboard, is_editable: bool = False
) -> Dict[str, Any]:
    """주문 상세 정보를 위한 딕셔너리 변환 (snake_case 유지)"""
    try:
        return {
            "dashboard_id": order.dashboard_id,
            "order_no": order.order_no,
            "type": order.type,
            "status": order.status,
            "department": order.department,
            "warehouse": order.warehouse,
            "sla": order.sla,
            "eta": order.eta,
            "create_time": order.create_time,
            "depart_time": order.depart_time,
            "complete_time": order.complete_time,
            "postal_code": order.postal_code,
            "address": order.address,
            "customer": order.customer,
            "contact": order.contact,
            "driver_name": order.driver_name,
            "driver_contact": order.driver_contact,
            "update_by": order.update_by,
            "remark": order.remark,
            "update_at": order.update_at,
            "is_locked": order.is_locked,
            "city": order.city,
            "county": order.county,
            "district": order.district,
            "region": order.region,  # DB에서 생성된 값
            "distance": order.distance,
            "duration_time": order.duration_time,
            "status_label": status_labels.get(order.status, order.status),
            "type_label": type_labels.get(order.type, order.type),
            "editable": is_editable,
        }
    except AttributeError as e:
        logger.error(
            f"주문 데이터 변환 중 속성 오류 (ID: {getattr(order, 'dashboard_id', 'N/A')}): {e}",
            exc_info=True,
        )
        # 오류 시 일부 필수 정보만 반환하거나 예외 발생 고려
        return {"dashboard_id": getattr(order, "dashboard_id", "오류"), "error": str(e)}


def get_dashboard_list_item_data(order: Dashboard) -> Dict[str, Any]:
    """주문 목록 아이템을 위한 딕셔너리 변환 (snake_case 유지)"""
    try:
        # region 생성 로직 추가 (DB 생성 값이 None인 경우)
        region_value = order.region
        if region_value is None:
            # city, county, district가 모두 있는 경우 수동으로 생성
            if order.city and order.county and order.district:
                region_value = f"{order.city} {order.county} {order.district}".strip()
            elif order.city:  # 최소한 도시라도 있으면 표시
                region_value = order.city

        return {
            "dashboard_id": order.dashboard_id,
            "order_no": order.order_no,
            "type": order.type,
            "department": order.department,
            "warehouse": order.warehouse,
            "sla": order.sla,
            "region": region_value,  # 수정된 region 값 사용
            "eta": order.eta,
            "customer": order.customer,
            "status": order.status,
            "driver_name": order.driver_name,
            "status_label": status_labels.get(order.status, order.status),
            "type_label": type_labels.get(order.type, order.type),
        }
    except AttributeError as e:
        logger.error(
            f"주문 목록 데이터 변환 중 속성 오류 (ID: {getattr(order, 'dashboard_id', 'N/A')}): {e}",
            exc_info=True,
        )
        return {"dashboard_id": getattr(order, "dashboard_id", "오류"), "error": str(e)}


def get_dashboard_by_order_no(db: Session, order_no: str) -> Optional[Dashboard]:
    """주문번호로 주문 조회"""
    try:
        return db.query(Dashboard).filter(Dashboard.order_no == order_no).first()
    except SQLAlchemyError as e:
        logger.error(
            f"주문번호로 조회 중 오류 발생 ({order_no}): {str(e)}", exc_info=True
        )
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
    try:
        query = db.query(Dashboard)
        if start_date:
            start_datetime = datetime.combine(start_date, datetime.min.time())
            query = query.filter(Dashboard.eta >= start_datetime)
        if end_date:
            end_datetime = datetime.combine(end_date, datetime.max.time())
            query = query.filter(Dashboard.eta <= end_datetime)
        return query.order_by(desc(Dashboard.eta)).all()
    except SQLAlchemyError as e:
        logger.error(f"주문 목록 조회 중 DB 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터베이스 오류가 발생했습니다.",
        )


def search_dashboard_by_order_no(db: Session, order_no: str) -> Optional[Dashboard]:
    """주문번호로 정확히 일치하는 단일 주문 검색"""
    # get_dashboard_by_order_no 와 동일하므로 하나로 통일 가능 (여기서는 유지)
    return get_dashboard_by_order_no(db, order_no)


def _ensure_postal_code_exists(db: Session, postal_code: str):
    """PostalCode 테이블에 해당 우편번호가 없으면 생성"""
    postal_exists = (
        db.query(PostalCode).filter(PostalCode.postal_code == postal_code).first()
    )
    if not postal_exists:
        try:
            new_postal = PostalCode(
                postal_code=postal_code, city=None, county=None, district=None
            )
            db.add(new_postal)
            db.flush()  # ID 등 필요 시
            logger.info(f"존재하지 않는 우편번호 {postal_code} 레코드 생성")
        except SQLAlchemyError as e:
            db.rollback()  # 생성 실패 시 롤백
            logger.warning(f"우편번호 {postal_code} 레코드 생성 실패: {str(e)}")
            # 주문 생성/수정은 계속 진행될 수 있으나, 관련 정보는 누락될 수 있음


def create_dashboard(db: Session, data: DashboardCreate, user_id: str) -> Dashboard:
    """주문 생성"""
    postal_code = data.postal_code  # 검증은 스키마에서 완료
    _ensure_postal_code_exists(db, postal_code)

    # region은 DB에서 생성되므로 모델 데이터에서 제외
    order_data = data.model_dump(exclude={"region"})
    order_data.update(
        {
            "status": "WAITING",
            "create_time": datetime.now(),
            "update_by": user_id,
            "update_at": datetime.now(),
            "is_locked": False,
            # 모델에 없는 필드는 제외됨 (예: DashboardCreate에만 있는 필드)
        }
    )

    try:
        order = Dashboard(**order_data)
        db.add(order)
        db.flush()  # ID 등 생성 값 확인
        logger.info(f"주문 생성 완료: ID {order.dashboard_id}")
        return order
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"주문 생성 DB 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="주문 생성 중 데이터베이스 오류가 발생했습니다.",
        )


def update_dashboard(
    db: Session, dashboard_id: int, data: Dict[str, Any], user_id: str
) -> Dashboard:
    """주문 업데이트 및 락 관리, 상태 변경 시 시간 자동 업데이트"""
    # update_field API 에서 호출 시 data는 {"status": "NEW_STATUS"} 형태일 수 있음
    # update_order_action API 에서 호출 시 data는 DashboardUpdate 모델의 dict 형태

    lock_held = False
    try:
        # 락 획득 (update_dashboard 진입 전에 acquire_lock 호출 안함, 서비스 내에서 관리)
        lock_success, lock_info = acquire_lock(db, "dashboard", dashboard_id, user_id)
        if not lock_success:
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=lock_info.get("message", "현재 다른 사용자가 편집 중입니다."),
            )
        lock_held = True

        order = (
            db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
        )
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="수정할 주문을 찾을 수 없습니다.",
            )

        # update_data 준비 (스키마 사용 안하고 dict 직접 처리)
        update_fields = data.copy()  # 원본 data 수정 방지

        # region 필드는 DB에서 자동 생성되므로 제거
        if "region" in update_fields:
            del update_fields["region"]

        if not update_fields:
            logger.info(f"주문 업데이트 내용 없음: ID {dashboard_id}")
            # 변경 내용 없어도 update_by, update_at 갱신 및 락 해제는 필요할 수 있음
            # 여기서는 일단 그대로 반환 (락 해제는 finally에서 처리)
            return order

        # 상태 변경 시 시간 업데이트 로직
        if "status" in update_fields and order.status != update_fields["status"]:
            old_status = order.status
            new_status = update_fields["status"]
            now = datetime.now()

            # 1. WAITING -> IN_PROGRESS
            if (
                old_status == "WAITING"
                and new_status == "IN_PROGRESS"
                and order.depart_time is None
            ):
                order.depart_time = now
                logger.info(
                    f"주문 ID {dashboard_id}: 상태 변경(IN_PROGRESS), depart_time 설정: {now}"
                )

            # 2. IN_PROGRESS -> COMPLETE/ISSUE/CANCEL
            elif (
                old_status == "IN_PROGRESS"
                and new_status in ["COMPLETE", "ISSUE", "CANCEL"]
                and order.complete_time is None
            ):
                order.complete_time = now
                logger.info(
                    f"주문 ID {dashboard_id}: 상태 변경({new_status}), complete_time 설정: {now}"
                )

            # 3. 롤백: COMPLETE/ISSUE/CANCEL -> IN_PROGRESS/WAITING
            elif old_status in ["COMPLETE", "ISSUE", "CANCEL"] and new_status in [
                "IN_PROGRESS",
                "WAITING",
            ]:
                if order.complete_time is not None:
                    order.complete_time = None
                    logger.info(
                        f"주문 ID {dashboard_id}: 상태 롤백({new_status}), complete_time 초기화"
                    )
                # 추가: IN_PROGRESS로 롤백 시 depart_time은 유지되어야 함
                # WAITNG으로 롤백 시 depart_time도 초기화 (아래 4번 조건에서 처리)

            # 4. 롤백: IN_PROGRESS -> WAITING
            elif old_status == "IN_PROGRESS" and new_status == "WAITING":
                if order.depart_time is not None:
                    order.depart_time = None
                    logger.info(
                        f"주문 ID {dashboard_id}: 상태 롤백(WAITING), depart_time 초기화"
                    )

        # 우편번호 변경 시 처리
        if (
            "postal_code" in update_fields
            and order.postal_code != update_fields["postal_code"]
        ):
            _ensure_postal_code_exists(db, update_fields["postal_code"])

        # 필드 업데이트 적용
        for key, value in update_fields.items():
            setattr(order, key, value)

        # 공통 업데이트 정보 설정
        order.update_by = user_id
        order.update_at = datetime.now()

        logger.info(
            f"주문 정보 업데이트 준비: ID={dashboard_id}, 변경 필드={list(update_fields.keys())}"
        )

        db.add(order)  # 세션에 변경사항 추가
        db.flush()  # DB에 반영 (아직 커밋 아님)
        logger.info(f"주문 업데이트 DB 반영 완료 (커밋 전): ID {dashboard_id}")
        return order

    except HTTPException as http_exc:
        # 락 획득 실패 또는 유효성 검사 오류 등은 여기서 처리
        # db.rollback() # 트랜잭션 데코레이터가 처리
        raise http_exc
    except SQLAlchemyError as e:
        # db.rollback() # 트랜잭션 데코레이터가 처리
        logger.error(f"주문 업데이트 DB 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="주문 업데이트 중 데이터베이스 오류 발생",
        )
    except Exception as e:
        # 예상치 못한 오류
        # db.rollback() # 트랜잭션 데코레이터가 처리
        logger.error(f"주문 업데이트 중 예외 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="주문 업데이트 처리 중 오류 발생",
        )
    finally:
        # 락을 획득했다면 반드시 해제
        if lock_held:
            try:
                # release_lock은 내부적으로 commit/rollback을 수행할 수 있으므로 주의
                # 여기서는 트랜잭션 관리와 분리하여 락 해제만 시도
                release_success, _ = release_lock(
                    db, "dashboard", dashboard_id, user_id
                )
                if release_success:
                    logger.info(f"주문 락 해제 성공 (finally): ID {dashboard_id}")
                else:
                    logger.warning(f"주문 락 해제 실패 (finally): ID {dashboard_id}")
            except Exception as lock_release_err:
                logger.error(
                    f"주문 락 해제 실패 (finally): ID {dashboard_id}, 오류: {lock_release_err}"
                )


def change_status(
    db: Session, dashboard_ids: List[int], new_status: str, user_id: str, user_role: str
) -> List[Dict[str, Any]]:
    """주문 상태 변경"""
    results = []
    status_order = {
        "WAITING": 0,
        "IN_PROGRESS": 1,
        "COMPLETE": 2,
        "ISSUE": 3,
        "CANCEL": 4,
    }

    for dashboard_id in dashboard_ids:
        lock_acquired = False
        try:
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

            if order.status == new_status:
                results.append(
                    {
                        "id": dashboard_id,
                        "success": True,
                        "message": "이미 해당 상태입니다.",
                    }
                )
                continue

            old_status = order.status
            is_rollback = status_order.get(new_status, -1) < status_order.get(
                old_status, -1
            )

            # 권한 검사
            if user_role != "ADMIN":
                valid_transitions = {
                    "WAITING": ["IN_PROGRESS"],
                    "IN_PROGRESS": ["COMPLETE", "ISSUE", "CANCEL"],
                }
                allowed_new_statuses = valid_transitions.get(old_status, [])
                if new_status not in allowed_new_statuses:
                    results.append(
                        {
                            "id": dashboard_id,
                            "success": False,
                            "message": f"{status_labels.get(old_status)} 상태에서 {status_labels.get(new_status)} 상태로 변경할 수 없습니다.",
                        }
                    )
                    continue
                if is_rollback:
                    results.append(
                        {
                            "id": dashboard_id,
                            "success": False,
                            "message": "롤백은 관리자만 가능합니다.",
                        }
                    )
                    continue

            # 락 획득
            lock_success, lock_info = acquire_lock(
                db, "dashboard", dashboard_id, user_id
            )
            if not lock_success:
                results.append(
                    {
                        "id": dashboard_id,
                        "success": False,
                        "message": lock_info.get("message", "다른 사용자가 편집 중"),
                    }
                )
                continue
            lock_acquired = True

            # 상태 변경 및 시간 기록
            order.status = new_status
            now = datetime.now()
            if old_status == "WAITING" and new_status == "IN_PROGRESS":
                order.depart_time = now
            elif old_status == "IN_PROGRESS" and new_status in [
                "COMPLETE",
                "ISSUE",
                "CANCEL",
            ]:
                order.complete_time = now
            elif is_rollback and user_role == "ADMIN":
                if old_status in ["COMPLETE", "ISSUE", "CANCEL"]:
                    order.complete_time = None
                if old_status == "IN_PROGRESS" and new_status == "WAITING":
                    order.depart_time = None

            order.update_by = user_id
            order.update_at = now
            order.is_locked = False  # 상태 변경 시 락 해제

            db.flush()
            results.append(
                {
                    "id": dashboard_id,
                    "success": True,
                    "message": f"상태 변경: {status_labels.get(old_status)} → {status_labels.get(new_status)}",
                    "rollback": is_rollback,
                    "old_status": old_status,
                    "new_status": new_status,
                }
            )

        except SQLAlchemyError as e:
            db.rollback()
            logger.error(
                f"주문 상태 변경 중 DB 오류: ID {dashboard_id}, {str(e)}", exc_info=True
            )
            results.append(
                {"id": dashboard_id, "success": False, "message": "데이터베이스 오류"}
            )
        finally:
            if lock_acquired:
                try:
                    release_lock(db, "dashboard", dashboard_id, user_id)
                except Exception as lock_release_err:
                    logger.error(
                        f"상태 변경 락 해제 실패: ID {dashboard_id}, 오류: {lock_release_err}"
                    )

    # 모든 변경 사항 커밋 (라우터 레벨에서 처리하는 것이 더 안전할 수 있음)
    # db.commit()
    return results


def assign_driver(
    db: Session,
    dashboard_ids: List[int],
    driver_name: str,
    driver_contact: Optional[str],
    user_id: str,
) -> List[Dict[str, Any]]:
    """주문에 기사 배정"""
    results = []
    for dashboard_id in dashboard_ids:
        lock_acquired = False
        try:
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

            lock_success, lock_info = acquire_lock(
                db, "dashboard", dashboard_id, user_id
            )
            if not lock_success:
                results.append(
                    {
                        "id": dashboard_id,
                        "success": False,
                        "message": lock_info.get("message", "다른 사용자가 편집 중"),
                    }
                )
                continue
            lock_acquired = True

            order.driver_name = driver_name
            order.driver_contact = driver_contact
            order.update_by = user_id
            order.update_at = datetime.now()
            order.is_locked = False  # 기사 배정 시 락 해제

            db.flush()
            results.append(
                {
                    "id": dashboard_id,
                    "success": True,
                    "message": f"기사 배정 완료: {driver_name}",
                }
            )

        except SQLAlchemyError as e:
            db.rollback()
            logger.error(
                f"기사 배정 중 DB 오류: ID {dashboard_id}, {str(e)}", exc_info=True
            )
            results.append(
                {"id": dashboard_id, "success": False, "message": "데이터베이스 오류"}
            )
        finally:
            if lock_acquired:
                try:
                    release_lock(db, "dashboard", dashboard_id, user_id)
                except Exception as lock_release_err:
                    logger.error(
                        f"기사 배정 락 해제 실패: ID {dashboard_id}, 오류: {lock_release_err}"
                    )

    # db.commit()
    return results


def delete_dashboard(
    db: Session, dashboard_ids: List[int], user_id: str, user_role: str
) -> List[Dict[str, Any]]:
    """주문 삭제 (ADMIN 전용)"""
    results = []
    if user_role != "ADMIN":
        logger.warning(f"주문 삭제 권한 없음: 사용자 {user_id}")
        # 단일 결과만 반환하거나, 각 ID별 실패 메시지 반환 고려
        return [{"success": False, "message": "삭제 권한이 없습니다."}]

    for dashboard_id in dashboard_ids:
        lock_acquired = False
        try:
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

            lock_success, lock_info = acquire_lock(
                db, "dashboard", dashboard_id, user_id
            )
            if not lock_success:
                results.append(
                    {
                        "id": dashboard_id,
                        "success": False,
                        "message": lock_info.get("message", "다른 사용자가 편집 중"),
                    }
                )
                continue
            lock_acquired = True

            order_no = order.order_no  # 삭제 전 정보 저장
            db.delete(order)
            db.flush()
            results.append(
                {
                    "id": dashboard_id,
                    "success": True,
                    "message": f"주문 삭제 완료: {order_no}",
                }
            )

        except SQLAlchemyError as e:
            db.rollback()
            logger.error(
                f"주문 삭제 중 DB 오류: ID {dashboard_id}, {str(e)}", exc_info=True
            )
            results.append(
                {"id": dashboard_id, "success": False, "message": "데이터베이스 오류"}
            )
        finally:
            if lock_acquired:
                try:
                    release_lock(db, "dashboard", dashboard_id, user_id)
                except Exception as lock_release_err:
                    logger.error(
                        f"삭제 락 해제 실패: ID {dashboard_id}, 오류: {lock_release_err}"
                    )

    # db.commit()
    return results


def get_lock_status(db: Session, dashboard_id: int, user_id: str) -> Dict[str, Any]:
    """주문 락 상태 확인"""
    return check_lock_status(db, "dashboard", dashboard_id, user_id)


def get_dashboard_list_paginated(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = 1,
    page_size: int = 30,
) -> Tuple[List[Dashboard], Dict[str, Any]]:
    """조건에 맞는 주문 목록 조회 (페이지네이션 적용)"""
    try:
        query = db.query(Dashboard)
        if start_date:
            start_datetime = datetime.combine(start_date, datetime.min.time())
            query = query.filter(Dashboard.eta >= start_datetime)
        if end_date:
            end_datetime = datetime.combine(end_date, datetime.max.time())
            query = query.filter(Dashboard.eta <= end_datetime)

        query = query.order_by(desc(Dashboard.eta))
        orders, pagination_info = paginate_query(query, page, page_size)
        return orders, pagination_info

    except SQLAlchemyError as e:
        logger.error(f"페이지네이션 주문 목록 조회 중 DB 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="주문 목록 조회 중 데이터베이스 오류가 발생했습니다.",
        )
    except Exception as e:
        logger.error(
            f"페이지네이션 주문 목록 조회 중 일반 오류: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="주문 목록 조회 중 오류가 발생했습니다.",
        )
