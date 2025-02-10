"""대시보드 관련 레포지토리"""
from datetime import datetime, date
from typing import List, Dict, Optional, Any
from sqlalchemy import and_, extract, asc
from sqlalchemy.orm import Session, joinedload

from app.models.dashboard_model import Dashboard
from app.models.driver_model import Driver
from app.models.postal_code_model import PostalCode
from app.utils.logger_util import Logger
from app.schemas.common_schema import DeliveryStatus

class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db

    async def get_list_by_eta_date(self, target_date: date) -> List[Dashboard]:
        """날짜별 대시보드 목록 조회"""
        try:
            return (
                self.db.query(Dashboard)
                .filter(
                    extract('year', Dashboard.eta) == target_date.year,
                    extract('month', Dashboard.eta) == target_date.month,
                    extract('day', Dashboard.eta) == target_date.day
                )
                .order_by(asc(Dashboard.eta))  # eta 기준 오름차순 정렬
                .all()
            )
        except Exception as e:
            Logger.error(f"대시보드 목록 조회 중 오류: {str(e)}")
            raise

    async def get_detail(self, dashboard_id: int) -> Optional[Dashboard]:
        """대시보드 상세 정보 조회"""
        try:
            return (
                self.db.query(Dashboard)
                .options(
                    joinedload(Dashboard.postal_code_info),
                    joinedload(Dashboard.driver)
                )
                .filter(Dashboard.dashboard_id == dashboard_id)
                .first()
            )
        except Exception as e:
            Logger.error(f"대시보드 상세 조회 중 오류: {str(e)}")
            raise

    async def create(self, data: Dict[str, Any]) -> Dashboard:
        """대시보드 생성"""
        try:
            # postal_code 유효성 검증
            postal_code = (
                self.db.query(PostalCode)
                .filter(PostalCode.postal_code == data['postal_code'])
                .first()
            )
            if not postal_code:
                raise ValueError(f"유효하지 않은 우편번호: {data['postal_code']}")

            dashboard = Dashboard(**data)
            self.db.add(dashboard)
            self.db.commit()  # trg_dashboard_before_insert_postal 트리거 자동 실행
            self.db.refresh(dashboard)
            return dashboard
        except Exception as e:
            self.db.rollback()
            Logger.error(f"대시보드 생성 중 오류: {str(e)}")
            raise

    async def update_status(
        self,
        dashboard_id: int,
        new_status: DeliveryStatus,
        update_time: datetime
    ) -> Optional[Dashboard]:
        """상태 업데이트"""
        try:
            dashboard = await self.get_detail(dashboard_id)
            if not dashboard:
                return None

            dashboard.status = new_status
            
            # 상태 변경에 따른 시간 업데이트
            if dashboard.status == DeliveryStatus.IN_PROGRESS:
                dashboard.depart_time = update_time
            elif dashboard.status in [DeliveryStatus.COMPLETE, DeliveryStatus.ISSUE]:
                dashboard.complete_time = update_time

            self.db.commit()
            self.db.refresh(dashboard)
            return dashboard
        except Exception as e:
            self.db.rollback()
            Logger.error(f"상태 업데이트 중 오류: {str(e)}")
            raise

    async def update_remark(self, dashboard_id: int, remark: str) -> Optional[Dashboard]:
        """메모 업데이트"""
        try:
            dashboard = await self.get_detail(dashboard_id)
            if not dashboard:
                return None

            dashboard.remark = remark
            self.db.commit()
            self.db.refresh(dashboard)
            return dashboard
        except Exception as e:
            self.db.rollback()
            Logger.error(f"메모 업데이트 중 오류: {str(e)}")
            raise

    async def assign_driver(
        self, 
        dashboard_ids: List[int],
        driver_id: int,
        driver_remark: Optional[str] = None
    ) -> Dict[str, List]:
        """기사 배차"""
        try:
            Logger.info(f"기사 배차 시작: {len(dashboard_ids)}건")
            success_ids = []
            failed_ids = []

            # 기사 정보 조회
            driver = self.db.query(Driver).filter(Driver.driver_id == driver_id).first()
            if not driver:
                raise ValueError(f"기사를 찾을 수 없음: {driver_id}")

            # 기타 기사인 경우 remark 필수 체크
            if driver.driver_name == "기타" and not driver_remark:
                raise ValueError("기타 기사의 경우 비고(remark)를 입력해야 합니다.")

            for dashboard_id in dashboard_ids:
                try:
                    dashboard = await self.get_detail(dashboard_id)
                    if not dashboard:
                        failed_ids.append({
                            "id": dashboard_id,
                            "reason": "대시보드를 찾을 수 없습니다."
                        })
                        continue

                    if dashboard.status != DeliveryStatus.WAITING:
                        failed_ids.append({
                            "id": dashboard_id,
                            "reason": "대기 상태의 배송만 배차할 수 있습니다."
                        })
                        continue

                    dashboard.driver_id = driver_id
                    if driver_remark:
                        dashboard.driver_remark = driver_remark

                    success_ids.append(dashboard_id)

                except Exception as e:
                    Logger.error(f"배차 처리 실패 (ID: {dashboard_id}): {str(e)}")
                    failed_ids.append({
                        "id": dashboard_id,
                        "reason": str(e)
                    })

            if success_ids:
                self.db.commit()  # trg_dashboard_after_update_driver 트리거 자동 실행
                Logger.info(f"배차 성공: {len(success_ids)}건")

            return {
                "success": success_ids,
                "failed": failed_ids
            }

        except Exception as e:
            self.db.rollback()
            Logger.error(f"기사 배차 중 오류: {str(e)}")
            raise

    async def delete_multiple(self, dashboard_ids: List[int]) -> Dict[str, List[int]]:
        """대시보드 일괄 삭제"""
        try:
            success_ids = []
            failed_ids = []

            for dashboard_id in dashboard_ids:
                try:
                    dashboard = await self.get_detail(dashboard_id)
                    if not dashboard:
                        failed_ids.append(dashboard_id)
                        continue

                    if dashboard.status != DeliveryStatus.WAITING:
                        failed_ids.append(dashboard_id)
                        continue

                    self.db.delete(dashboard)
                    success_ids.append(dashboard_id)
                except Exception as e:
                    Logger.error(f"대시보드 삭제 실패 (ID: {dashboard_id}): {str(e)}")
                    failed_ids.append(dashboard_id)

            if success_ids:
                self.db.commit()

            return {
                "success": success_ids,
                "failed": failed_ids
            }
        except Exception as e:
            self.db.rollback()
            Logger.error(f"대시보드 일괄 삭제 중 오류: {str(e)}")
            raise