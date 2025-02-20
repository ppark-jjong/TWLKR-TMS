# backend/app/services/dashboard_service.py
import pytz
from datetime import datetime
from typing import List, Tuple
from fastapi import HTTPException, status

from app.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardResponse,
    DashboardDetail,
    StatusUpdate,
    RemarkUpdate,
    DriverAssignment,
)
from app.repositories.dashboard_repository import DashboardRepository
from app.utils.logger import log_info, log_error


class DashboardService:
    def __init__(self, repository: DashboardRepository):
        self.repository = repository
        self.kr_timezone = pytz.timezone("Asia/Seoul")
        self.allowed_status_transitions = {
            "WAITING": ["IN_PROGRESS", "CANCEL"],
            "IN_PROGRESS": ["COMPLETE", "ISSUE", "CANCEL"],
            "COMPLETE": [],  # 완료 상태에서는 변경 불가
            "ISSUE": [],  # 이슈 상태에서는 변경 불가
            "CANCEL": [],  # 취소 상태에서는 변경 불가
        }

    def validate_status_transition(self, current_status: str, new_status: str) -> bool:
        """상태 변경 가능 여부 검증"""
        allowed_transitions = self.allowed_status_transitions.get(current_status, [])
        return new_status in allowed_transitions

    def get_dashboard_list_by_date(
        self, target_date: datetime
    ) -> List[DashboardResponse]:
        """날짜별 대시보드 조회 (일반 사용자용)"""
        try:
            log_info(f"대시보드 목록 조회 시작: {target_date}")
            dashboards = self.repository.get_dashboards_by_date(target_date)

            if not dashboards:
                log_info("조회된 데이터가 없습니다")
                return []

            result = [DashboardResponse.model_validate(d) for d in dashboards]
            log_info(f"대시보드 목록 조회 완료: {len(result)}건")
            return result

        except Exception as e:
            log_error(e, "대시보드 목록 조회 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 목록 조회 중 오류가 발생했습니다",
            )

    def get_dashboard_list_by_date_range(
        self, start_date: datetime, end_date: datetime
    ) -> List[DashboardResponse]:
        """날짜 범위별 대시보드 조회 (관리자용)"""
        try:
            log_info(f"대시보드 목록 조회 시작: {start_date} ~ {end_date}")
            dashboards = self.repository.get_dashboards_by_date_range(
                start_date, end_date
            )

            if not dashboards:
                log_info("조회된 데이터가 없습니다")
                return []

            result = [DashboardResponse.model_validate(d) for d in dashboards]
            log_info(f"대시보드 목록 조회 완료: {len(result)}건")
            return result

        except Exception as e:
            log_error(e, "대시보드 목록 조회 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 목록 조회 중 오류가 발생했습니다",
            )

    def get_dashboard_detail(self, dashboard_id: int) -> DashboardDetail:
        """대시보드 상세 정보 조회"""
        try:
            log_info(f"대시보드 상세 조회 시작: {dashboard_id}")
            dashboard = self.repository.get_dashboard_detail(dashboard_id)

            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다",
                )

            log_info("대시보드 상세 조회 완료")
            return DashboardDetail.model_validate(dashboard)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 상세 조회 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 상세 조회 중 오류가 발생했습니다",
            )

    def create_dashboard(
        self, data: DashboardCreate, user_department: str
    ) -> DashboardResponse:
        try:
            log_info(
                "대시보드 생성 시작", {"type": data.type, "order_no": data.order_no}
            )

            # 우편번호 데이터 조회
            postal_data = self.repository.get_postal_code_data(data.postal_code)

            # 우편번호 데이터가 없거나 선택한 창고에 대한 거리 정보가 없는 경우
            if not postal_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"유효하지 않은 우편번호입니다: {data.postal_code}",
                )

            # 선택한 창고와 우편번호의 창고가 일치하지 않는 경우
            if postal_data.depart_hub != data.warehouse:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"선택한 창고({data.warehouse})에서 해당 우편번호로의 배송 거리 정보가 없습니다",
                )

            # 대시보드 데이터 준비
            dashboard_data = data.dict()
            dashboard_data["department"] = user_department
            dashboard_data.update(
                {
                    "city": postal_data.city or "",
                    "district": postal_data.district or "",
                    "distance": postal_data.distance or 0,
                    "duration_time": postal_data.duration_time or 0,
                }
            )

            dashboard = self.repository.create_dashboard(dashboard_data)
            log_info(f"대시보드 생성 완료: {dashboard.dashboard_id}")
            return DashboardResponse.model_validate(dashboard)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 생성 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 생성 중 오류가 발생했습니다",
            )

    def update_status(
        self, dashboard_id: int, status_update: StatusUpdate, is_admin: bool = False
    ) -> DashboardDetail:
        """상태 업데이트"""
        try:
            log_info(f"상태 업데이트 시작: {dashboard_id} -> {status_update.status}")

            # 현재 대시보드 조회
            dashboard = self.repository.get_dashboard_detail(dashboard_id)
            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다",
                )

            # 관리자가 아닌 경우 추가 검증
            if not is_admin:
                # 배차 담당자 할당 여부 확인
                if not dashboard.driver_name or not dashboard.driver_contact:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="배차 담당자가 할당되지 않아 상태를 변경할 수 없습니다",
                    )

                # 상태 변경 가능 여부 검증
                if not self.validate_status_transition(
                    dashboard.status, status_update.status
                ):
                    status_text_map = {
                        "WAITING": "대기",
                        "IN_PROGRESS": "진행",
                        "COMPLETE": "완료",
                        "ISSUE": "이슈",
                        "CANCEL": "취소",
                    }
                    current_status_text = status_text_map.get(dashboard.status)
                    new_status_text = status_text_map.get(status_update.status)

                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"{current_status_text} 상태에서는 {new_status_text}(으)로 변경할 수 없습니다",
                    )

            # KST 시간대로 현재 시간 설정
            current_time = datetime.now(self.kr_timezone)

            # 상태 업데이트 수행
            updated_dashboard = self.repository.update_dashboard_status(
                dashboard_id, status_update.status, current_time
            )

            log_info("상태 업데이트 완료")
            return DashboardDetail.model_validate(updated_dashboard)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "상태 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="상태 업데이트 중 오류가 발생했습니다",
            )

    def update_remark(
        self, dashboard_id: int, remark_update: RemarkUpdate
    ) -> DashboardDetail:
        """메모 업데이트"""
        try:
            log_info(f"메모 업데이트 시작: {dashboard_id}")
            dashboard = self.repository.update_dashboard_remark(
                dashboard_id, remark_update.remark
            )

            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다",
                )

            log_info("메모 업데이트 완료")
            return DashboardDetail.model_validate(dashboard)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "메모 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="메모 업데이트 중 오류가 발생했습니다",
            )

    def assign_driver(self, assignment: DriverAssignment) -> List[DashboardResponse]:
        try:
            log_info("배차 처리 시작", {"dashboard_ids": assignment.dashboard_ids})

            # 대기 상태 검증
            dashboards = self.repository.get_dashboards_by_ids(assignment.dashboard_ids)
            invalid_dashboards = []
            for dash in dashboards:
                if dash.status != "WAITING":
                    invalid_dashboards.append(
                        f"주문번호 {dash.order_no}: 대기 상태가 아님"
                    )

            if invalid_dashboards:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"배차할 수 없는 주문이 있습니다:\n"
                    + "\n".join(invalid_dashboards),
                )

            # 배차 정보 업데이트
            updated_dashboards = self.repository.assign_driver(
                assignment.dashboard_ids,
                assignment.driver_name,
                assignment.driver_contact,
            )

            if len(updated_dashboards) != len(assignment.dashboard_ids):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="일부 배차가 실패했습니다",
                )

            log_info("배차 처리 완료", {"count": len(updated_dashboards)})
            return [DashboardResponse.model_validate(d) for d in updated_dashboards]

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "배차 처리 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="배차 처리 중 오류가 발생했습니다",
            )

    def delete_dashboards(self, dashboard_ids: List[int]) -> bool:
        """대시보드 삭제"""
        try:
            log_info("대시보드 삭제 시작", {"dashboard_ids": dashboard_ids})
            success = self.repository.delete_dashboards(dashboard_ids)

            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="삭제 처리에 실패했습니다",
                )

            log_info("대시보드 삭제 완료", {"count": len(dashboard_ids)})
            return True

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 삭제 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 삭제 중 오류가 발생했습니다",
            )

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회"""
        try:
            return self.repository.get_date_range()
        except Exception as e:
            log_error(e, "날짜 범위 조회 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="날짜 범위 조회 중 오류가 발생했습니다",
            )
