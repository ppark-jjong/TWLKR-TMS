# teckwah_project/main/server/services/dashboard_service.py
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

from app.models.dashboard_model import Dashboard
from app.models.postal_code_model import PostalCode, PostalCodeDetail
from app.schemas.dashboard_schema import StatusUpdate, FieldsUpdate, DriverAssignment
from app.utils.datetime_helper import get_kst_now, localize_to_kst
from app.utils.logger import log_info, log_error
from app.utils.exceptions import PessimisticLockException, ValidationException, NotFoundException
from app.utils.transaction import transactional, transactional_with_retries
from app.utils.constants import STATUS_TRANSITIONS

class DashboardService:
    """대시보드 서비스"""

    def __init__(
        self,
        dashboard_repository,
        remark_repository,
        lock_repository,
        lock_manager,
        db=None,  
    ):
        self.dashboard_repository = dashboard_repository
        self.remark_repository = remark_repository
        self.lock_repository = lock_repository
        self.lock_manager = lock_manager
        self.db = getattr(dashboard_repository, 'db', None)  

    def get_dashboard_list_by_date(
        self, start_date: datetime, end_date: datetime
    ) -> List[Dict[str, Any]]:
        """ETA 기준으로 날짜 범위 내 대시보드 목록 조회"""
        dashboards = self.dashboard_repository.get_dashboard_list_by_date(
            start_date, end_date
        )
        return [self._convert_to_dict(dashboard) for dashboard in dashboards]

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 (ETA 기준)"""
        return self.dashboard_repository.get_date_range()

    def get_dashboard_with_status_check(self, dashboard_id: int) -> Dict[str, Any]:
        """대시보드 상세 정보 조회 (락 상태 포함)"""
        dashboard = self.dashboard_repository.get_dashboard_detail(dashboard_id)
        if not dashboard:
            raise NotFoundException(f"대시보드를 찾을 수 없습니다: ID={dashboard_id}")

        # 메모 조회
        remarks = self.remark_repository.get_remarks_by_dashboard_id(dashboard_id)

        # 락 상태 확인
        lock_info = self.lock_repository.get_lock_info(dashboard_id)
        is_locked = lock_info is not None and not lock_info.is_expired

        # 상세 정보 구성
        result = self._prepare_dashboard_detail(dashboard, remarks)

        # 락 정보 추가
        if is_locked:
            result["is_locked"] = True
            result["locked_by"] = lock_info.locked_by
            result["lock_type"] = lock_info.lock_type
            result["lock_expires_at"] = lock_info.expires_at.isoformat()
        else:
            result["is_locked"] = False

        return result

    @transactional
    def create_dashboard(
        self, dashboard_data: Any, department: str, user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """대시보드 생성 (빈 메모 자동 생성)"""
        try:
            # 1. 현재 시간 정보 설정 (KST)
            now = get_kst_now()

            # 2. 대시보드 데이터 준비
            dashboard_dict = dashboard_data.model_dump()
            dashboard_dict["create_time"] = now
            dashboard_dict["department"] = department
            dashboard_dict["status"] = "WAITING"

            # 3. 대시보드 생성
            dashboard = self.dashboard_repository.create_dashboard(dashboard_dict)
            if not dashboard:
                log_error(None, "대시보드 생성 실패")
                raise Exception("대시보드 생성에 실패했습니다")

            # 4. 빈 메모 자동 생성
            if user_id:
                remark = self.remark_repository.create_empty_remark(
                    dashboard.dashboard_id, user_id
                )
                remarks = [remark] if remark else []
            else:
                remarks = []

            # 5. 대시보드 상세 정보 반환
            result = self._prepare_dashboard_detail(dashboard, remarks)

            log_info(f"대시보드 생성 완료: ID={dashboard.dashboard_id}")
            return result

        except Exception as e:
            log_error(e, "대시보드 생성 실패")
            raise

    @transactional
    def delete_dashboards(self, dashboard_ids: List[int]) -> int:
        """대시보드 삭제 (관리자 전용)"""
        if not dashboard_ids:
            return 0
        return self.dashboard_repository.delete_dashboards(dashboard_ids)

    def search_dashboards_by_order_no(self, order_no: str) -> List[Dict[str, Any]]:
        """주문번호로 대시보드 검색"""
        dashboards = self.dashboard_repository.search_dashboards_by_order_no(order_no)
        return [self._convert_to_dict(dashboard) for dashboard in dashboards]

    def _prepare_dashboard_detail(self, dashboard, remarks=None):
        """대시보드 상세 정보 구성 (메모 포함)"""
        if remarks is None:
            remarks = self.remark_repository.get_remarks_by_dashboard_id(
                dashboard.dashboard_id
            )

        # 상세 정보에 메모 목록 포함
        dashboard_dict = self._convert_to_dict(dashboard)
        dashboard_dict["remarks"] = [self._convert_to_dict(r) for r in remarks]

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

    @transactional_with_retries(max_retries=3)
    def update_dashboard_fields(
        self, dashboard_id: int, fields_update: FieldsUpdate, user_id: str
    ) -> Dict[str, Any]:
        """대시보드 필드 업데이트 (비관적 락 사용)"""
        # 1. 락 획득
        with self.lock_manager.acquire_lock(dashboard_id, user_id, "EDIT", retry=True):
            # 2. 필드 업데이트 데이터 준비
            update_data = fields_update.model_dump(exclude_unset=True)
            if not update_data:
                raise ValidationException("업데이트할 데이터가 없습니다")

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
                    dashboard = self.dashboard_repository.get_dashboard_detail(dashboard_id)
                    if dashboard and ("warehouse" in update_data or dashboard.warehouse):
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
            dashboard = self.dashboard_repository.update_dashboard_fields(
                dashboard_id, update_data
            )
            if not dashboard:
                raise NotFoundException("대시보드를 찾을 수 없습니다")

            # 5. 상세 정보 반환 (메모 포함)
            remarks = self.remark_repository.get_remarks_by_dashboard_id(dashboard_id)
            return self._prepare_dashboard_detail(dashboard, remarks)

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
            dashboard = self.dashboard_repository.get_dashboard_detail(dashboard_id)
            if not dashboard:
                raise NotFoundException("대시보드를 찾을 수 없습니다")

            # 3. 상태 변경 유효성 검증
            current_status = dashboard.status
            
            # 관리자가 아니고, 상태 전이가 허용되지 않는 경우 검증
            if not is_admin:
                if current_status not in STATUS_TRANSITIONS:
                    raise ValidationException(f"'{current_status}' 상태에서는 상태를 변경할 수 없습니다")
                
                if new_status not in STATUS_TRANSITIONS.get(current_status, []):
                    raise ValidationException(
                        detail=f"'{current_status}' 상태에서 '{new_status}' 상태로 변경할 수 없습니다",
                        error_fields={"current_status": current_status, "new_status": new_status}
                    )

            # 4. 상태별 자동 시간 업데이트
            update_data = {"status": new_status}
            now = get_kst_now()

            # 출발 시간 (IN_PROGRESS로 변경 시)
            if new_status == "IN_PROGRESS" and not dashboard.depart_time:
                update_data["depart_time"] = now

            # 완료 시간 (COMPLETE나 ISSUE로 변경 시)
            if (new_status == "COMPLETE" or new_status == "ISSUE") and not dashboard.complete_time:
                update_data["complete_time"] = now

            # 5. 상태 업데이트
            dashboard = self.dashboard_repository.update_dashboard_fields(
                dashboard_id, update_data
            )

            # 6. 상세 정보 반환
            remarks = self.remark_repository.get_remarks_by_dashboard_id(dashboard_id)
            return self._prepare_dashboard_detail(dashboard, remarks)

    @transactional_with_retries(max_retries=3)
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
            updated_dashboards = self.dashboard_repository.assign_driver(
                dashboard_ids, driver_name, driver_contact
            )

            # 3. 결과 변환 및 반환
            result = [
                self._convert_to_dict(dashboard) for dashboard in updated_dashboards
            ]

            return result