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
    """
    ID로 주문 조회

    Args:
        db: 데이터베이스 세션
        dashboard_id: 조회할 주문 ID

    Returns:
        Optional[Dashboard]: 조회된 주문 정보
    """
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
    """
    주문 정보를 응답 형식으로 변환

    Args:
        order: 주문 모델 인스턴스
        is_editable: 편집 가능 여부

    Returns:
        Dict[str, Any]: 응답 형식으로 변환된 주문 데이터
    """
    logger.info(
        f"get_dashboard_response_data 시작: order_id={order.dashboard_id}, editable={is_editable}"
    )

    # 상태 및 유형 라벨 정의
    status_labels = {
        "WAITING": "대기",
        "IN_PROGRESS": "진행",
        "COMPLETE": "완료",
        "ISSUE": "이슈",
        "CANCEL": "취소",
    }
    type_labels = {"DELIVERY": "배송", "RETURN": "회수"}

    # 안전하게 속성 추출
    try:
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
            if field == "durationTime":
                db_field = "duration_time"
            else:
                db_field = field

            value = getattr(order, db_field, None)
            if field in ["city", "county", "district", "region"] and (
                value is None or value == ""
            ):
                response_data[field] = ""
            else:
                response_data[field] = value

        logger.debug(f"응답 데이터 생성 완료: {len(response_data)} 필드")
        return response_data

    except Exception as e:
        logger.error(f"응답 데이터 생성 중 오류 발생: {str(e)}", exc_info=True)
        # 최소한의 필수 필드를 포함한 기본 응답 반환
        return {
            "dashboardId": order.dashboard_id,
            "orderNo": order.order_no,
            "type": order.type,
            "status": order.status,
            "department": order.department,
            "warehouse": order.warehouse,
            "region": "",  # 문제가 된 필드에 빈 문자열 기본값 설정
            "statusLabel": status_labels.get(order.status, order.status),
            "typeLabel": type_labels.get(order.type, order.type),
            "editable": is_editable,
        }


def get_dashboard_by_order_no(db: Session, order_no: str) -> Optional[Dashboard]:
    """
    주문번호로 주문 조회

    Args:
        db: 데이터베이스 세션
        order_no: 조회할 주문번호

    Returns:
        Optional[Dashboard]: 조회된 주문 정보
    """
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
    """
    조건에 맞는 주문 목록 조회 (페이지네이션 없음)

    Args:
        db: 데이터베이스 세션
        start_date: 시작 날짜 (필수 또는 기본값 처리됨)
        end_date: 종료 날짜 (필수 또는 기본값 처리됨)

    Returns:
        List[Dashboard]: 조회된 전체 주문 목록
    """
    logger.info(
        f"get_dashboard_list (no pagination) 시작: start={start_date}, end={end_date}"
    )
    try:
        # 기본 쿼리 생성
        logger.debug("대시보드 기본 쿼리 생성")
        query = db.query(Dashboard)

        # 날짜 조건 적용 (라우터에서 None 체크 및 기본값 처리를 하므로 여기서는 None이 아님을 가정)
        if start_date:
            start_datetime = datetime.combine(start_date, datetime.min.time())
            query = query.filter(Dashboard.eta >= start_datetime)
            logger.info(f"시작 날짜 필터 적용: {start_datetime}")

        if end_date:
            end_datetime = datetime.combine(end_date, datetime.max.time())
            query = query.filter(Dashboard.eta <= end_datetime)
            logger.info(f"종료 날짜 필터 적용: {end_datetime}")

        # 정렬 적용 (필수)
        query = query.order_by(desc(Dashboard.eta))
        logger.debug("정렬 조건 적용: eta 내림차순")

        # 전체 데이터 조회 (페이지네이션 없이)
        logger.debug(f"전체 데이터 조회 ({start_date} ~ {end_date}) 시작")
        all_orders = query.all()
        logger.info(f"조회 결과: {len(all_orders)}건")

        # 로깅 - 결과 건수
        result_count = len(all_orders)
        logger.info(f"대시보드 전체 조회 결과: {result_count}건")

        return all_orders  # 주문 목록만 반환

    except SQLAlchemyError as e:
        logger.error(f"주문 목록 조회 중 DB 오류 발생: {str(e)}", exc_info=True)
        # DB 오류 시 빈 리스트 반환 또는 예외 발생 선택
        # 여기서는 빈 리스트 반환
        return []
    except Exception as e:
        logger.error(f"주문 목록 조회 중 일반 오류 발생: {str(e)}", exc_info=True)
        # 일반 오류 시 빈 리스트 반환
        return []


