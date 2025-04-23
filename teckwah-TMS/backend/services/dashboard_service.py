"""
대시보드(주문) 관련 서비스
"""

from typing import Dict, List, Optional, Tuple, Any, Union
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, and_, or_, text
from datetime import datetime, timedelta

from backend.models.dashboard_model import Dashboard
from backend.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardUpdate,
    OrderStatusUpdate,
    StatusCount,
)
from backend.utils.logger import logger
from backend.utils.lock import acquire_lock, release_lock, check_lock_status


class DashboardService:
    """대시보드(주문) 관련 서비스 클래스"""

    TABLE_NAME = "dashboard"

    @staticmethod
    def get_order(
        db: Session, dashboard_id: int, user_id: str
    ) -> Optional[Dict[str, Any]]:
        """주문 상세 정보를 조회합니다."""
        order = (
            db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
        )

        if not order:
            return None

        # ORM 객체를 딕셔너리로 변환
        order_dict = {c.name: getattr(order, c.name) for c in order.__table__.columns}

        # 락 정보 추가
        lock_status = check_lock_status(
            db, DashboardService.TABLE_NAME, dashboard_id, user_id
        )
        order_dict["locked_info"] = lock_status

        return order_dict

    @staticmethod
    def get_orders(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None,
        department: Optional[str] = None,
        warehouse: Optional[str] = None,
        order_no: Optional[str] = None,
    ) -> Tuple[List[Dashboard], int, Dict[str, int]]:
        """주문 목록을 조회합니다."""
        query = db.query(Dashboard)

        # 필터 적용
        if start_date and end_date:
            query = query.filter(Dashboard.eta.between(start_date, end_date))
        elif start_date:
            query = query.filter(Dashboard.eta >= start_date)
        elif end_date:
            query = query.filter(Dashboard.eta <= end_date)

        if status:
            query = query.filter(Dashboard.status == status)
        if department:
            query = query.filter(Dashboard.department == department)
        if warehouse:
            query = query.filter(Dashboard.warehouse == warehouse)
        if order_no:
            query = query.filter(Dashboard.order_no.ilike(f"%{order_no}%"))

        # 상태별 카운트 쿼리
        count_query = db.query(
            Dashboard.status, func.count(Dashboard.dashboard_id).label("count")
        )

        # 동일한 필터 적용
        if start_date and end_date:
            count_query = count_query.filter(
                Dashboard.eta.between(start_date, end_date)
            )
        elif start_date:
            count_query = count_query.filter(Dashboard.eta >= start_date)
        elif end_date:
            count_query = count_query.filter(Dashboard.eta <= end_date)

        if department:
            count_query = count_query.filter(Dashboard.department == department)
        if warehouse:
            count_query = count_query.filter(Dashboard.warehouse == warehouse)
        if order_no:
            count_query = count_query.filter(Dashboard.order_no.ilike(f"%{order_no}%"))

        # 그룹화
        count_result = count_query.group_by(Dashboard.status).all()

        # 카운트 결과를 딕셔너리로 변환
        status_counts = {
            "WAITING": 0,
            "IN_PROGRESS": 0,
            "COMPLETE": 0,
            "ISSUE": 0,
            "CANCEL": 0,
        }

        for status_name, count in count_result:
            status_counts[status_name] = count

        # 전체 수 계산
        total = query.count()

        # 페이지네이션 및 정렬 적용
        orders = query.order_by(desc(Dashboard.eta)).offset(skip).limit(limit).all()

        return orders, total, status_counts

    @staticmethod
    def create_order(
        db: Session, order_data: DashboardCreate, user_id: str
    ) -> Dashboard:
        """새 주문을 생성합니다."""
        try:
            # 우편번호 전처리 (4자리인 경우 앞에 0 추가)
            postal_code = order_data.postal_code
            if len(postal_code) == 4:
                postal_code = "0" + postal_code

            # 현재 시간 설정
            now = datetime.now()

            # 새 주문 생성
            new_order = Dashboard(
                order_no=order_data.order_no,
                type=order_data.type,
                status=order_data.status,
                department=order_data.department,
                warehouse=order_data.warehouse,
                sla=order_data.sla,
                eta=order_data.eta,
                create_time=now,
                postal_code=postal_code,
                address=order_data.address,
                customer=order_data.customer,
                contact=order_data.contact,
                driver_name=order_data.driver_name,
                driver_contact=order_data.driver_contact,
                updated_by=user_id,
                remark=order_data.remark,
                update_at=now,
                is_locked=False,
            )

            db.add(new_order)
            db.commit()
            db.refresh(new_order)
            logger.info(
                f"새 주문 생성 완료: {order_data.order_no} (ID: {new_order.dashboard_id})"
            )
            return new_order

        except Exception as e:
            db.rollback()
            logger.error(f"주문 생성 중 오류: {str(e)}")
            raise

    @staticmethod
    def update_order(
        db: Session, dashboard_id: int, order_data: DashboardUpdate, user_id: str
    ) -> Optional[Dashboard]:
        """주문 정보를 수정합니다."""
        # 락 확인
        lock_info = check_lock_status(
            db, DashboardService.TABLE_NAME, dashboard_id, user_id
        )
        if not lock_info.get("editable", False):
            logger.warning(
                f"락 없이 주문 수정 시도: ID {dashboard_id}, 사용자 {user_id}"
            )
            raise ValueError(
                lock_info.get("message", "이 주문을 수정할 권한이 없습니다")
            )

        order = (
            db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
        )
        if not order:
            return None

        try:
            # 수정 가능한 필드 목록
            updatable_fields = [
                "order_no",
                "type",
                "department",
                "warehouse",
                "sla",
                "eta",
                "postal_code",
                "address",
                "customer",
                "contact",
                "driver_name",
                "driver_contact",
                "remark",
            ]

            # 상태 변경은 별도 처리 (자동 시간 기록 필요)
            old_status = order.status
            new_status = order_data.status

            # 필드 업데이트
            for field in updatable_fields:
                if (
                    hasattr(order_data, field)
                    and getattr(order_data, field) is not None
                ):
                    value = getattr(order_data, field)

                    # 우편번호 특수 처리
                    if field == "postal_code" and len(value) == 4:
                        value = "0" + value

                    setattr(order, field, value)

            # 상태 변경 시 시간 자동 기록
            if new_status and old_status != new_status:
                order.status = new_status
                now = datetime.now()

                # 대기 → 진행 시 depart_time 기록
                if old_status == "WAITING" and new_status == "IN_PROGRESS":
                    order.depart_time = now
                    logger.info(
                        f"주문 상태 변경: {old_status} → {new_status}, 출발 시간 기록: {now}"
                    )

                # 진행 → 완료/이슈/취소 시 complete_time 기록
                elif old_status == "IN_PROGRESS" and new_status in [
                    "COMPLETE",
                    "ISSUE",
                    "CANCEL",
                ]:
                    order.complete_time = now
                    logger.info(
                        f"주문 상태 변경: {old_status} → {new_status}, 완료 시간 기록: {now}"
                    )

            # 수정자 및 수정 시간 업데이트
            order.updated_by = user_id
            order.update_at = datetime.now()

            db.commit()
            db.refresh(order)
            logger.info(f"주문 정보 수정 완료: ID {dashboard_id} ({order.order_no})")

            # 수정 완료 후 락 해제
            release_lock(db, DashboardService.TABLE_NAME, dashboard_id, user_id)
            return order

        except Exception as e:
            db.rollback()
            logger.error(f"주문 정보 수정 중 오류: {str(e)}")
            raise

    @staticmethod
    def delete_order(db: Session, dashboard_id: int, user_id: str) -> bool:
        """주문을 삭제합니다."""
        # 락 획득 시도
        success, lock_info = acquire_lock(
            db, DashboardService.TABLE_NAME, dashboard_id, user_id
        )
        if not success:
            logger.warning(
                f"락 획득 실패로 주문 삭제 불가: ID {dashboard_id}, 사용자 {user_id}"
            )
            raise ValueError(
                lock_info.get("message", "이 주문을 삭제할 권한이 없습니다")
            )

        order = (
            db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
        )
        if not order:
            return False

        try:
            db.delete(order)
            db.commit()
            logger.info(f"주문 삭제 완료: ID {dashboard_id} ({order.order_no})")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"주문 삭제 중 오류: {str(e)}")
            raise
        finally:
            # 성공하든 실패하든 락 해제 시도
            release_lock(db, DashboardService.TABLE_NAME, dashboard_id, user_id)

    @staticmethod
    def delete_multiple_orders(
        db: Session, order_ids: List[int], user_id: str
    ) -> Tuple[int, int]:
        """여러 주문을 일괄 삭제합니다."""
        # 삭제 성공/실패 카운트
        success_count = 0
        failed_count = 0

        for order_id in order_ids:
            try:
                # 각 주문마다 개별적으로 락 획득 및 삭제 시도
                success = DashboardService.delete_order(db, order_id, user_id)
                if success:
                    success_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                logger.error(f"주문 ID {order_id} 삭제 중 오류: {str(e)}")
                failed_count += 1

        logger.info(f"일괄 삭제 결과: 성공 {success_count}건, 실패 {failed_count}건")
        return success_count, failed_count

    @staticmethod
    def update_order_status(
        db: Session, dashboard_id: int, status: str, user_id: str
    ) -> Optional[Dashboard]:
        """주문 상태를 변경합니다."""
        # 락 획득 시도
        success, lock_info = acquire_lock(
            db, DashboardService.TABLE_NAME, dashboard_id, user_id
        )
        if not success:
            logger.warning(
                f"락 획득 실패로 주문 상태 변경 불가: ID {dashboard_id}, 사용자 {user_id}"
            )
            raise ValueError(
                lock_info.get("message", "이 주문의 상태를 변경할 권한이 없습니다")
            )

        try:
            order = (
                db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .first()
            )
            if not order:
                return None

            old_status = order.status
            now = datetime.now()

            # 상태 변경 처리 (자동 시간 기록 포함)
            order.status = status

            # 대기 → 진행 시 depart_time 기록
            if old_status == "WAITING" and status == "IN_PROGRESS":
                order.depart_time = now
                logger.info(
                    f"주문 상태 변경: {old_status} → {status}, 출발 시간 기록: {now}"
                )

            # 진행 → 완료/이슈/취소 시 complete_time 기록
            elif old_status == "IN_PROGRESS" and status in [
                "COMPLETE",
                "ISSUE",
                "CANCEL",
            ]:
                order.complete_time = now
                logger.info(
                    f"주문 상태 변경: {old_status} → {status}, 완료 시간 기록: {now}"
                )

            # 역행 시 로그 남기기 (관리자 권한 필요 - 컨트롤러에서 체크)
            elif (
                old_status in ["COMPLETE", "ISSUE", "CANCEL"]
                and status in ["WAITING", "IN_PROGRESS"]
            ) or (old_status == "IN_PROGRESS" and status == "WAITING"):
                logger.warning(
                    f"상태 역행 감지: {old_status} → {status}, 주문 ID {dashboard_id}, 사용자 {user_id}"
                )

            # 수정자 및 수정 시간 업데이트
            order.updated_by = user_id
            order.update_at = now

            db.commit()
            db.refresh(order)
            logger.info(
                f"주문 상태 변경 완료: ID {dashboard_id}, {old_status} → {status}"
            )
            return order

        except Exception as e:
            db.rollback()
            logger.error(f"주문 상태 변경 중 오류: {str(e)}")
            raise
        finally:
            # 성공하든 실패하든 락 해제 시도
            release_lock(db, DashboardService.TABLE_NAME, dashboard_id, user_id)

    @staticmethod
    def update_multiple_order_status(
        db: Session, order_ids: List[int], status: str, user_id: str
    ) -> Tuple[int, int]:
        """여러 주문의 상태를 일괄 변경합니다."""
        # 변경 성공/실패 카운트
        success_count = 0
        failed_count = 0

        for order_id in order_ids:
            try:
                # 각 주문마다 개별적으로 락 획득 및 상태 변경 시도
                result = DashboardService.update_order_status(
                    db, order_id, status, user_id
                )
                if result:
                    success_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                logger.error(f"주문 ID {order_id} 상태 변경 중 오류: {str(e)}")
                failed_count += 1

        logger.info(
            f"일괄 상태 변경 결과: 성공 {success_count}건, 실패 {failed_count}건"
        )
        return success_count, failed_count

    @staticmethod
    def assign_driver(
        db: Session,
        dashboard_id: int,
        driver_name: str,
        driver_contact: Optional[str],
        user_id: str,
    ) -> Optional[Dashboard]:
        """주문에 기사를 배정합니다."""
        # 락 획득 시도
        success, lock_info = acquire_lock(
            db, DashboardService.TABLE_NAME, dashboard_id, user_id
        )
        if not success:
            logger.warning(
                f"락 획득 실패로 기사 배정 불가: ID {dashboard_id}, 사용자 {user_id}"
            )
            raise ValueError(
                lock_info.get("message", "이 주문에 기사를 배정할 권한이 없습니다")
            )

        try:
            order = (
                db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .first()
            )
            if not order:
                return None

            # 기사 정보 업데이트
            order.driver_name = driver_name
            order.driver_contact = driver_contact

            # 수정자 및 수정 시간 업데이트
            order.updated_by = user_id
            order.update_at = datetime.now()

            db.commit()
            db.refresh(order)
            logger.info(f"기사 배정 완료: ID {dashboard_id}, 기사 {driver_name}")
            return order

        except Exception as e:
            db.rollback()
            logger.error(f"기사 배정 중 오류: {str(e)}")
            raise
        finally:
            # 성공하든 실패하든 락 해제 시도
            release_lock(db, DashboardService.TABLE_NAME, dashboard_id, user_id)

    @staticmethod
    def assign_driver_to_multiple_orders(
        db: Session,
        order_ids: List[int],
        driver_name: str,
        driver_contact: Optional[str],
        user_id: str,
    ) -> Tuple[int, int]:
        """여러 주문에 기사를 일괄 배정합니다."""
        # 배정 성공/실패 카운트
        success_count = 0
        failed_count = 0

        for order_id in order_ids:
            try:
                # 각 주문마다 개별적으로 락 획득 및 기사 배정 시도
                result = DashboardService.assign_driver(
                    db, order_id, driver_name, driver_contact, user_id
                )
                if result:
                    success_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                logger.error(f"주문 ID {order_id} 기사 배정 중 오류: {str(e)}")
                failed_count += 1

        logger.info(
            f"일괄 기사 배정 결과: 성공 {success_count}건, 실패 {failed_count}건"
        )
        return success_count, failed_count

    @staticmethod
    def lock_order(db: Session, dashboard_id: int, user_id: str) -> Dict[str, Any]:
        """주문에 편집 락을 설정합니다."""
        success, lock_info = acquire_lock(
            db, DashboardService.TABLE_NAME, dashboard_id, user_id
        )

        if success:
            logger.info(f"주문 락 획득 성공: ID {dashboard_id}, 사용자 {user_id}")
        else:
            logger.warning(f"주문 락 획득 실패: ID {dashboard_id}, 사용자 {user_id}")

        return {
            "success": success,
            "message": lock_info.get("message", "락 상태 확인 실패"),
            "lock_status": {
                "editable": lock_info.get("editable", False),
                "locked_by": lock_info.get("locked_by", None),
                "locked_at": lock_info.get("locked_at", None),
            },
        }

    @staticmethod
    def unlock_order(db: Session, dashboard_id: int, user_id: str) -> Dict[str, Any]:
        """주문의 편집 락을 해제합니다."""
        success, lock_info = release_lock(
            db, DashboardService.TABLE_NAME, dashboard_id, user_id
        )

        if success:
            logger.info(f"주문 락 해제 성공: ID {dashboard_id}, 사용자 {user_id}")
        else:
            logger.warning(f"주문 락 해제 실패: ID {dashboard_id}, 사용자 {user_id}")

        return {
            "success": success,
            "message": lock_info.get("message", "락 해제 상태 확인 실패"),
        }
