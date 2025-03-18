# backend/app/repositories/dashboard_repository.py
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict, Any, Set
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, or_, exc, desc, case
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from app.models.dashboard_model import Dashboard
from app.models.postal_code_model import PostalCode, PostalCodeDetail
from app.utils.logger import log_error, log_info
from app.utils.exceptions import PessimisticLockException
from app.repositories.dashboard_lock_repository import DashboardLockRepository
import time
import pytz

class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db
        self.kr_timezone = pytz.timezone("Asia/Seoul")
        self.lock_repository = DashboardLockRepository(db)

    # 기존 메서드들은 유지...

    def update_dashboard_fields_with_version(
        self, dashboard_id: int, fields: Dict[str, Any], 
        client_version: Optional[int] = None, increment_version: bool = True
    ) -> Tuple[Optional[Dashboard], bool]:
        """
        대시보드 필드 업데이트 (낙관적 락 적용)
        
        Returns:
            Tuple[Optional[Dashboard], bool]: (업데이트된 대시보드, 낙관적 락 충돌 여부)
        """
        try:
            dashboard = self.get_dashboard_detail(dashboard_id)
            if not dashboard:
                return None, False

            # 낙관적 락 충돌 검사
            conflict = False
            if client_version is not None and dashboard.version > client_version:
                log_info(
                    f"낙관적 락 충돌: ID={dashboard_id}, 클라이언트 버전={client_version}, " 
                    f"서버 버전={dashboard.version}"
                )
                conflict = True
                return dashboard, conflict  # 충돌 발생, 현재 대시보드와 충돌 플래그 반환

            # 필드 업데이트
            for field, value in fields.items():
                if hasattr(dashboard, field) and field != "version":
                    setattr(dashboard, field, value)

            # 버전 증가 여부에 따라 처리
            if increment_version:
                dashboard.version += 1

            self.db.commit()
            self.db.refresh(dashboard)

            log_info(
                f"필드 업데이트 완료: ID={dashboard.dashboard_id}, 필드={list(fields.keys())}, "
                f"버전={dashboard.version}"
            )

            return dashboard, conflict

        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "필드 업데이트 실패", {"id": dashboard_id, "fields": fields})
            raise
        
    def update_dashboard_status_with_version(
        self, dashboard_id: int, status: str, current_time: datetime, 
        client_version: Optional[int] = None, increment_version: bool = True
    ) -> Tuple[Optional[Dashboard], bool]:
        """
        상태 업데이트 (낙관적 락 적용)
        
        Returns:
            Tuple[Optional[Dashboard], bool]: (업데이트된 대시보드, 낙관적 락 충돌 여부)
        """
        try:
            dashboard = self.get_dashboard_detail(dashboard_id)
            if not dashboard:
                return None, False

            # 낙관적 락 충돌 검사
            conflict = False
            if client_version is not None and dashboard.version > client_version:
                log_info(
                    f"낙관적 락 충돌: ID={dashboard_id}, 클라이언트 버전={client_version}, "
                    f"서버 버전={dashboard.version}"
                )
                conflict = True
                return dashboard, conflict  # 충돌 발생, 현재 대시보드와 충돌 플래그 반환

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

            # 버전 증가 여부에 따라 처리
            if increment_version:
                dashboard.version += 1

            self.db.commit()
            self.db.refresh(dashboard)

            log_info(
                f"상태 업데이트 완료: ID={dashboard.dashboard_id}, {old_status} -> {status}, "
                f"버전={dashboard.version}"
            )

            return dashboard, conflict

        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "상태 업데이트 실패", {"id": dashboard_id, "status": status})
            raise
        
    def assign_driver_with_version(
        self, dashboard_ids: List[int], driver_name: str, driver_contact: str,
        client_versions: Optional[Dict[int, int]] = None, increment_version: bool = True
    ) -> Tuple[List[Dashboard], List[int]]:
        """
        배차 처리 (낙관적 락 적용)
        
        Returns:
            Tuple[List[Dashboard], List[int]]: (업데이트된 대시보드 목록, 충돌이 발생한 대시보드 ID 목록)
        """
        try:
            log_info(f"배차 처리 시작 (낙관적 락 적용): {len(dashboard_ids)}건")

            # 대상 대시보드 조회
            dashboards = self.get_dashboards_by_ids(dashboard_ids)
            if not dashboards:
                return [], []

            successful_ids = []
            conflict_ids = []  # 충돌이 발생한 대시보드 ID 목록

            # 각 대시보드에 대해 배차 정보 업데이트
            for dashboard in dashboards:
                # 낙관적 락 충돌 검사
                if (client_versions and dashboard.dashboard_id in client_versions and 
                    dashboard.version > client_versions[dashboard.dashboard_id]):
                    conflict_ids.append(dashboard.dashboard_id)
                    continue

                # 배차 정보 업데이트
                dashboard.driver_name = driver_name
                dashboard.driver_contact = driver_contact
                
                # 버전 증가
                if increment_version:
                    dashboard.version += 1
                    
                successful_ids.append(dashboard.dashboard_id)

            # 충돌이 발생한 ID가 없는 경우에만 커밋
            if not conflict_ids:
                self.db.commit()
                log_info(f"배차 처리 완료: {len(successful_ids)}건")
            else:
                self.db.rollback()
                log_info(f"배차 처리 충돌: {len(conflict_ids)}건")
                successful_ids = []

            # 업데이트된 대시보드와 충돌 ID 반환
            return self.get_dashboards_by_ids(successful_ids), conflict_ids

        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "배차 처리 실패", {"ids": dashboard_ids})
            raise