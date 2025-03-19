# app/repositories/dashboard_remark_repository.py
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, select
from sqlalchemy.exc import SQLAlchemyError

from app.models.dashboard_remark_model import DashboardRemark
from app.models.dashboard_model import Dashboard
from app.utils.logger import log_info, log_error


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
    ) -> Optional[DashboardRemark]:
        """
        새 메모 생성 (비관적 락 전용, 트랜잭션 내에서 호출 가정)
        - 참고: dashboard_id 행에 대한 잠금은 상위 서비스 레이어에서 처리해야 함
        """
        try:
            # 1. 대시보드 존재 확인
            dashboard = self.db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
            if not dashboard:
                log_error(None, "메모 생성 실패: 대시보드 없음", {"dashboard_id": dashboard_id})
                return None
            
            # 2. 메모 생성
            formatted_content = content
            if not content.startswith(f"{user_id}:"):
                formatted_content = f"{user_id}: {content}"
                
            remark = DashboardRemark(
                dashboard_id=dashboard_id,
                content=content,
                created_by=user_id,
                formatted_content=formatted_content
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
        self, remark_id: int, content: str, user_id: str
    ) -> Optional[DashboardRemark]:
        """
        메모 업데이트 (비관적 락 전용)
        - 참고: dashboard_id 행에 대한 잠금은 상위 서비스 레이어에서 처리해야 함
        """
        try:
            # 1. 기존 메모 조회 (with_for_update로 행 잠금)
            stmt = select(DashboardRemark).where(DashboardRemark.remark_id == remark_id).with_for_update()
            result = self.db.execute(stmt)
            remark = result.scalar_one_or_none()
            
            if not remark:
                log_error(None, "메모 업데이트 실패: 메모 없음", {"remark_id": remark_id})
                return None

            # 2. 새 메모 생성 (기존 메모는 유지, 이력 관리)
            new_remark = DashboardRemark(
                dashboard_id=remark.dashboard_id,
                content=content,
                created_by=user_id,
                formatted_content=content if content.startswith(f"{user_id}:") else f"{user_id}: {content}"
            )
            
            self.db.add(new_remark)
            self.db.flush()
            self.db.refresh(new_remark)

            log_info(
                f"메모 업데이트 완료: 새 ID={new_remark.remark_id}, 대시보드 ID={remark.dashboard_id}"
            )
            return new_remark
            
        except SQLAlchemyError as e:
            log_error(e, "메모 업데이트 실패", {"remark_id": remark_id})
            raise