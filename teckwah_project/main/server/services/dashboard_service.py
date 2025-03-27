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
            dashboard = self.repository.create_dashboard(dashboard_dict)
            if not dashboard:
                log_error(None, "대시보드 생성 실패")
                raise Exception(MESSAGES["DASHBOARD"]["CREATE_ERROR"])

            # 4. 빈 메모 자동 생성
            if user_id:
                remark = self.repository.create_empty_remark(
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
        return self.repository.delete_dashboards(dashboard_ids)

    @transactional
    def search_dashboards_by_order_no(self, order_no: str) -> List[Dict[str, Any]]:
        """주문번호로 대시보드 검색"""
        dashboards = self.repository.search_dashboards_by_order_no(order_no)
        return [self._convert_to_dict(dashboard) for dashboard in dashboards]

    def _prepare_dashboard_detail(self, dashboard, remarks=None):
        """대시보드 상세 정보 구성 (메모 포함)"""
        if remarks is None:
            remarks = self.repository.get_remarks_by_dashboard_id(
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

    @transactional
    def update_dashboard(
        self, dashboard_id: int, update_data: Any, user_id: str, is_admin: bool = False
    ) -> Dict[str, Any]:
        """대시보드 통합 업데이트 (필드와 메모 함께 업데이트)"""
        # 1. 관리자 권한 체크 - 관리자만 수정 가능
        if not is_admin:
            raise UnauthorizedException("관리자만 대시보드를 수정할 수 있습니다")
            
        # 2. 대시보드 조회
        dashboard = self.repository.get_dashboard_detail(dashboard_id)
        if not dashboard:
            raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])
            
        # 3. 비관적 락 획득
        with self.lock_manager.acquire_lock(dashboard_id, user_id, "EDIT"):
            # 4. 업데이트할 필드 데이터 추출
            fields_data = update_data.model_dump(exclude={"remark_content"}, exclude_unset=True)
            remark_content = update_data.remark_content
            
            # 필드 데이터가 없고 메모 내용도 없으면 오류
            if not fields_data and remark_content is None:
                raise ValidationException(MESSAGES["VALIDATION"]["REQUIRED"].format(field="업데이트 데이터"))
            
            updated_dashboard = None
            
            # 5. 필드 데이터가 있으면 업데이트
            if fields_data:
                # 우편번호 변경 시 관련 정보도 함께 업데이트
                if "postal_code" in fields_data:
                    postal_code = fields_data["postal_code"]
                    postal_info = (
                        self.db.query(PostalCode)
                        .filter(PostalCode.postal_code == postal_code)
                        .first()
                    )

                    if postal_info:
                        fields_data["city"] = postal_info.city
                        fields_data["county"] = postal_info.county
                        fields_data["district"] = postal_info.district

                        # 창고 정보가 있으면 거리, 소요시간 정보도 업데이트
                        if "warehouse" in fields_data or dashboard.warehouse:
                            warehouse = fields_data.get("warehouse") or dashboard.warehouse
                            detail_info = (
                                self.db.query(PostalCodeDetail)
                                .filter(
                                    PostalCodeDetail.postal_code == postal_code,
                                    PostalCodeDetail.warehouse == warehouse,
                                )
                                .first()
                            )

                            if detail_info:
                                fields_data["distance"] = detail_info.distance
                                fields_data["duration_time"] = detail_info.duration_time

                # 필드 업데이트 수행
                updated_dashboard = self.repository.update_dashboard_fields(
                    dashboard_id, fields_data
                )
                if not updated_dashboard:
                    raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])
            else:
                # 필드 데이터가 없으면 기존 대시보드 사용
                updated_dashboard = dashboard
                
            # 6. 메모 내용이 있으면 메모 업데이트
            if remark_content is not None:
                # 가장 최근 메모 가져오기
                remarks = self.repository.get_remarks_by_dashboard_id(dashboard_id)
                if remarks:
                    # 기존 메모가 있으면 첫 번째(최신) 메모 업데이트
                    remark = remarks[0]
                    self.repository.update_remark(remark.remark_id, remark_content, user_id)
                else:
                    # 메모가 없으면 새 메모 생성
                    self.repository.create_empty_remark(dashboard_id, user_id)
                    
            # 7. 최신 메모 포함하여 상세 정보 조회 및 반환
            remarks = self.repository.get_remarks_by_dashboard_id(dashboard_id)
            return self._prepare_dashboard_detail(updated_dashboard, remarks)

    # 상태 업데이트 메소드에 관리자 권한 강화
    @transactional
    def update_status(
        self,
        dashboard_id: int,
        new_status: str,
        user_id: str,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        """상태 업데이트 (비관적 락 사용)"""
        # 비관적 락 획득
        with self.lock_manager.acquire_lock(dashboard_id, user_id, "STATUS"):
            # 대시보드 조회
            dashboard = self.repository.get_dashboard_detail(dashboard_id)
            if not dashboard:
                raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

            # 상태 변경 유효성 검증
            current_status = dashboard.status

            # 관리자가 아니면 상태 전이 제한 검증
            if not is_admin:
                if current_status not in STATUS_TRANSITIONS:
                    raise ValidationException(
                        f"'{current_status}' 상태에서는 상태를 변경할 수 없습니다"
                    )

                if new_status not in STATUS_TRANSITIONS.get(current_status, []):
                    raise InvalidStatusTransitionException(current_status, new_status)

            # 상태별 자동 시간 업데이트
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

            # 상태 업데이트
            dashboard = self.repository.update_dashboard_fields(
                dashboard_id, update_data
            )

            # 상세 정보 반환
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