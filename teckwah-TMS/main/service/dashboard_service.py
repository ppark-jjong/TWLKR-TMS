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
import logging
from main.utils.lock import acquire_lock, release_lock, check_lock_status
from main.utils.pagination import paginate_query, calculate_dashboard_stats


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
    import logging, function_start, function_end

    function_start("get_dashboard_response_data", {"order_id": order.dashboard_id, "is_editable": is_editable})
    
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
            "city", "county", "district", "region", 
            "distance", "durationTime"
        ]
        
        for field in optional_fields:
            # 스네이크 케이스에서 카멜 케이스로 변환 (duration_time -> durationTime)
            if field == "durationTime":
                db_field = "duration_time"
            else:
                db_field = field
                
            value = getattr(order, db_field, None)
            if field in ["city", "county", "district", "region"] and (value is None or value == ""):
                response_data[field] = ""
            else:
                response_data[field] = value
                
        logger.debug(f"응답 데이터 생성 완료: {len(response_data)} 필드")
        function_end("get_dashboard_response_data", "성공")
        return response_data
        
    except Exception as e:
        logger.error(f"응답 데이터 생성 중 오류 발생: {str(e)}", exc_info=True)
        function_end("get_dashboard_response_data", f"실패: {str(e)}")
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


from main.utils.pagination import paginate_query, calculate_dashboard_stats


def get_dashboard_list(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    department: Optional[str] = None,
    warehouse: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
) -> Tuple[List[Dashboard], Dict[str, Any], Dict[str, int]]:
    """
    조건에 맞는 주문 목록 조회

    Args:
        db: 데이터베이스 세션
        start_date: 시작 날짜
        end_date: 종료 날짜
        status: 상태 필터
        department: 부서 필터
        warehouse: 창고 필터
        page: 페이지 번호
        page_size: 페이지 크기

    Returns:
        Tuple[List[Dashboard], Dict[str, Any], Dict[str, int]]:
            (주문 목록, 페이지네이션 정보, 통계 정보)
    """
    from main.utils.logger import function_start, function_end, db_query_start, db_query_result, condition_check

    # 함수 시작 로깅
    function_start("get_dashboard_list", {
        "start_date": start_date, 
        "end_date": end_date,
        "status": status,
        "department": department,
        "warehouse": warehouse,
        "page": page,
        "page_size": page_size
    })
    
    try:
        # 기본 쿼리 생성
        db_query_start("대시보드 기본 쿼리 생성")
        query = db.query(Dashboard)

        # 날짜 조건 적용 - start_date와 end_date가 모두 None이면 오늘 날짜로 설정
        condition_check("날짜 필터 없음", start_date is None and end_date is None)
        if start_date is None and end_date is None:
            today = datetime.now().date()
            start_date = today
            end_date = today
            logger.info(f"날짜 필터가 없어 오늘 날짜({today})로 설정")

        if start_date:
            # 시작 날짜의 00:00:00부터
            start_datetime = datetime.combine(start_date, datetime.min.time())
            query = query.filter(Dashboard.eta >= start_datetime)
            logger.info(f"시작 날짜 필터 적용: {start_datetime}")

        if end_date:
            # 종료 날짜의 23:59:59까지
            end_datetime = datetime.combine(end_date, datetime.max.time())
            query = query.filter(Dashboard.eta <= end_datetime)
            logger.info(f"종료 날짜 필터 적용: {end_datetime}")

        # 필터 조건 적용
        if status:
            condition_check("상태 필터", True)
            query = query.filter(Dashboard.status == status)
            logger.debug(f"상태 필터 적용: {status}")

        if department:
            condition_check("부서 필터", True)
            query = query.filter(Dashboard.department == department)
            logger.debug(f"부서 필터 적용: {department}")

        if warehouse:
            condition_check("창고 필터", True)
            query = query.filter(Dashboard.warehouse == warehouse)
            logger.debug(f"창고 필터 적용: {warehouse}")

        # 통계 계산 (필터가 적용된 상태에서)
        db_query_start("통계 계산")
        stats = calculate_dashboard_stats(query)
        db_query_result(f"통계 결과: 총 {stats['total']}건")

        # 정렬 적용
        query = query.order_by(desc(Dashboard.eta))
        logger.debug("정렬 조건 적용: eta 내림차순")

        # 페이지네이션 적용
        db_query_start(f"페이지네이션 (페이지 {page}, 크기 {page_size})")
        orders, pagination = paginate_query(query, page, page_size)
        db_query_result(f"페이지네이션 결과: {len(orders)}건 조회됨")

        # 로깅 - 결과 건수
        result_count = len(orders)
        logger.info(
            f"대시보드 조회 결과: {result_count}건 (페이지 {page}/{pagination['total_pages']})"
        )
        
        # 조회된 데이터의 필드 유효성 검증 로깅
        if result_count > 0:
            first_order = orders[0]
            fields = [field for field in dir(first_order) if not field.startswith('_') and not callable(getattr(first_order, field))]
            logger.debug(f"첫 번째 레코드 필드 확인: {', '.join(fields)}")
            
            # region 필드 유무 확인 및 로깅
            has_region = hasattr(first_order, 'region')
            logger.debug(f"region 필드 존재 여부: {has_region}")

        function_end("get_dashboard_list", f"성공: {result_count}건")
        return orders, pagination, stats

    except SQLAlchemyError as e:
        logger.error(f"주문 목록 조회 중 DB 오류 발생: {str(e)}", exc_info=True)
        # 오류 발생 시 빈 결과 반환
        empty_pagination = {
            "total": 0,
            "page_size": page_size,
            "current": 1,
            "total_pages": 1,
            "start": 0,
            "end": 0,
        }
        empty_stats = {
            "total": 0,
            "waiting": 0,
            "in_progress": 0,
            "complete": 0,
            "issue": 0,
            "cancel": 0,
        }
        function_end("get_dashboard_list", f"실패: {str(e)}")
        return [], empty_pagination, empty_stats
    except Exception as e:
        logger.error(f"주문 목록 조회 중 일반 오류 발생: {str(e)}", exc_info=True)
        empty_pagination = {
            "total": 0,
            "page_size": page_size,
            "current": 1,
            "total_pages": 1,
            "start": 0,
            "end": 0,
        }
        empty_stats = {
            "total": 0,
            "waiting": 0,
            "in_progress": 0,
            "complete": 0,
            "issue": 0,
            "cancel": 0,
        }
        function_end("get_dashboard_list", f"실패: {str(e)}")
        return [], empty_pagination, empty_stats


