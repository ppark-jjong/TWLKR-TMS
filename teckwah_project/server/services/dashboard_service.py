# teckwah_project/server/services/dashboard_service.py
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

from server.models.dashboard_model import Dashboard
from server.models.postal_code_model import PostalCode, PostalCodeDetail
from server.schemas.dashboard_schema import (
    StatusUpdate,
    DriverAssignment,
    DashboardUpdate,
)
from server.utils.datetime import get_kst_now
from server.utils.logger import log_info, log_error
from server.utils.error import (
    LockConflictException,
    ValidationException,
    NotFoundException,
    ForbiddenException,
)
from server.utils.transaction import transactional, transaction
from server.utils.constants import STATUS_TRANSITIONS, MESSAGES
from server.config.settings import get_settings

settings = get_settings()


class DashboardService:
    """대시보드 서비스"""

    def __init__(self, repository, db):
        """서비스 초기화"""
        self.repository = repository
        self.db = db

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

            # update_at 필드를 명시적으로 설정
            dashboard_data["update_at"] = get_kst_now()

            # 대시보드 생성
            dashboard = self.repository.create_dashboard(dashboard_data)
            if not dashboard:
                raise Exception("대시보드 생성 실패")

            # 응답 데이터 생성
            return self._prepare_dashboard_detail(dashboard)
        except Exception as e:
            log_error(f"대시보드 생성 실패: {str(e)}")
            raise

    @transactional
    def get_dashboard_list(self, filters=None) -> List[Dict[str, Any]]:
        """대시보드 목록 조회 (필터링 가능)"""
        dashboards = self.repository.get_dashboard_list_by_date(
            filters.get("start_date", get_kst_now()),
            filters.get("end_date", get_kst_now()),
        )
        return [self._convert_to_dict(dashboard) for dashboard in dashboards]

    def get_dashboard_detail(self, dashboard_id: int) -> Dict[str, Any]:
        """대시보드 상세 정보 조회"""
        dashboard = self.repository.get_dashboard_detail(dashboard_id)
        if not dashboard:
            raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

        return self._prepare_dashboard_detail(dashboard)

    @transactional
    def delete_dashboards(self, dashboard_ids: List[int], user_id: str) -> int:
        """대시보드 삭제 (관리자 전용, 행 단위 락 사용)"""
        if not dashboard_ids:
            return 0
        try:
            # 행 단위 락을 사용하여 repository에서 처리
            result = self.repository.delete_dashboards(dashboard_ids, user_id)
            return result
        except Exception as e:
            log_error(f"대시보드 삭제 실패: {str(e)}")
            raise

    def search_dashboards_by_order_no(self, order_no: str) -> List[Dict[str, Any]]:
        """주문번호로 대시보드 검색"""
        dashboards = self.repository.search_dashboards_by_order_no(order_no)
        return [self._convert_to_dict(dashboard) for dashboard in dashboards]

    @transactional
    def update_dashboard_status(
        self, dashboard_id: int, status_update: StatusUpdate, user_id: str
    ) -> Dict[str, Any]:
        """대시보드 상태 업데이트 (행 단위 락 사용)"""
        try:
            new_status = status_update.status
            is_admin = status_update.is_admin

            # 행 단위 락을 적용한 대시보드 조회
            dashboard = self.repository.get_dashboard_with_lock(dashboard_id, user_id)

            if not dashboard:
                raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

            # 상태 전이 유효성 검증 (관리자는 모든 상태 변경 가능)
            current_status = dashboard.status
            if not is_admin:
                if new_status not in STATUS_TRANSITIONS.get(current_status, []):
                    raise ValidationException(
                        f"'{current_status}'에서 '{new_status}'로 상태를 변경할 수 없습니다"
                    )

            # 상태별 시간 자동 업데이트
            dashboard.status = new_status
            dashboard.updated_by = user_id
            now = get_kst_now()
            dashboard.update_at = now

            # 출발 시간 (IN_PROGRESS로 변경 시)
            if new_status == "IN_PROGRESS" and not dashboard.depart_time:
                dashboard.depart_time = now

            # 완료 시간 (COMPLETE 또는 ISSUE로 변경 시)
            if (
                new_status == "COMPLETE" or new_status == "ISSUE"
            ) and not dashboard.complete_time:
                dashboard.complete_time = now

            # DB에 변경사항 반영
            self.db.flush()

            return dashboard
        except Exception as e:
            log_error(f"대시보드 상태 업데이트 실패: {str(e)}")
            raise

    @transactional
    def update_dashboard_fields(
        self, dashboard_id: int, fields_update: DashboardUpdate, user_id: str
    ) -> Dict[str, Any]:
        """대시보드 필드 업데이트 (행 수준 락 사용)"""
        try:
            # 행 단위 락이 적용된 대시보드 조회
            dashboard = self.repository.get_dashboard_with_lock(dashboard_id, user_id)

            if not dashboard:
                raise NotFoundException(
                    f"ID가 {dashboard_id}인 대시보드를 찾을 수 없습니다"
                )

            # 업데이트 필드 적용
            update_dict = fields_update.model_dump(exclude_unset=True)
            for key, value in update_dict.items():
                setattr(dashboard, key, value)

            # 업데이트 정보 갱신
            dashboard.updated_by = user_id
            dashboard.update_at = get_kst_now()

            # DB에 변경사항 반영
            self.db.flush()

            # 업데이트된 대시보드 상세 정보 반환
            return dashboard
        except Exception as e:
            log_error(f"대시보드 필드 업데이트 실패: {str(e)}")
            raise

    @transactional
    def assign_driver(
        self,
        dashboard_ids: List[int],
        driver_assignment: DriverAssignment,
        user_id: str,
    ) -> List[Dashboard]:
        """여러 대시보드에 기사 배정 (행 수준 락 사용)"""
        try:
            updated_dashboards = []
            now = get_kst_now()

            # 각 대시보드에 대해 락 획득 후 개별 업데이트
            for dashboard_id in dashboard_ids:
                dashboard = self.repository.get_dashboard_with_lock(
                    dashboard_id, user_id
                )

                if not dashboard:
                    # 하나라도 실패하면 롤백
                    raise NotFoundException(
                        f"ID가 {dashboard_id}인 대시보드를 찾을 수 없습니다"
                    )

                # 기사 정보 업데이트
                dashboard.driver_name = driver_assignment.driver_name
                dashboard.driver_contact = driver_assignment.driver_contact
                dashboard.updated_by = user_id
                dashboard.update_at = now

                updated_dashboards.append(dashboard)

            # 모든 대시보드 업데이트 적용
            self.db.flush()

            # 업데이트된 대시보드 목록 반환
            return updated_dashboards
        except Exception as e:
            log_error(f"기사 배정 실패: {str(e)}")
            raise

    @transactional
    def update_dashboard(
        self, dashboard_id: int, dashboard_update: DashboardUpdate, user_id: str
    ) -> Dict[str, Any]:
        """대시보드 종합 업데이트 (행 수준 락 사용)"""
        try:
            # 업데이트 데이터 준비
            update_data = dashboard_update.model_dump(exclude_unset=True)
            if not update_data:
                raise ValidationException(
                    MESSAGES["VALIDATION"]["REQUIRED"].format(field="업데이트 데이터")
                )

            # 대시보드 락 획득
            dashboard = self.repository.get_dashboard_with_lock(dashboard_id, user_id)
            if not dashboard:
                raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

            # 상태 변경이 포함된 경우 유효성 검증
            if "status" in update_data:
                new_status = update_data["status"]
                current_status = dashboard.status

                # 관리자가 아닌 경우, 상태 전이 규칙 적용
                if dashboard_update.is_admin is not True:
                    if new_status not in STATUS_TRANSITIONS.get(current_status, []):
                        raise ValidationException(
                            f"'{current_status}'에서 '{new_status}'로 상태를 변경할 수 없습니다"
                        )

                # 상태별 시간 자동 업데이트
                now = get_kst_now()
                if new_status == "IN_PROGRESS" and not dashboard.depart_time:
                    update_data["depart_time"] = now

                if (
                    new_status == "COMPLETE" or new_status == "ISSUE"
                ) and not dashboard.complete_time:
                    update_data["complete_time"] = now

            # 우편번호 변경 시 관련 정보 업데이트
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

                    # 창고 정보 확인
                    warehouse = update_data.get("warehouse", dashboard.warehouse)
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

            # 대시보드 업데이트
            for key, value in update_data.items():
                setattr(dashboard, key, value)

            # 업데이트 정보 갱신
            dashboard.updated_by = user_id
            dashboard.update_at = get_kst_now()
            self.db.flush()

            return self._prepare_dashboard_detail(dashboard)
        except LockConflictException:
            # 락 충돌 예외 그대로 전파
            raise
        except Exception as e:
            log_error(f"대시보드 업데이트 실패: {str(e)}")
            raise
