# app/repositories/dashboard_remark_repository.py
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, select
from sqlalchemy.exc import SQLAlchemyError

from app.models.dashboard_remark_model import DashboardRemark
from app.models.dashboard_model import Dashboard
from app.utils.logger import log_info, log_error
from app.utils.datetime_helper import get_kst_now


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

    def create_empty_remark(
        self, dashboard_id: int, user_id: str
    ) -> Optional[DashboardRemark]:
        """
        빈 메모 생성 (대시보드 생성 시 자동 호출용)
        - 내용이 null인 초기 메모 생성
        """
        try:
            # 1. 대시보드 존재 확인
            dashboard = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .first()
            )
            if not dashboard:
                log_error(
                    None,
                    "메모 생성 실패: 대시보드 없음",
                    {"dashboard_id": dashboard_id},
                )
                return None

            # 2. 빈 메모 생성
            now = get_kst_now()
            remark = DashboardRemark(
                dashboard_id=dashboard_id,
                content=None,  # 빈 내용 (NULL)
                created_at=now,
                created_by=user_id,
                formatted_content="",  # 접두사 제거
            )

            self.db.add(remark)
            self.db.flush()
            self.db.refresh(remark)

            log_info(
                f"빈 메모 생성 완료: ID={remark.remark_id}, 대시보드 ID={dashboard_id}"
            )
            return remark

        except SQLAlchemyError as e:
            log_error(e, "빈 메모 생성 실패", {"dashboard_id": dashboard_id})
            self.db.rollback()
            raise

    def create_remark(
        self, dashboard_id: int, content: str, user_id: str
    ) -> Optional[DashboardRemark]:
        """
        새 메모 생성
        """
        try:
            # 1. 대시보드 존재 확인
            dashboard = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .first()
            )
            if not dashboard:
                log_error(
                    None,
                    "메모 생성 실패: 대시보드 없음",
                    {"dashboard_id": dashboard_id},
                )
                return None

            # 2. 메모 내용 및 포맷팅된 내용 생성
            # 수정: user_id 접두사 제거
            formatted_content = content

            # 3. 메모 객체 생성
            now = get_kst_now()
            remark = DashboardRemark(
                dashboard_id=dashboard_id,
                content=content,
                created_at=now,
                created_by=user_id,
                formatted_content=formatted_content,
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
            self.db.rollback()
            raise

    def update_remark(
    self, remark_id: int, content: str, user_id: str
) -> Optional[DashboardRemark]:
        """
        메모 업데이트 (단순 업데이트 방식)
        - 참고: dashboard_id 행에 대한 잠금은 상위 서비스 레이어에서 처리해야 함
        """
        try:
            # 1. 기존 메모 조회 (with_for_update로 행 잠금)
            stmt = (
                select(DashboardRemark)
                .where(DashboardRemark.remark_id == remark_id)
                .with_for_update()
            )
            result = self.db.execute(stmt)
            remark = result.scalar_one_or_none()

            if not remark:
                log_error(
                    None, "메모 업데이트 실패: 메모 없음", {"remark_id": remark_id}
                )
                return None

            # 2. 메모 내용 및 포맷팅된 내용 업데이트
            # 수정: user_id 접두사 제거
            remark.content = content
            remark.formatted_content = content

            # 3. 변경 사항 저장
            self.db.flush()

            log_info(
                f"메모 업데이트 완료: ID={remark.remark_id}, 대시보드 ID={remark.dashboard_id}"
            )
            return remark

        except SQLAlchemyError as e:
            log_error(e, "메모 업데이트 실패", {"remark_id": remark_id})
            self.db.rollback()
            raise