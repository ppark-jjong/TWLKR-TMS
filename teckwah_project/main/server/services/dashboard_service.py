# teckwah_project/main/server/services/dashboard_service.py
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

from main.server.models.dashboard_model import Dashboard
from main.server.models.postal_code_model import PostalCode, PostalCodeDetail
from main.server.schemas.dashboard_schema import (
    RemarkCreate,
    RemarkUpdate,
    StatusUpdate,
    FieldsUpdate,
    DriverAssignment,
    DashboardUpdate,
)
from main.server.utils.datetime_helper import get_kst_now, localize_to_kst
from main.server.utils.logger import log_info, log_error
from main.server.utils.exceptions import (
    PessimisticLockException,
    ValidationException,
    NotFoundException,
    InvalidStatusTransitionException,
)
from main.server.utils.transaction import transactional
from main.server.utils.constants import STATUS_TRANSITIONS, MESSAGES
from main.server.utils.lock_manager import LockManager
from main.server.config.settings import get_settings

settings = get_settings()

class DashboardService:
    """대시보드 서비스"""

    def __init__(
        self,
        repository,
        lock_manager=None,
        db=None,
    ):
        self.repository = repository
        self.lock_manager = lock_manager or LockManager(repository)
        self.db = getattr(repository, "db", None) if db is None else db

    def get_dashboard_list_by_date(
        self, start_date: datetime, end_date: datetime
    ) -> List[Dict[str, Any]]:
        """ETA 기준으로 날짜 범위 내 대시보드 목록 조회"""
        dashboards = self.repository.get_dashboard_list_by_date(start_date, end_date)
        return [self._convert_to_dict(dashboard) for dashboard in dashboards]

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 (ETA 기준)"""
        return self.repository.get_date_range()

    def get_dashboard_with_status_check(self, dashboard_id: int) -> Dict[str, Any]:
        """대시보드 상세 정보 조회 (락 상태 포함)"""
        dashboard = self.repository.get_dashboard_detail(dashboard_id)
        if not dashboard:
            raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

        # 락 상태 확인 (LockManager 사용)
        lock_status = self.lock_manager.get_lock_status(dashboard_id)
        is_locked = lock_status.get("is_locked", False)

        # 상세 정보 구성
        result = self._prepare_dashboard_detail(dashboard)

        # 락 정보 추가
        if is_locked:
            result["is_locked"] = True
            result["locked_by"] = lock_status.get("locked_by")
            result["lock_type"] = lock_status.get("lock_type")
            result["lock_expires_at"] = lock_status.get("expires_at")
        else:
            result["is_locked"] = False

        return result

    @transactional
    def create_dashboard(
        self, dashboard_data: Any, department: str, user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """대시보드 생성 (메모 포함)"""
        # 1. 대시보드 모델 데이터 변환
        postal_code = dashboard_data.postal_code
        
        # 2. 우편번호 존재 여부 확인
        try:
            postal_info = self.repository.get_postal_code_info(postal_code)
            if not postal_info:
                raise ValidationException(f"유효하지 않은 우편번호입니다: {postal_code}")
        except Exception as e:
            raise ValidationException(f"우편번호 확인 중 오류 발생: {str(e)}")
        
        # 3. 입력 데이터에 우편번호 정보 및 부서 추가
        dashboard_dict = dashboard_data.model_dump()
        dashboard_dict["department"] = department
        dashboard_dict["city"] = postal_info.city
        dashboard_dict["county"] = postal_info.county
        dashboard_dict["district"] = postal_info.district
        
        # 작성자 정보 추가
        if user_id:
            dashboard_dict["created_by"] = user_id
        
        # 메모 내용이 있으면 메모 관련 필드 설정
        now = get_kst_now()
        if hasattr(dashboard_data, 'remark') and dashboard_data.remark:
            dashboard_dict["remark"] = dashboard_data.remark
            dashboard_dict["remark_updated_at"] = now
            dashboard_dict["remark_updated_by"] = user_id
        
        # 4. 대시보드 생성
        dashboard = self.repository.create_dashboard(dashboard_dict)
        
        # 5. 반환 데이터 준비
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

    def _prepare_dashboard_detail(self, dashboard, remarks=None):
        """대시보드 상세 정보 준비"""
        dashboard_dict = self._convert_to_dict(dashboard)
        
        # 메모 정보 추가 - 대시보드 remark 필드 사용
        if hasattr(dashboard, 'remark') and dashboard.remark:
            # remark 정보를 포맷팅하여 추가
            dashboard_dict["formatted_remark"] = dashboard.remark
            dashboard_dict["remark_updated_at"] = dashboard.remark_updated_at.strftime("%Y-%m-%d %H:%M:%S") if dashboard.remark_updated_at else None
            dashboard_dict["remark_updated_by"] = dashboard.remark_updated_by
        else:
            dashboard_dict["formatted_remark"] = ""
            dashboard_dict["remark_updated_at"] = None
            dashboard_dict["remark_updated_by"] = None
        
        # 작성자 정보 추가
        dashboard_dict["created_by"] = dashboard.created_by if hasattr(dashboard, "created_by") else None
        
        return dashboard_dict

    def _convert_to_dict(self, obj):
        """SQLAlchemy 모델 객체를 딕셔너리로 변환"""
        if obj is None:
            return {}

        if hasattr(obj, "__table__"):
            # SQLAlchemy 모델인 경우
            result = {}
            for col in obj.__table__.columns:
                value = getattr(obj, col.name)
                if isinstance(value, datetime):
                    # datetime은 ISO 형식 문자열로 변환
                    value = value.isoformat() if value else None
                result[col.name] = value
            return result
        elif hasattr(obj, "model_dump"):
            # Pydantic 모델인 경우
            return obj.model_dump()
        else:
            # 기타 객체는 dict로 변환 시도
            return dict(obj)

    @transactional
    def update_dashboard_fields(
        self, dashboard_id: int, fields_update: FieldsUpdate, user_id: str
    ) -> Dict[str, Any]:
        """대시보드 필드 업데이트 (비관적 락 사용)"""
        # 1. 락 획득
        with self.lock_manager.acquire_lock(dashboard_id, user_id, "EDIT"):
            # 2. 필드 업데이트 데이터 준비
            update_data = fields_update.model_dump(exclude_unset=True)
            if not update_data:
                raise ValidationException(MESSAGES["VALIDATION"]["REQUIRED"].format(field="업데이트 데이터"))

            # 3. 우편번호 변경 시 관련 정보도 함께 업데이트
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

            # 4. 필드 업데이트
            dashboard = self.repository.update_dashboard_fields(
                dashboard_id, update_data
            )
            if not dashboard:
                raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

            # 5. 상세 정보 반환
            return self._prepare_dashboard_detail(dashboard)

    @transactional
    def update_status(
        self,
        dashboard_id: int,
        new_status: str,
        user_id: str,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        """상태 업데이트 (비관적 락 사용)"""
        # 1. 락 획득
        with self.lock_manager.acquire_lock(dashboard_id, user_id, "STATUS"):
            # 2. 대시보드 조회
            dashboard = self.repository.get_dashboard_detail(dashboard_id)
            if not dashboard:
                raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

            # 3. 상태 변경 유효성 검증
            current_status = dashboard.status

            # 관리자가 아니고, 상태 전이가 허용되지 않는 경우 검증
            if not is_admin:
                if current_status not in STATUS_TRANSITIONS:
                    raise ValidationException(
                        f"'{current_status}' 상태에서는 상태를 변경할 수 없습니다"
                    )

                if new_status not in STATUS_TRANSITIONS.get(current_status, []):
                    raise InvalidStatusTransitionException(current_status, new_status)

            # 4. 상태별 자동 시간 업데이트
            update_data = {"status": new_status}
            now = get_kst_now()

            # 출발 시간 (IN_PROGRESS로 변경 시)
            if new_status == "IN_PROGRESS" and not dashboard.depart_time:
                update_data["depart_time"] = now

            # 완료 시간 (COMPLETE나 ISSUE로 변경 시)
            if (
                new_status == "COMPLETE" or new_status == "ISSUE"
            ) and not dashboard.complete_time:
                update_data["complete_time"] = now

            # 5. 상태 업데이트
            dashboard = self.repository.update_dashboard_fields(
                dashboard_id, update_data
            )

            # 6. 상세 정보 반환
            return self._prepare_dashboard_detail(dashboard)

    @transactional
    def assign_driver(
        self, assignment: DriverAssignment, user_id: str
    ) -> List[Dict[str, Any]]:
        """배차 처리 (비관적 락 사용)"""
        dashboard_ids = assignment.dashboard_ids
        if not dashboard_ids:
            raise ValidationException("배차할 대시보드 ID가 없습니다")

        driver_name = assignment.driver_name
        driver_contact = assignment.driver_contact

        # 1. 여러 대시보드에 대한 락 획득 (ALL or NOTHING)
        with self.lock_manager.acquire_multiple_locks(dashboard_ids, user_id, "ASSIGN"):
            # 2. 배차 정보 업데이트
            updated_dashboards = self.repository.assign_driver(
                dashboard_ids, driver_name, driver_contact
            )

            # 3. 결과 변환 및 반환
            result = [
                self._convert_to_dict(dashboard) for dashboard in updated_dashboards
            ]

            return result

    @transactional
    def update_dashboard(
        self, dashboard_id: int, dashboard_update: DashboardUpdate, user_id: str
    ) -> Dict[str, Any]:
        """대시보드 통합 업데이트 (모든 필드 + 메모)
        
        관리자만 가능한 통합 업데이트 메서드입니다.
        """
        # 1. 대시보드 존재 여부 확인
        dashboard = self.repository.get_dashboard_by_id(dashboard_id)
        if not dashboard:
            raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])
        
        # 2. 락 획득
        with self.lock_manager.acquire_lock(dashboard_id, user_id, "UPDATE"):
            # 3. 업데이트할 필드 추출
            update_data = {}
            for field, value in dashboard_update.model_dump(exclude_unset=True).items():
                if value is not None:
                    update_data[field] = value
            
            # remark 필드가 업데이트되는 경우 관련 메타데이터도 업데이트
            if "remark" in update_data:
                update_data["remark_updated_at"] = get_kst_now()
                update_data["remark_updated_by"] = user_id
            
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
            
            # 4. 상세 정보 반환
            return self._prepare_dashboard_detail(dashboard)