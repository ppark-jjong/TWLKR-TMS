# teckwah_project/server/services/dashboard_service.py
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

from server.models.dashboard_model import Dashboard
from server.models.postal_code_model import PostalCode, PostalCodeDetail
from server.schemas.dashboard_schema import (
    StatusUpdate,
    FieldsUpdate,
    DriverAssignment,
    DashboardUpdate,
)
from server.utils.datetime import get_kst_now
from server.utils.logger import log_info, log_error
from server.utils.error import (
    PessimisticLockException,
    ValidationException,
    NotFoundException,
    InvalidStatusTransitionException,
)
from server.utils.transaction import transactional
from server.utils.constants import STATUS_TRANSITIONS, MESSAGES
from server.utils.lock_manager import LockManager
from server.config.settings import get_settings

settings = get_settings()


class DashboardService:
    """대시보드 서비스"""

    def __init__(self, repository, db, lock_manager=None):
        """서비스 초기화"""
        self.repository = repository
        self.db = db
        self.lock_manager = lock_manager or LockManager(repository, db)

    def _convert_to_dict(self, dashboard):
        """대시보드 모델을 딕셔너리로 변환"""
        if not dashboard:
            return {}
        return {c.name: getattr(dashboard, c.name) for c in dashboard.__table__.columns}

    def _prepare_dashboard_detail(self, dashboard):
        """대시보드 상세 정보 준비"""
        if not dashboard:
            return {}

        dashboard_dict = self._convert_to_dict(dashboard)

        # 날짜 필드 포맷팅
        for date_field in ["eta", "create_time", "depart_time", "complete_time"]:
            if dashboard_dict.get(date_field):
                dashboard_dict[date_field] = dashboard_dict[date_field].isoformat()

        return dashboard_dict

    @transactional
    def create_dashboard(self, dashboard_data: Dict[str, Any]) -> Dict[str, Any]:
        """대시보드 생성 메서드"""
        try:
            # 우편번호 존재 확인
            postal_code = dashboard_data.get("postal_code")
            if postal_code:
                postal_info = (
                    self.db.query(PostalCode)
                    .filter(PostalCode.postal_code == postal_code)
                    .first()
                )
                if postal_info:
                    # 우편번호 정보 설정
                    dashboard_data["city"] = postal_info.city
                    dashboard_data["county"] = postal_info.county
                    dashboard_data["district"] = postal_info.district

                    # 창고 정보가 있으면 거리, 소요시간 정보도 설정
                    warehouse = dashboard_data.get("warehouse")
                    if warehouse:
                        detail_info = (
                            self.db.query(PostalCodeDetail)
                            .filter(
                                PostalCodeDetail.postal_code == postal_code,
                                PostalCodeDetail.warehouse == warehouse,
                            )
                            .first()
                        )
                        if detail_info:
                            dashboard_data["distance"] = detail_info.distance
                            dashboard_data["duration_time"] = detail_info.duration_time

            # 대시보드 생성
            dashboard = self.repository.create_dashboard(dashboard_data)
            if not dashboard:
                raise Exception("대시보드 생성 실패")

            # 응답 데이터 생성
            return self._prepare_dashboard_detail(dashboard)
        except Exception as e:
            log_error(e, "대시보드 생성 실패")
            raise

    @transactional
    def get_dashboard_list(self, filters=None) -> List[Dict[str, Any]]:
        """대시보드 목록 조회 (필터링 가능)"""
        dashboards = self.repository.get_dashboard_list(filters)
        return [self._convert_to_dict(dashboard) for dashboard in dashboards]

    @transactional
    def get_dashboard_detail(self, dashboard_id: int) -> Dict[str, Any]:
        """대시보드 상세 정보 조회"""
        dashboard = self.repository.get_dashboard_detail(dashboard_id)
        if not dashboard:
            raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

        return self._prepare_dashboard_detail(dashboard)

    @transactional
    def delete_dashboards(self, dashboard_ids: List[int]) -> int:
        """대시보드 삭제 (관리자 전용)"""
        if not dashboard_ids:
            return 0
        return self.repository.delete_dashboards(dashboard_ids)

    @transactional
    def search_dashboards_by_order_no(self, order_no: str) -> List[Dict[str, Any]]:
        """주문번호로 대시보드 검색"""
        dashboards = self.repository.search_dashboards_by_order_no(order_no)
        return [self._convert_to_dict(dashboard) for dashboard in dashboards]

    @transactional
    def update_dashboard_status(
        self, dashboard_id: int, status_update: StatusUpdate, user_id: str
    ) -> Dict[str, Any]:
        """대시보드 상태 업데이트 (비관적 락 사용)"""
        new_status = status_update.status
        is_admin = status_update.is_admin

        # 락 획득
        with self.lock_manager.acquire_lock(dashboard_id, user_id, "STATUS"):
            # 대시보드 조회
            dashboard = self.repository.get_dashboard_by_id(dashboard_id)
            if not dashboard:
                raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

            # 상태 전이 유효성 검증 (관리자는 모든 상태 변경 가능)
            current_status = dashboard.status
            if not is_admin:
                if current_status not in STATUS_TRANSITIONS:
                    raise ValidationException(
                        MESSAGES["VALIDATION"]["INVALID_STATUS_CHANGE"]
                    )

                if new_status not in STATUS_TRANSITIONS.get(current_status, []):
                    raise InvalidStatusTransitionException(
                        detail=f"'{current_status}'에서 '{new_status}'로 상태를 변경할 수 없습니다",
                        current_status=current_status,
                        target_status=new_status,
                    )

            # 상태별 시간 자동 업데이트
            update_data = {"status": new_status, "updated_by": user_id}
            now = get_kst_now()

            # 출발 시간 (IN_PROGRESS로 변경 시)
            if new_status == "IN_PROGRESS" and not dashboard.depart_time:
                update_data["depart_time"] = now

            # 완료 시간 (COMPLETE 또는 ISSUE로 변경 시)
            if (
                new_status == "COMPLETE" or new_status == "ISSUE"
            ) and not dashboard.complete_time:
                update_data["complete_time"] = now

            # 상태 업데이트
            dashboard = self.repository.update_dashboard_fields(
                dashboard_id, update_data
            )

            return self._prepare_dashboard_detail(dashboard)

    @transactional
    def update_dashboard_fields(
        self, dashboard_id: int, fields_update: FieldsUpdate, user_id: str
    ) -> Dict[str, Any]:
        """대시보드 필드 업데이트 (비관적 락 사용)"""
        # 락 획득
        with self.lock_manager.acquire_lock(dashboard_id, user_id, "EDIT"):
            # 필드 업데이트 데이터 준비
            update_data = fields_update.model_dump(exclude_unset=True)
            if not update_data:
                raise ValidationException(
                    MESSAGES["VALIDATION"]["REQUIRED"].format(field="업데이트 데이터")
                )

            # 우편번호 변경 시 관련 정보도 함께 업데이트
            if "postal_code" in update_data:
                postal_code = update_data["postal_code"]
                postal_info = (
                    self.db.query(PostalCode)
                    .filter(PostalCode.postal_code == postal_code)
                    .first()
                )

                if postal_info:
                    update_data["city"] = postal_info.city
                    update_data["county"] = postal_info.county
                    update_data["district"] = postal_info.district

                    # 창고 정보가 있으면 거리, 소요시간 정보도 업데이트
                    dashboard = self.repository.get_dashboard_detail(dashboard_id)
                    if dashboard and (
                        "warehouse" in update_data or dashboard.warehouse
                    ):
                        warehouse = update_data.get("warehouse") or dashboard.warehouse
                        detail_info = (
                            self.db.query(PostalCodeDetail)
                            .filter(
                                PostalCodeDetail.postal_code == postal_code,
                                PostalCodeDetail.warehouse == warehouse,
                            )
                            .first()
                        )

                        if detail_info:
                            update_data["distance"] = detail_info.distance
                            update_data["duration_time"] = detail_info.duration_time

            # 업데이트한 사용자 추가
            update_data["updated_by"] = user_id

            # 필드 업데이트
            dashboard = self.repository.update_dashboard_fields(
                dashboard_id, update_data
            )
            if not dashboard:
                raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

            return self._prepare_dashboard_detail(dashboard)

    @transactional
    def assign_driver(
        self, dashboard_id: int, driver_data: DriverAssignment, user_id: str
    ) -> Dict[str, Any]:
        """배송 기사 배정 (비관적 락 사용)"""
        # 락 획득
        with self.lock_manager.acquire_lock(dashboard_id, user_id, "ASSIGN"):
            # 드라이버 정보가 있는지 확인
            if not driver_data.driver_name and not driver_data.driver_contact:
                raise ValidationException(
                    MESSAGES["VALIDATION"]["REQUIRED"].format(
                        field="기사명 또는 연락처"
                    )
                )

            # 업데이트 데이터 준비
            update_data = driver_data.model_dump(exclude_unset=True)
            update_data["updated_by"] = user_id

            # 드라이버 정보 업데이트
            dashboard = self.repository.update_dashboard_fields(
                dashboard_id, update_data
            )
            if not dashboard:
                raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

            return self._prepare_dashboard_detail(dashboard)

    @transactional
    def update_dashboard(
        self, dashboard_id: int, dashboard_update: DashboardUpdate, user_id: str
    ) -> Dict[str, Any]:
        """대시보드 통합 업데이트 (모든 필드)"""
        # 1. 대시보드 존재 여부 확인
        dashboard = self.repository.get_dashboard_by_id(dashboard_id)
        if not dashboard:
            raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

        # 2. 락 획득
        with self.lock_manager.acquire_lock(dashboard_id, user_id, "UPDATE"):
            # 3. 업데이트할 필드 추출
            update_data = dashboard_update.model_dump(exclude_unset=True)

            # 업데이트한 사용자 정보 추가
            update_data["updated_by"] = user_id

            # 우편번호 변경 시 관련 정보도 함께 업데이트
            if "postal_code" in update_data:
                postal_code = update_data["postal_code"]
                postal_info = (
                    self.db.query(PostalCode)
                    .filter(PostalCode.postal_code == postal_code)
                    .first()
                )

                if postal_info:
                    update_data["city"] = postal_info.city
                    update_data["county"] = postal_info.county
                    update_data["district"] = postal_info.district

                    # 창고 정보가 있으면 거리, 소요시간 정보도 업데이트
                    warehouse = update_data.get("warehouse") or dashboard.warehouse
                    if warehouse:
                        detail_info = (
                            self.db.query(PostalCodeDetail)
                            .filter(
                                PostalCodeDetail.postal_code == postal_code,
                                PostalCodeDetail.warehouse == warehouse,
                            )
                            .first()
                        )

                        if detail_info:
                            update_data["distance"] = detail_info.distance
                            update_data["duration_time"] = detail_info.duration_time

            # 데이터 업데이트 실행
            if update_data:
                dashboard = self.repository.update_dashboard_fields(
                    dashboard_id, update_data
                )

            return self._prepare_dashboard_detail(dashboard)
