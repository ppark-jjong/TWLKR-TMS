"""대시보드 관련 서비스"""

from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session


from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardListResponse,
    DashboardDetailResponse,
    DashboardResponse,
    DashboardDeleteResponse,
    DriverAssignmentResult,
)
from app.schemas.common_schema import DeliveryStatus
from app.models.user_model import User
from app.utils.logger_util import Logger

STATUS_TRANSITIONS = {
    DeliveryStatus.WAITING: [DeliveryStatus.IN_PROGRESS],
    DeliveryStatus.IN_PROGRESS: [DeliveryStatus.COMPLETE, DeliveryStatus.ISSUE],
    DeliveryStatus.COMPLETE: [],
    DeliveryStatus.ISSUE: [],
}


class DashboardService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = DashboardRepository(db)

    def _validate_date(self, target_date: datetime) -> bool:
        """날짜가 1개월 이내인지 검증"""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        one_month_ago = today - timedelta(days=30)
        return one_month_ago <= target_date <= today

    async def get_list(self, target_date: datetime) -> List[Dict[str, Any]]:
        """
        날짜별 대시보드 목록 조회

        Args:
            target_date: 조회할 날짜

        Returns:
            List[Dict[str, Any]]: 대시보드 목록

        Raises:
            HTTPException: 날짜 검증 실패 또는 조회 실패 시
        """
        try:
            # 날짜 검증
            if not self._validate_date(target_date):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="조회 가능한 날짜는 오늘부터 1개월 전까지입니다.",
                )

            Logger.info(f"대시보드 목록 조회: target_date={target_date}")
            dashboards = await self.repository.get_list_by_eta_date(target_date)

            # 데이터 형식 변환
            result = []
            for dashboard in dashboards:
                result.append(
                    {
                        "dashboard_id": dashboard.dashboard_id,
                        "type": dashboard.type,
                        "department": dashboard.department,
                        "warehouse": dashboard.warehouse,
                        "driver_name": dashboard.driver_name,
                        "order_no": dashboard.order_no,
                        "create_time": dashboard.create_time,
                        "depart_time": dashboard.depart_time,
                        "eta": dashboard.eta,
                        "status": dashboard.status,
                        "region": dashboard.region,
                    }
                )

            return result

        except HTTPException:
            raise
        except Exception as e:
            Logger.error(f"대시보드 목록 조회 중 오류: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 목록 조회 중 오류가 발생했습니다.",
            )

    async def get_detail(self, dashboard_id: int) -> Optional[DashboardDetailResponse]:
        """대시보드 상세 정보 조회"""
        dashboard = await self.repository.get_by_id(dashboard_id)
        if not dashboard:
            return None
        return DashboardDetailResponse.from_orm(dashboard)

    async def create_dashboard(
        self, data: DashboardCreate, user: User
    ) -> DashboardResponse:
        """대시보드 생성"""
        try:
            Logger.info(f"대시보드 생성 시작: {data.dict()}")

            # 우편번호 형식 검증
            if not data.postal_code.isdigit() or len(data.postal_code) != 5:
                raise ValueError("올바른 우편번호 형식이 아닙니다.")

            create_data = data.dict()
            create_data["department"] = user.user_department
            create_data["status"] = DeliveryStatus.WAITING

            # 트리거 실행을 위한 create 호출
            dashboard = await self.repository.create(create_data)
            Logger.info(f"대시보드 생성 성공: dashboard_id={dashboard.dashboard_id}")

            return DashboardResponse(
                success=True,
                message="대시보드가 성공적으로 생성되었습니다.",
                data=DashboardDetailResponse.from_orm(dashboard),
            )

        except ValueError as e:
            Logger.error(f"대시보드 생성 중 유효성 검증 오류: {str(e)}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            Logger.error(f"대시보드 생성 중 오류: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 생성 중 오류가 발생했습니다.",
            )

    async def update_status(
        self, dashboard_id: int, new_status: DeliveryStatus
    ) -> DashboardResponse:
        """상태 업데이트"""
        try:
            dashboard = await self.repository.get_detail(dashboard_id)
            if not dashboard:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다.",
                )

            # 상태 변경 가능 여부 검증
            allowed_transitions = {
                DeliveryStatus.WAITING: [DeliveryStatus.IN_PROGRESS],
                DeliveryStatus.IN_PROGRESS: [
                    DeliveryStatus.COMPLETE,
                    DeliveryStatus.ISSUE,
                ],
                DeliveryStatus.COMPLETE: [],
                DeliveryStatus.ISSUE: [],
            }

            if new_status not in allowed_transitions.get(dashboard.status, []):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"현재 상태({dashboard.status})에서 {new_status}로 변경할 수 없습니다.",
                )

            # 시간 정보 업데이트
            update_time = datetime.utcnow()

            updated = await self.repository.update_status(
                dashboard_id, new_status, update_time
            )

            return DashboardResponse(
                success=True,
                message="상태가 성공적으로 업데이트되었습니다.",
                data=DashboardDetailResponse.from_orm(updated),
            )

        except HTTPException:
            raise
        except Exception as e:
            Logger.error(f"상태 업데이트 중 오류: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="상태 업데이트 중 오류가 발생했습니다.",
            )

    async def update_remark(self, dashboard_id: int, remark: str) -> DashboardResponse:
        """메모 업데이트"""
        try:
            updated = await self.repository.update_remark(dashboard_id, remark)
            if not updated:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="대시보드를 찾을 수 없습니다.",
                )
            return DashboardResponse(
                success=True,
                message="메모가 성공적으로 업데이트되었습니다.",
                data=DashboardDetailResponse.from_orm(updated),
            )
        except HTTPException:
            raise
        except Exception as e:
            Logger.error(f"메모 업데이트 중 오류: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="메모 업데이트 중 오류가 발생했습니다.",
            )

    async def assign_driver(
        self,
        dashboard_ids: List[int],
        driver_id: int,
        driver_remark: Optional[str] = None,
    ) -> DashboardResponse:
        """기사 배차"""
        try:
            result = await self.repository.assign_driver(
                dashboard_ids, driver_id, driver_remark
            )

            return DashboardResponse(
                success=True,
                message=f"기사 배차가 완료되었습니다. (성공: {len(result['success'])}건)",
                data=DriverAssignmentResult(**result),
            )
        except Exception as e:
            Logger.error(f"기사 배차 중 오류: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="기사 배차 중 오류가 발생했습니다.",
            )

    async def delete_dashboards(
        self, dashboard_ids: List[int]
    ) -> DashboardDeleteResponse:
        """대시보드 일괄 삭제"""
        try:
            result = await self.repository.delete_multiple(dashboard_ids)
            return DashboardDeleteResponse(
                success=True,
                message="대시보드가 성공적으로 삭제되었습니다.",
                deleted_count=len(result["success"]),
            )
        except Exception as e:
            Logger.error(f"대시보드 삭제 중 오류: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="대시보드 삭제 중 오류가 발생했습니다.",
            )
