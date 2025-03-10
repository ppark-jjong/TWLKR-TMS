# app/repositories/dashboard_remark_repository.py
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from sqlalchemy.exc import SQLAlchemyError

from app.models.dashboard_remark_model import DashboardRemark
from app.utils.logger import log_info, log_error
from app.utils.exceptions import OptimisticLockException


class DashboardRemarkRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_remarks_by_dashboard_id(self, dashboard_id: int) -> List[DashboardRemark]:
        """대시보드 ID별 메모 목록 조회 (최신순)"""
        try:
            remarks = (
                self.db.query(DashboardRemark)
                .filter(DashboardRemark.dashboard_id == dashboard_id)
                .order_by(desc(DashboardRemark.created_at))
                .all()
            )
            return remarks
        except SQLAlchemyError as e:
            log_error(e, "메모 목록 조회 실패", {"dashboard_id": dashboard_id})
            raise

    def get_remark_by_id(self, remark_id: int) -> Optional[DashboardRemark]:
        """메모 ID로 메모 조회"""
        try:
            remark = (
                self.db.query(DashboardRemark)
                .filter(DashboardRemark.remark_id == remark_id)
                .first()
            )
            return remark
        except SQLAlchemyError as e:
            log_error(e, "메모 조회 실패", {"remark_id": remark_id})
            raise

    def create_remark(
        self, dashboard_id: int, content: str, user_id: str
    ) -> DashboardRemark:
        """새 메모 생성"""
        try:
            remark = DashboardRemark(
                dashboard_id=dashboard_id,
                content=content,
                created_by=user_id,
                version=1,
            )
            self.db.add(remark)
            self.db.flush()
            self.db.refresh(remark)

            log_info(
                f"메모 생성 완료: ID={remark.remark_id}, 대시보드 ID={dashboard_id}"
            )
            return remark

        except SQLAlchemyError as e:
            log_error(e, "메모 생성 실패", {"dashboard_id": dashboard_id})
            raise

    def update_remark(
        self, remark_id: int, content: str, expected_version: int, user_id: str
    ) -> DashboardRemark:
        """메모 업데이트 (낙관적 락 적용)"""
        try:
            remark = self.get_remark_by_id(remark_id)
            if not remark:
                raise ValueError(f"메모를 찾을 수 없습니다: {remark_id}")

            # 낙관적 락 검증
            if remark.version != expected_version:
                log_info(
                    f"낙관적 락 충돌: 메모 ID {remark_id}, 예상 버전 {expected_version}, 실제 버전 {remark.version}"
                )
                raise OptimisticLockException(
                    f"다른 사용자가 이미 데이터를 수정했습니다. 최신 데이터를 확인하세요.",
                    current_version=remark.version,
                )

            # 새 메모 생성 (기존 메모는 유지, 이력 관리)
            new_remark = DashboardRemark(
                dashboard_id=remark.dashboard_id,
                content=content,
                created_by=user_id,
                version=1,
            )
            self.db.add(new_remark)
            self.db.flush()
            self.db.refresh(new_remark)

            log_info(
                f"메모 업데이트 완료: 새 ID={new_remark.remark_id}, 대시보드 ID={remark.dashboard_id}"
            )
            return new_remark

        except OptimisticLockException:
            raise
        except SQLAlchemyError as e:
            log_error(e, "메모 업데이트 실패", {"remark_id": remark_id})
            raise
