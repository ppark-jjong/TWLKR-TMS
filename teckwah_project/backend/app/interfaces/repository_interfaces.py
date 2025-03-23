# app/interfaces/repository_interfaces.py
from typing import Protocol, List, Optional, Tuple, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.dashboard_model import Dashboard
from app.models.dashboard_remark_model import DashboardRemark
from app.models.dashboard_lock_model import DashboardLock
from app.models.refresh_token_model import RefreshToken


class DashboardRepositoryInterface(Protocol):
    """대시보드 저장소 인터페이스"""

    db: Session

    def get_dashboard_list_by_date(
        self, start_date: datetime, end_date: datetime
    ) -> List[Dashboard]: ...
    def get_dashboard_detail(self, dashboard_id: int) -> Optional[Dashboard]: ...
    def get_date_range(self) -> Tuple[datetime, datetime]: ...
    def create_dashboard(self, dashboard_data: Dict[str, Any]) -> Dashboard: ...
    def update_dashboard_fields(
        self, dashboard_id: int, fields: Dict[str, Any]
    ) -> Optional[Dashboard]: ...
    def assign_driver(
        self, dashboard_ids: List[int], driver_name: str, driver_contact: str
    ) -> List[Dashboard]: ...
    def delete_dashboards(self, dashboard_ids: List[int]) -> int: ...
    def search_dashboards_by_order_no(self, order_no: str) -> List[Dashboard]: ...
    def acquire_lock_for_update(self, dashboard_id: int) -> Optional[Dashboard]: ...
    def acquire_locks_for_update(self, dashboard_ids: List[int]) -> List[Dashboard]: ...


class DashboardRemarkRepositoryInterface(Protocol):
    """대시보드 메모 저장소 인터페이스"""

    db: Session

    def get_remarks_by_dashboard_id(
        self, dashboard_id: int
    ) -> List[DashboardRemark]: ...
    def get_remark_by_id(self, remark_id: int) -> Optional[DashboardRemark]: ...
    def create_remark(
        self, dashboard_id: int, content: str, created_by: str
    ) -> DashboardRemark: ...
    def create_empty_remark(
        self, dashboard_id: int, created_by: str
    ) -> DashboardRemark: ...
    def update_remark(
        self, remark_id: int, content: str, updated_by: str
    ) -> Optional[DashboardRemark]: ...
    def delete_remark(self, remark_id: int) -> bool: ...


class DashboardLockRepositoryInterface(Protocol):
    """대시보드 락 저장소 인터페이스"""

    db: Session

    def acquire_lock(
        self, dashboard_id: int, user_id: str, lock_type: str
    ) -> Optional[DashboardLock]: ...
    def acquire_locks_for_multiple_dashboards(
        self, dashboard_ids: List[int], user_id: str, lock_type: str
    ) -> List[int]: ...
    def release_lock(self, dashboard_id: int, user_id: str) -> bool: ...
    def get_lock_info(self, dashboard_id: int) -> Optional[DashboardLock]: ...
    def cleanup_expired_locks(self) -> int: ...


class AuthRepositoryInterface(Protocol):
    """인증 저장소 인터페이스"""

    db: Session

    def get_user_by_id(self, user_id: str) -> Optional[Any]: ...
    def store_refresh_token(
        self, user_id: str, refresh_token: str, expires_at: datetime
    ) -> RefreshToken: ...
    def get_valid_refresh_token(self, refresh_token: str) -> Optional[RefreshToken]: ...
    def delete_refresh_token(self, refresh_token: str) -> bool: ...


class VisualizationRepositoryInterface(Protocol):
    """시각화 저장소 인터페이스"""

    db: Session

    def get_raw_delivery_data(
        self, start_time: datetime, end_time: datetime
    ) -> List[Tuple]: ...
    def get_raw_hourly_data(
        self, start_time: datetime, end_time: datetime
    ) -> List[Tuple]: ...
    def get_date_range(self) -> Tuple[datetime, datetime]: ...
