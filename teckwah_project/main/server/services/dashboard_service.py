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

        # 메모 조회
        remarks = self.repository.get_remarks_by_dashboard_id(dashboard_id)

        # 락 상태 확인 (LockManager 사용)
        lock_status = self.lock_manager.get_lock_status(dashboard_id)
        is_locked = lock_status.get("is_locked", False)

        # 상세 정보 구성
        result = self._prepare_dashboard_detail(dashboard, remarks)

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
        
        # 4. 대시보드 생성
        dashboard = self.repository.create_dashboard(dashboard_dict)
        
        # 5. 초기 메모 생성 (입력된 경우)
        remark_content = dashboard_data.remark
        if remark_content and user_id:
            self.repository.create_remark(dashboard.dashboard_id, remark_content, user_id)
        
        # 6. 생성된 대시보드 정보 반환
        # 메모 조회
        remarks = self.repository.get_remarks_by_dashboard_id(dashboard.dashboard_id)
        return self._prepare_dashboard_detail(dashboard, remarks)

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
        
        # 메모 정보 추가
        if remarks is None:
            remarks = self.repository.get_remarks_by_dashboard_id(dashboard.dashboard_id)
        
        remarks_list = []
        for remark in remarks:
            remarks_list.append({
                "remark_id": remark.remark_id,
                "content": remark.content or "",
                "created_at": remark.created_at.strftime("%Y-%m-%d %H:%M:%S") if remark.created_at else None,
                "created_by": remark.created_by,
                "formatted_content": remark.formatted_content or remark.content or "",
            })
        
        # 작성자 정보 추가
        dashboard_dict["created_by"] = dashboard.created_by if hasattr(dashboard, "created_by") else None
        
        # 상세 정보에 메모 추가
        dashboard_dict["remarks"] = remarks_list
        
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

            # 5. 상세 정보 반환 (메모 포함)
            remarks = self.repository.get_remarks_by_dashboard_id(dashboard_id)
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
            remarks = self.repository.get_remarks_by_dashboard_id(dashboard_id)
            return self._prepare_dashboard_detail(dashboard, remarks)

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
    def update_remark(
        self, remark_id: int, remark_update: RemarkUpdate, user_id: str
    ) -> Dict[str, Any]:
        """메모 업데이트 (비관적 락 사용)"""
        # 1. 메모 조회
        remark = self.repository.get_remark_by_id(remark_id)
        if not remark:
            raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

        # 작성자 확인
        if remark.created_by != user_id:
            raise ValidationException("메모 수정 권한이 없습니다")

        # 2. 락 획득
        with self.lock_manager.acquire_lock(remark.dashboard_id, user_id, "REMARK"):
            # 3. 메모 업데이트
            content = remark_update.content
            updated_remark = self.repository.update_remark(remark_id, content, user_id)
            if not updated_remark:
                raise Exception("메모 업데이트에 실패했습니다")

            # 4. 응답 구성
            return self._build_remark_response(updated_remark)

    @transactional
    def get_remarks_by_dashboard_id(self, dashboard_id: int) -> List[Dict[str, Any]]:
        """대시보드별 메모 목록 조회 (최신순)"""
        remarks = self.repository.get_remarks_by_dashboard_id(dashboard_id)
        return [self._build_remark_response(remark) for remark in remarks]

    def _build_remark_response(self, remark) -> Dict[str, Any]:
        """메모 응답 객체 구성"""
        return {
            "success": True,
            "message": "메모가 처리되었습니다",
            "data": {
                "remark_id": remark.remark_id,
                "dashboard_id": remark.dashboard_id,
                "content": remark.content or "",
                "created_at": (
                    remark.created_at.isoformat() if remark.created_at else None
                ),
                "created_by": remark.created_by,
                "formatted_content": remark.content or "",
            },
        }

    @transactional
    def update_dashboard(
        self, dashboard_id: int, dashboard_update: DashboardUpdate, user_id: str
    ) -> Dict[str, Any]:
        """대시보드 통합 업데이트 (필드 + 메모)
        
        관리자만 가능한 통합 업데이트 메서드입니다.
        """
        # 1. 대시보드 존재 여부 확인
        dashboard = self.repository.get_dashboard_by_id(dashboard_id)
        if not dashboard:
            raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])
        
        # 2. 락 획득
        with self.lock_manager.acquire_lock(dashboard_id, user_id, "UPDATE"):
            # 3. 업데이트할 필드만 추출
            update_data = {}
            if dashboard_update.eta is not None:
                update_data["eta"] = dashboard_update.eta
            if dashboard_update.postal_code is not None:
                update_data["postal_code"] = dashboard_update.postal_code
            if dashboard_update.address is not None:
                update_data["address"] = dashboard_update.address
            if dashboard_update.customer is not None:
                update_data["customer"] = dashboard_update.customer
            if dashboard_update.contact is not None:
                update_data["contact"] = dashboard_update.contact
            
            # 필드 업데이트가 있는 경우
            if update_data:
                dashboard = self.repository.update_dashboard_fields(
                    dashboard_id, update_data
                )
            
            # 4. 메모 업데이트가 있는 경우
            if dashboard_update.remark_content is not None:
                # 새 메모 생성
                self.repository.create_remark(
                    dashboard_id, 
                    dashboard_update.remark_content, 
                    user_id
                )
            
            # 5. 상세 정보 반환
            remarks = self.repository.get_remarks_by_dashboard_id(dashboard_id)
            return self._prepare_dashboard_detail(dashboard, remarks)