def search_dashboard_by_order_no(db: Session, order_no: str) -> Optional[Dashboard]:
    """
    주문번호로 정확히 일치하는 단일 주문 검색 (페이지네이션 없음)

    Args:
        db: 데이터베이스 세션
        order_no: 검색할 정확한 주문번호

    Returns:
        Optional[Dashboard]: 검색된 단일 주문 객체 또는 None
    """
    logger.info(f"search_dashboard_by_order_no (single) 시작: order_no={order_no}")
    try:
        # 정확히 일치하는 단일 레코드 검색
        logger.debug(f"정확한 주문번호 검색 시작: '{order_no}'")
        order = db.query(Dashboard).filter(Dashboard.order_no == order_no).first()
        logger.debug("단일 검색 완료")

        if order:
            logger.info(f"주문번호 검색 성공: '{order_no}'")
            return order
        else:
            logger.info(f"주문번호 검색 결과 없음: '{order_no}'")
            return None

    except SQLAlchemyError as e:
        logger.error(f"주문번호 검색 중 DB 오류 발생: {str(e)}", exc_info=True)
        return None
    except Exception as e:
        logger.error(f"주문번호 검색 중 일반 오류 발생: {str(e)}", exc_info=True)
        return None


def create_dashboard(db: Session, data: DashboardCreate, user_id: str) -> Dashboard:
    """
    주문 생성

    Args:
        db: 데이터베이스 세션
        data: 생성할 주문 정보
        user_id: 생성 사용자 ID

    Returns:
        Dashboard: 생성된 주문 정보
    """
    try:
        # 우편번호 4자리인 경우 앞에 '0' 추가
        postal_code = data.postal_code
        if len(postal_code) == 4:
            postal_code = "0" + postal_code

        # 우편번호 존재 확인
        postal_exists = (
            db.query(PostalCode).filter(PostalCode.postal_code == postal_code).first()
        )
        if not postal_exists:
            # 존재하지 않는 우편번호인 경우 기본 데이터 생성
            new_postal = PostalCode(
                postal_code=postal_code, city=None, county=None, district=None
            )
            db.add(new_postal)
            db.flush()

        # 주문 모델 생성
        order = Dashboard(
            order_no=data.order_no,
            type=data.type,
            status="WAITING",  # 초기 상태는 대기
            department=data.department,
            warehouse=data.warehouse,
            sla=data.sla,
            eta=data.eta,
            create_time=datetime.now(),
            postal_code=postal_code,
            address=data.address,
            customer=data.customer,
            contact=data.contact if hasattr(data, "contact") else None,
            driver_name=None,  # 초기 생성 시 기사 정보는 비워둠
            driver_contact=None,  # 초기 생성 시 기사 정보는 비워둠
            update_by=user_id,
            update_at=datetime.now(),
            remark=data.remark,
            is_locked=False,
        )

        db.add(order)
        db.flush()

        logger.info(
            f"주문 생성 성공: 주문번호 {data.order_no}, ID {order.dashboard_id}"
        )
        return order

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"주문 생성 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터베이스 오류가 발생했습니다.",
        )


