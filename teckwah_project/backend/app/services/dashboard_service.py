# backend/app/services/dashboard_service.py
from datetime import datetime
from typing import List
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
from app.models.dashboard_model import Dashboard


class DashboardService:
    def __init__(self, repository: DashboardRepository):
        self.repository = repository

    def get_dashboard_list(self, target_date: datetime) -> List[DashboardResponse]:
        """날짜별 대시보드 조회"""
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

    def create_dashboard(
        self, data: DashboardCreate, user_department: str
    ) -> DashboardResponse:
        try:
            log_info(
                "대시보드 생성 시작",
                {
                    "department": user_department,
                    "type": data.type,
                    "order_no": data.order_no,
                    "postal_code": data.postal_code,
                },
            )

            # 우편번호 데이터 조회
            postal_data = self.repository.get_postal_code_data(data.postal_code)

            # 우편번호 데이터 없을 경우 예외 처리
            if postal_data is None:
                log_error(None, f"우편번호 데이터 없음: {data.postal_code}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"유효하지 않은 우편번호입니다: {data.postal_code}",
                )

            # 대시보드 데이터 준비
            dashboard_data = data.dict()
            dashboard_data["department"] = user_department

            # 우편번호 관련 데이터 명시적 설정
            dashboard_data["city"] = postal_data.city or ""
            dashboard_data["district"] = postal_data.district or ""
            dashboard_data["distance"] = postal_data.distance or 0
            dashboard_data["duration_time"] = postal_data.duration_time or 0

            log_info(
                "대시보드 생성 데이터",
                {
                    "dashboard_data": dashboard_data,
                    "postal_data": {
                        "city": postal_data.city,
                        "district": postal_data.district,
                        "distance": postal_data.distance,
                        "duration_time": postal_data.duration_time,
                    },
                },
            )

            # 대시보드 생성
            dashboard = self.repository.create_dashboard(dashboard_data)

            log_info(f"대시보드 생성 완료: {dashboard.dashboard_id}")
            return DashboardResponse.model_validate(dashboard)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 생성 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"대시보드 생성 중 오류가 발생했습니다: {str(e)}",
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

    def update_status(
        self, dashboard_id: int, status_update: StatusUpdate
    ) -> DashboardDetail:
        """상태 업데이트"""
        try:
            log_info(f"상태 업데이트 시작: {dashboard_id} -> {status_update.status}")
            current_time = datetime.now()

            dashboard = self.repository.update_dashboard_status(
                dashboard_id, status_update.status, current_time
            )

            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다",
                )

            log_info("상태 업데이트 완료")
            return DashboardDetail.model_validate(dashboard)

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

            # 배차 정보 업데이트 (status 변경 제외)
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
            # 대기 상태 검증
            dashboards = self.repository.get_dashboards_by_ids(dashboard_ids)
            non_waiting = [d for d in dashboards if d.status != "WAITING"]

            if non_waiting:
                order_nos = [d.order_no for d in non_waiting]
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"다음 주문은 대기 상태가 아니어서 삭제할 수 없습니다: {', '.join(map(str, order_nos))}",
                )

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
