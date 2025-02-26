# backend/app/services/dashboard_service.py
import re
import pytz
from datetime import datetime, timezone, timedelta
from typing import List, Tuple, Optional
from fastapi import HTTPException, status
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardResponse,
    DashboardDetail,
    DriverAssignment,
)
from app.utils.datetime_helper import KST, get_date_range_from_datetime
from app.utils.constants import MESSAGES
from app.utils.logger import log_info, log_error


class DashboardService:
    def __init__(self, repository: DashboardRepository):
        self.repository = repository
        self.kr_timezone = pytz.timezone("Asia/Seoul")

    def get_dashboard_list_by_date(
        self, start_date: datetime, end_date: datetime, is_admin: bool = False
    ) -> List[DashboardResponse]:
        """날짜별 대시보드 조회 (ETA 기준)"""
        try:
            log_info(f"대시보드 목록 조회 시작: {start_date} ~ {end_date}")
            # ETA 기준으로 데이터 조회
            dashboards = self.repository.get_dashboards_by_date_range(
                start_date, end_date
            )
            log_info(f"대시보드 목록 조회 완료: {len(dashboards)}건")

            # 응답 객체로 변환
            return [DashboardResponse.model_validate(d) for d in dashboards]
        except Exception as e:
            log_error(e, "대시보드 목록 조회 실패")
            raise

    def get_dashboard_detail(self, dashboard_id: int) -> DashboardDetail:
        """대시보드 상세 정보 조회"""
        try:
            dashboard = self.repository.get_dashboard_detail(dashboard_id)
            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다",
                )
            return DashboardDetail.model_validate(dashboard)
        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 상세 조회 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="상세 정보 조회 중 오류가 발생했습니다",
            )

    def create_dashboard(
        self, data: DashboardCreate, department: str
    ) -> DashboardDetail:
        """대시보드 생성"""
        try:
            # 우편번호 형식 검증 (5자리 숫자)
            if not data.postal_code.isdigit() or len(data.postal_code) != 5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"유효하지 않은 우편번호입니다: {data.postal_code}",
                )

            # 연락처 형식 검증
            if data.contact and not bool(
                re.match(r"^\d{2,3}-\d{3,4}-\d{4}$", data.contact)
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="올바른 연락처 형식이 아닙니다",
                )

            # ETA가 현재 시간 이후인지 검증
            eta_kst = data.eta.astimezone(self.kr_timezone)
            if eta_kst <= datetime.now(self.kr_timezone):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ETA는 현재 시간 이후여야 합니다",
                )

            # 대시보드 데이터 준비 및 생성
            dashboard_data = data.model_dump()
            dashboard_data["department"] = department
            dashboard_data["eta"] = eta_kst

            dashboard = self.repository.create_dashboard(dashboard_data)
            log_info(f"대시보드 생성 완료: {dashboard.dashboard_id}")
            return DashboardDetail.model_validate(dashboard)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 생성 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 생성 중 오류가 발생했습니다",
            )

    def update_status(
        self, dashboard_id: int, status: str, is_admin: bool = False
    ) -> DashboardDetail:
        """상태 업데이트"""
        try:
            # 대시보드 조회
            dashboard = self.repository.get_dashboard_detail(dashboard_id)
            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다",
                )

            # 일반 사용자의 상태 변경 규칙 검증
            if not is_admin:
                # 배차 정보 확인
                if not dashboard.driver_name or not dashboard.driver_contact:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="배차 담당자가 할당되지 않아 상태를 변경할 수 없습니다",
                    )

                # 상태 변경 규칙 검증
                allowed_transitions = {
                    "WAITING": ["IN_PROGRESS", "CANCEL"],
                    "IN_PROGRESS": ["COMPLETE", "ISSUE", "CANCEL"],
                    "COMPLETE": [],
                    "ISSUE": [],
                    "CANCEL": [],
                }

                if status not in allowed_transitions.get(dashboard.status, []):
                    status_text_map = {
                        "WAITING": "대기",
                        "IN_PROGRESS": "진행",
                        "COMPLETE": "완료",
                        "ISSUE": "이슈",
                        "CANCEL": "취소",
                    }
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"{status_text_map[dashboard.status]} 상태에서는 "
                        f"{status_text_map[status]}(으)로 변경할 수 없습니다",
                    )

            # 현재 시간 (KST)
            current_time = datetime.now(self.kr_timezone)

            # 상태 업데이트
            updated = self.repository.update_dashboard_status(
                dashboard_id, status, current_time
            )

            return DashboardDetail.model_validate(updated)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "상태 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=MESSAGES["DASHBOARD"]["STATUS_UPDATE_ERROR"],
            )

    def update_remark(self, dashboard_id: int, remark: str) -> DashboardDetail:
        """메모 업데이트"""
        try:
            # 대시보드 조회
            dashboard = self.repository.get_dashboard_detail(dashboard_id)
            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다",
                )

            # 메모 길이 검증
            if len(remark) > 2000:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="메모는 2000자를 초과할 수 없습니다",
                )

            # 메모 업데이트
            updated = self.repository.update_dashboard_remark(dashboard_id, remark)
            return DashboardDetail.model_validate(updated)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "메모 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="메모 업데이트 중 오류가 발생했습니다",
            )

    def assign_driver(self, assignment: DriverAssignment) -> List[DashboardResponse]:
        """배차 처리"""
        try:
            log_info("배차 처리 시작", {"dashboard_ids": assignment.dashboard_ids})

            # 대기 상태 검증
            dashboards = self.repository.get_dashboards_by_ids(assignment.dashboard_ids)
            invalid_dashboards = []
            for dash in dashboards:
                if dash.status != "WAITING":
                    invalid_dashboards.append(dash.order_no)

            if invalid_dashboards:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"대기 상태가 아니어서 처리할 수 없습니다: {', '.join(map(str, invalid_dashboards))}",
                )

            # 연락처 형식 검증
            if not bool(
                re.match(r"^\d{2,3}-\d{3,4}-\d{4}$", assignment.driver_contact)
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="올바른 연락처 형식이 아닙니다",
                )

            # 배차 정보 업데이트
            updated_dashboards = self.repository.assign_driver(
                assignment.dashboard_ids,
                assignment.driver_name,
                assignment.driver_contact,
            )

            if len(updated_dashboards) != len(assignment.dashboard_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="일부 대시보드를 찾을 수 없습니다",
                )

            return [DashboardResponse.model_validate(d) for d in updated_dashboards]

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "배차 처리 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=MESSAGES["DASHBOARD"]["ASSIGN_ERROR"],
            )

    def delete_dashboards(self, dashboard_ids: List[int]) -> bool:
        """대시보드 삭제 (관리자 전용)"""
        try:
            if not dashboard_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="삭제할 대시보드 ID를 지정해주세요",
                )

            result = self.repository.delete_dashboards(dashboard_ids)
            return result

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 삭제 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="삭제 처리 중 오류가 발생했습니다",
            )

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 (ETA 기준)"""
        try:
            oldest_date, latest_date = self.repository.get_date_range()
            if not oldest_date or not latest_date:
                now = datetime.now(self.kr_timezone)
                return now - timedelta(days=30), now

            return oldest_date.astimezone(self.kr_timezone), latest_date.astimezone(
                self.kr_timezone
            )

        except Exception as e:
            log_error(e, "날짜 범위 조회 실패")
            now = datetime.now(self.kr_timezone)
            return now - timedelta(days=30), now