def search_dashboard_by_order_no(
    db: Session, order_no: str, page: int = 1, page_size: int = 10
) -> Tuple[List[Dashboard], Dict[str, Any], Dict[str, int]]:
    """
    주문번호로 주문 검색

    Args:
        db: 데이터베이스 세션
        order_no: 검색할 주문번호
        page: 페이지 번호
        page_size: 페이지 크기

    Returns:
        Tuple[List[Dashboard], Dict[str, Any], Dict[str, int]]:
            (주문 목록, 페이지네이션 정보, 통계 정보)
    """
    try:
        # 기본 쿼리 생성 - 안전한 매개변수화 사용
        # SQL 인젝션 방지를 위해 파라미터 이스케이프
        search_pattern = f"%{order_no}%"
        query = db.query(Dashboard).filter(Dashboard.order_no.like(search_pattern))

        # 통계 계산
        stats = calculate_dashboard_stats(query)

        # 정렬 적용
        query = query.order_by(desc(Dashboard.eta))

        # 페이지네이션 적용
        orders, pagination = paginate_query(query, page, page_size)

        # 로깅 - 검색 결과
        logger.info(f"주문번호 검색 결과: {order_no}, 검색결과: {len(orders)}건")

        return orders, pagination, stats

    except SQLAlchemyError as e:
        logger.error(f"주문번호 검색 중 오류 발생: {str(e)}")
        # 오류 발생 시 빈 결과 반환
        empty_pagination = {
            "total": 0,
            "page_size": page_size,
            "current": 1,
            "total_pages": 1,
            "start": 0,
            "end": 0,
        }
        empty_stats = {
            "total": 0,
            "waiting": 0,
            "in_progress": 0,
            "complete": 0,
            "issue": 0,
            "cancel": 0,
        }
        return [], empty_pagination, empty_stats


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
    주문 업데이트

    행 단위 락 확인 후 업데이트 수행

    Args:
        db: 데이터베이스 세션
        dashboard_id: 업데이트할 주문 ID
        data: 업데이트할 주문 정보
        user_id: 업데이트 사용자 ID

    Returns:
        Dashboard: 업데이트된 주문 정보
    """
    # 락 획득 시도
    lock_success, lock_info = acquire_lock(db, "dashboard", dashboard_id, user_id)

    if not lock_success:
        logger.warning(
            f"주문 업데이트 실패 (락 획득 불가): ID {dashboard_id}, 사용자 {user_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="현재 다른 사용자가 이 주문을 편집 중입니다.",
        )

    try:
        # 주문 조회
        order = (
            db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
        )

        if not order:
            logger.error(f"주문 업데이트 실패 (주문 없음): ID {dashboard_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="해당 주문을 찾을 수 없습니다.",
            )

        # 우편번호 변경 시 유효성 검증
        if data.postal_code:
            postal_code = data.postal_code
            # 5자리 아닐 경우 오류 발생
            if len(postal_code) != 5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="우편번호는 5자리여야 합니다.",
                )

            # 우편번호 존재 확인
            postal_exists = (
                db.query(PostalCode)
                .filter(PostalCode.postal_code == postal_code)
                .first()
            )
            if not postal_exists:
                # 존재하지 않는 우편번호인 경우 기본 데이터 생성
                new_postal = PostalCode(
                    postal_code=postal_code, city=None, county=None, district=None
                )
                db.add(new_postal)
                db.flush()

            # 우편번호 업데이트
            order.postal_code = postal_code

        # 필드 업데이트
        if data.order_no is not None:
            order.order_no = data.order_no
        if data.type is not None:
            order.type = data.type
        if data.department is not None:
            order.department = data.department
        if data.warehouse is not None:
            order.warehouse = data.warehouse
        if data.sla is not None:
            order.sla = data.sla
        if data.eta is not None:
            order.eta = data.eta
        if data.address is not None:
            order.address = data.address
        if data.customer is not None:
            order.customer = data.customer
        if data.contact is not None:
            order.contact = data.contact
        if data.driver_name is not None:
            order.driver_name = data.driver_name
        if data.driver_contact is not None:
            order.driver_contact = data.driver_contact
        if data.remark is not None:
            order.remark = data.remark

        # 업데이트 정보 갱신
        order.update_by = user_id
        order.update_at = datetime.now()

        db.flush()
        db.commit()

        logger.info(f"주문 업데이트 성공: ID {dashboard_id}, 사용자 {user_id}")
        return order

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"주문 업데이트 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터베이스 오류가 발생했습니다.",
        )
    finally:
        # 락 해제 (성공하든 실패하든 항상 실행)
        try:
            release_lock(db, "dashboard", dashboard_id, user_id)
            logger.debug(f"주문 락 해제 완료: ID {dashboard_id}, 사용자 {user_id}")
        except Exception as e:
            logger.error(
                f"주문 락 해제 실패: ID {dashboard_id}, 사용자 {user_id}, 오류: {str(e)}"
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
