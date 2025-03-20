# backend/app/repositories/dashboard_repository.py
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict, Any, Set
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, or_, exc, desc, case, text, select
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError
from app.models.dashboard_model import Dashboard
from app.models.postal_code_model import PostalCode, PostalCodeDetail
from app.utils.logger import log_error, log_info
from app.utils.exceptions import PessimisticLockException
import time
import pytz

class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db
        self.kr_timezone = pytz.timezone("Asia/Seoul")

    def get_dashboard_detail(self, dashboard_id: int) -> Optional[Dashboard]:
        """대시보드 상세 정보 조회"""
        try:
            dashboard = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .first()
            )
            return dashboard
        except SQLAlchemyError as e:
            log_error(e, "대시보드 상세 정보 조회 실패", {"id": dashboard_id})
            raise

    def get_dashboard_list_by_date(
        self, start_date: datetime, end_date: datetime
    ) -> List[Dashboard]:
        """
        날짜 범위로 대시보드 목록 조회
        """
        try:
            dashboards = (
                self.db.query(Dashboard)
                .filter(
                    and_(
                        Dashboard.eta >= start_date,
                        Dashboard.eta <= end_date
                    )
                )
                .order_by(
                    case(
                        (Dashboard.status == "WAITING", 1),
                        (Dashboard.status == "IN_PROGRESS", 2),
                        (Dashboard.status == "COMPLETE", 3),
                        (Dashboard.status == "ISSUE", 4),
                        (Dashboard.status == "CANCEL", 5),
                    ),
                    Dashboard.eta
                )
                .all()
            )
            return dashboards
        except SQLAlchemyError as e:
            log_error(e, "대시보드 목록 조회 실패")
            raise

    def get_dashboards_by_ids(self, dashboard_ids: List[int]) -> List[Dashboard]:
        """여러 대시보드 ID로 정보 조회"""
        try:
            if not dashboard_ids:
                return []
                
            dashboards = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .all()
            )
            return dashboards
        except SQLAlchemyError as e:
            log_error(e, "다중 대시보드 조회 실패", {"ids": dashboard_ids})
            raise

    def update_dashboard_fields(
        self, dashboard_id: int, fields: Dict[str, Any]
    ) -> Optional[Dashboard]:
        """
        대시보드 필드 업데이트 (트랜잭션 내에서의 비관적 락 사용)
        - 참고: 행 수준 잠금(FOR UPDATE)은 상위 Service 레이어에서 처리해야 함
        """
        try:
            # 대시보드 조회 - 호출자가 이미 락을 획득한 상태여야 함
            dashboard = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .first()
            )
            
            if not dashboard:
                return None

            # 필드 업데이트
            for field, value in fields.items():
                if hasattr(dashboard, field):
                    setattr(dashboard, field, value)

            self.db.flush()

            log_info(
                f"필드 업데이트 완료: ID={dashboard.dashboard_id}, 필드={list(fields.keys())}"
            )

            return dashboard

        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "필드 업데이트 실패", {"id": dashboard_id, "fields": fields})
            raise
        
    def update_dashboard_status(
        self, dashboard_id: int, status: str, current_time: datetime
    ) -> Optional[Dashboard]:
        """
        상태 업데이트 (트랜잭션 내에서의 비관적 락 사용)
        - 참고: 행 수준 잠금(FOR UPDATE)은 상위 Service 레이어에서 처리해야 함
        """
        try:
            # 대시보드 조회 - 호출자가 이미 락을 획득한 상태여야 함
            dashboard = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .first()
            )
            
            if not dashboard:
                return None

            old_status = dashboard.status
            dashboard.status = status

            # 상태 변경에 따른 시간 업데이트
            if status == "IN_PROGRESS" and old_status != "IN_PROGRESS":
                dashboard.depart_time = current_time
                dashboard.complete_time = None
            elif status in ["COMPLETE", "ISSUE"]:
                dashboard.complete_time = current_time
            elif status in ["WAITING", "CANCEL"]:
                dashboard.depart_time = None
                dashboard.complete_time = None

            self.db.flush()

            log_info(
                f"상태 업데이트 완료: ID={dashboard.dashboard_id}, {old_status} -> {status}"
            )

            return dashboard

        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "상태 업데이트 실패", {"id": dashboard_id, "status": status})
            raise
        
    def assign_driver(
        self, dashboard_ids: List[int], driver_name: str, driver_contact: str
    ) -> List[Dashboard]:
        """
        배차 처리 (트랜잭션 내에서의 비관적 락 사용)
        - 참고: 행 수준 잠금(FOR UPDATE)은 상위 Service 레이어에서 처리해야 함
        """
        try:
            log_info(f"배차 처리 시작: {len(dashboard_ids)}건")
            
            if not dashboard_ids:
                return []

            # 대상 대시보드 조회 - 호출자가 이미 락을 획득한 상태여야 함
            dashboards = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .all()
            )
            
            if not dashboards:
                return []

            # 각 대시보드에 배차 정보 업데이트
            for dashboard in dashboards:
                dashboard.driver_name = driver_name
                dashboard.driver_contact = driver_contact

            self.db.flush()
            
            log_info(f"배차 처리 완료: {len(dashboards)}건")
            
            return dashboards

        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "배차 처리 실패", {"ids": dashboard_ids})
            raise

    def delete_dashboards(self, dashboard_ids: List[int]) -> int:
        """
        대시보드 삭제 (관리자 전용)
        
        Returns:
            삭제된 레코드 수
        """
        try:
            if not dashboard_ids:
                return 0
                
            # 대시보드 삭제 (CASCADE로 관련 레코드 함께 삭제)
            deleted = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .delete(synchronize_session=False)
            )
            
            self.db.flush()
            
            log_info(f"대시보드 삭제 완료: {deleted}건")
            
            return deleted

        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "대시보드 삭제 실패", {"ids": dashboard_ids})
            raise

    def create_dashboard(self, dashboard_data: Dict[str, Any]) -> Optional[Dashboard]:
        """
        새 대시보드 생성
        """
        try:
            # 새 대시보드 객체 생성
            dashboard = Dashboard(**dashboard_data)
            
            self.db.add(dashboard)
            self.db.flush()
            self.db.refresh(dashboard)
            
            log_info(f"대시보드 생성 완료: ID={dashboard.dashboard_id}")
            
            return dashboard
            
        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "대시보드 생성 실패", {"data": dashboard_data})
            raise
            
    def search_dashboards_by_order_no(self, order_no: str) -> List[Dashboard]:
        """
        주문번호로 대시보드 검색
        """
        try:
            dashboards = (
                self.db.query(Dashboard)
                .filter(Dashboard.order_no == order_no)
                .order_by(
                    case(
                        (Dashboard.status == "WAITING", 1),
                        (Dashboard.status == "IN_PROGRESS", 2),
                        (Dashboard.status == "COMPLETE", 3),
                        (Dashboard.status == "ISSUE", 4),
                        (Dashboard.status == "CANCEL", 5),
                    ),
                    Dashboard.eta
                )
                .all()
            )
            return dashboards
        except SQLAlchemyError as e:
            log_error(e, "주문번호 검색 실패", {"order_no": order_no})
            raise
            
    def get_date_range(self) -> Tuple[datetime, datetime]:
        """
        조회 가능한 날짜 범위 조회 (ETA 기준)
        """
        try:
            result = self.db.query(
                func.min(Dashboard.eta).label("oldest_date"),
                func.max(Dashboard.eta).label("latest_date"),
            ).first()

            oldest_date = result.oldest_date if result.oldest_date else datetime.now(self.kr_timezone)
            latest_date = result.latest_date if result.latest_date else datetime.now(self.kr_timezone)

            log_info(f"조회 가능 날짜 범위: {oldest_date} ~ {latest_date}")
            return oldest_date, latest_date
        except SQLAlchemyError as e:
            log_error(e, "날짜 범위 조회 실패")
            # 기본값 반환 (현재일 기준 30일)
            now = datetime.now(self.kr_timezone)
            return now - timedelta(days=30), now

    def acquire_lock_for_update(self, dashboard_id: int) -> Optional[Dashboard]:
        """
        FOR UPDATE NOWAIT를 사용한 비관적 락 획득
        
        Args:
            dashboard_id: 대시보드 ID
            
        Returns:
            획득한 대시보드 객체 또는 None
            
        Raises:
            PessimisticLockException: 락 획득 실패 시
        """
        try:
            # Row-level lock 획득 시도 (NOWAIT 옵션으로 즉시 실패)
            stmt = select(Dashboard).where(Dashboard.dashboard_id == dashboard_id).with_for_update(nowait=True)
            dashboard = self.db.execute(stmt).scalar_one_or_none()
            
            if not dashboard:
                log_error(None, f"대시보드를 찾을 수 없음: ID {dashboard_id}")
                return None
                
            return dashboard
            
        except OperationalError:
            # 다른 트랜잭션이 이미 해당 행을 잠금 - NOWAIT 옵션 때문에 즉시 실패
            log_error(None, f"대시보드 {dashboard_id}에 대한 DB 락 획득 실패")
            raise PessimisticLockException(
                "다른 사용자가 이미 이 항목을 수정 중입니다", locked_by="Unknown"
            )

    def acquire_locks_for_update(self, dashboard_ids: List[int]) -> List[Dashboard]:
        """
        여러 대시보드에 대한 FOR UPDATE NOWAIT를 사용한 비관적 락 획득
        
        Args:
            dashboard_ids: 대시보드 ID 목록
            
        Returns:
            획득한 대시보드 객체 목록
            
        Raises:
            PessimisticLockException: 락 획득 실패 시
        """
        try:
            if not dashboard_ids:
                return []
                
            # Row-level locks 획득 시도 (NOWAIT 옵션으로 즉시 실패)
            dashboard_ids_str = ','.join(str(id) for id in dashboard_ids)
            stmt = text(f"SELECT dashboard_id FROM dashboard WHERE dashboard_id IN ({dashboard_ids_str}) FOR UPDATE NOWAIT")
            result = self.db.execute(stmt)
            locked_ids = [row[0] for row in result]
            
            # 모든 대시보드가 잠금되었는지 확인
            if len(locked_ids) != len(dashboard_ids):
                missing_ids = set(dashboard_ids) - set(locked_ids)
                log_error(None, f"일부 대시보드 잠금 실패: {missing_ids}")
                raise PessimisticLockException(
                    "일부 대시보드를 잠글 수 없습니다. 다른 사용자가 수정 중입니다."
                )
                
            # 잠금된 대시보드 정보 조회
            dashboards = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(locked_ids))
                .all()
            )
            
            return dashboards
            
        except OperationalError:
            # 다른 트랜잭션이 이미 해당 행들 중 하나를 잠금
            log_error(None, f"다중 대시보드 락 획득 실패: {dashboard_ids}")
            raise PessimisticLockException(
                "다른 사용자가 이미 이 항목들 중 하나를 수정 중입니다"
            )