def update_dashboard(
    db: Session, dashboard_id: int, data: DashboardUpdate, user_id: str
) -> Dashboard:
    """
    주문 업데이트 (DashboardUpdate 스키마 사용)
    행 단위 락 확인 후 업데이트 수행

    Args:
        db: 데이터베이스 세션
        dashboard_id: 업데이트할 주문 ID
        data: 업데이트할 주문 정보 (DashboardUpdate 스키마, Optional 필드)
        user_id: 업데이트 사용자 ID

    Returns:
        Dashboard: 업데이트된 주문 정보
    """
    logger.info(f"주문 업데이트 시도: id={dashboard_id}, user={user_id}")
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
            release_lock(db, "dashboard", dashboard_id, user_id)  # 락 해제
            logger.warning(f"주문 업데이트 실패 (주문 없음): ID {dashboard_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="수정할 주문을 찾을 수 없습니다.",
            )

        # 변경된 데이터만 업데이트
        update_data = data.model_dump(
            exclude_unset=True
        )  # Pydantic v2+ / data.dict(exclude_unset=True) for v1
        logger.debug(f"업데이트할 데이터: {update_data}")

        postal_code_updated = False
        if "postal_code" in update_data:
            postal_code = update_data["postal_code"]
            # 우편번호 유효성 검증 (스키마에서 이미 처리되었을 수 있음, 중복 가능성)
            if postal_code and len(postal_code) != 5:
                # 4자리 보완은 스키마에서 처리 가정, 여기서는 5자리 아니면 오류
                release_lock(db, "dashboard", dashboard_id, user_id)
                logger.warning(f"잘못된 우편번호 형식: {postal_code}")
                raise HTTPException(
                    status_code=400, detail="우편번호는 5자리여야 합니다."
                )

            # 우편번호 테이블 확인/추가 (postal_code가 실제로 변경될 때만)
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
                    # flush는 commit 전에 DB 반영 시도, 여기서는 commit으로 충분
                postal_code_updated = True  # 우편번호 업데이트 플래그

        # 모델 필드 업데이트 (update_data 딕셔너리 활용)
        for key, value in update_data.items():
            # postal_code는 위에서 별도 처리했으므로 건너뛰거나 다시 덮어씀
            if key == "postal_code" and not postal_code_updated:
                continue
            if hasattr(order, key):
                setattr(order, key, value)
            else:
                # 스키마에는 있지만 모델에는 없는 필드 처리 (예: alias)
                # 혹은 모델 필드명과 스키마 필드명이 다른 경우 처리
                # 이 예제에서는 모델과 스키마 필드명이 대부분 일치한다고 가정
                logger.warning(f"모델에 없는 필드 업데이트 시도 무시: {key}")
                pass

        # 업데이트 정보 갱신 (변경사항이 있을 때만)
        if update_data:  # 업데이트할 내용이 있을 때만
            order.update_by = user_id
            order.update_at = datetime.now()
            logger.info(
                f"주문 정보 업데이트: ID={dashboard_id}, 변경 필드={list(update_data.keys())}"
            )
        else:
            logger.info(f"주문 정보 변경 없음: ID={dashboard_id}")

        # db.flush() # 변경사항 즉시 반영 필요시 사용
        db.commit()
        db.refresh(order)  # 업데이트된 객체 리프레시

        logger.info(f"주문 업데이트 성공: ID {dashboard_id}")
        return order

    except HTTPException as http_exc:
        db.rollback()  # 명시적 롤백
        logger.warning(
            f"주문 업데이트 실패 (HTTPException): id={dashboard_id}, status={http_exc.status_code}"
        )
        raise http_exc
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"주문 업데이트 중 DB 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터베이스 오류 발생",
        )
    except Exception as e:
        db.rollback()
        logger.error(f"주문 업데이트 중 예상치 못한 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="주문 업데이트 중 오류 발생")
    finally:
        # 락 해제 (성공/실패 무관)
        try:
            release_lock(db, "dashboard", dashboard_id, user_id)
            logger.debug(f"주문 락 해제 완료: ID {dashboard_id}")
        except Exception as e:
            logger.error(
                f"주문 락 해제 실패: ID {dashboard_id}, 오류: {str(e)}", exc_info=True
            )


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

            # 대기 → 진행 시 depart_time 기록
            if old_status == "WAITING" and new_status == "IN_PROGRESS":
                order.depart_time = datetime.now()
                logger.info(
                    f"주문 ID {dashboard_id}: 대기→진행 상태 변경, 출발 시간 기록: {order.depart_time}"
                )

            # 진행 → 완료/이슈/취소 시 complete_time 기록
            if old_status == "IN_PROGRESS" and new_status in [
                "COMPLETE",
                "ISSUE",
                "CANCEL",
            ]:
                order.complete_time = datetime.now()
                logger.info(
                    f"주문 ID {dashboard_id}: 진행→{new_status} 상태 변경, 완료 시간 기록: {order.complete_time}"
                )

            # 롤백 시 알림을 위한 플래그
            is_rollback = False

            # 관리자 권한으로 상태 롤백 시 알림 처리
            if user_role == "ADMIN":
                status_order = ["WAITING", "IN_PROGRESS", "COMPLETE", "ISSUE", "CANCEL"]
                old_idx = status_order.index(old_status)
                new_idx = status_order.index(new_status)

                if new_idx < old_idx:
                    is_rollback = True

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
