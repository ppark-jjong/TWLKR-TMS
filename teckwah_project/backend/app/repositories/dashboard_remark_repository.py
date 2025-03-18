# app/repositories/dashboard_remark_repository.py
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
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
        self, dashboard_id: int, content: str, user_id: str, dashboard_version: int = None
    ) -> Optional[DashboardRemark]:
        """
        새 메모 생성 (대시보드 버전 검증 추가)
        - dashboard_version: 클라이언트가 알고 있는 대시보드 버전
        """
        try:
            # 1. 대시보드 버전 검증
            dashboard = self.db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
            if not dashboard:
                raise ValueError(f"대시보드를 찾을 수 없습니다: {dashboard_id}")
            
            # 2. 낙관적 락 검증 (대시보드 버전이 일치하는지 확인)
            if dashboard_version is not None and dashboard.version != dashboard_version:
                log_info(
                    f"메모 생성 시 낙관적 락 충돌: 대시보드 ID={dashboard_id}, "
                    f"클라이언트 버전={dashboard_version}, 서버 버전={dashboard.version}"
                )
                return None  # 버전 불일치 시 None 반환
            
            # 3. 메모 생성
            formatted_content = content
            if not content.startswith(f"{user_id}:"):
                formatted_content = f"{user_id}: {content}"
                
            remark = DashboardRemark(
                dashboard_id=dashboard_id,
                content=content,
                created_by=user_id,
                formatted_content=formatted_content
            )
            
            # 4. 대시보드 버전 증가 (메모 생성도 데이터 변경으로 간주)
            dashboard.version += 1
            
            self.db.add(remark)
            self.db.flush()
            self.db.refresh(remark)

            log_info(
                f"메모 생성 완료: ID={remark.remark_id}, 대시보드 ID={dashboard_id}, "
                f"대시보드 버전={dashboard.version}"
            )
            return remark

        except ValueError as e:
            log_error(e, "메모 생성 실패: 유효성 검증 오류", {"dashboard_id": dashboard_id})
            return None
        except SQLAlchemyError as e:
            self.db.rollback()  # 트랜잭션 롤백 명시적 추가
            log_error(e, "메모 생성 실패", {"dashboard_id": dashboard_id})
            raise

    def update_remark(
        self, remark_id: int, content: str, user_id: str, dashboard_version: int = None
    ) -> Optional[DashboardRemark]:
        """
        메모 업데이트 (대시보드 버전 검증 추가)
        - dashboard_version: 클라이언트가 알고 있는 대시보드 버전
        """
        try:
            remark = self.get_remark_by_id(remark_id)
            if not remark:
                raise ValueError(f"메모를 찾을 수 없습니다: {remark_id}")

            # 대시보드 버전 검증
            dashboard = self.db.query(Dashboard).filter(
                Dashboard.dashboard_id == remark.dashboard_id
            ).first()
            
            if not dashboard:
                raise ValueError(f"대시보드를 찾을 수 없습니다: {remark.dashboard_id}")
            
            if dashboard_version is not None and dashboard.version != dashboard_version:
                log_info(
                    f"메모 업데이트 시 낙관적 락 충돌: 대시보드 ID={remark.dashboard_id}, "
                    f"클라이언트 버전={dashboard_version}, 서버 버전={dashboard.version}"
                )
                return None  # 버전 불일치 시 None 반환

            # 새 메모 생성 (기존 메모는 유지, 이력 관리)
            new_remark = DashboardRemark(
                dashboard_id=remark.dashboard_id,
                content=content,
                created_by=user_id,
                formatted_content=content if content.startswith(f"{user_id}:") else f"{user_id}: {content}"
            )
            
            # 대시보드 버전 증가
            dashboard.version += 1
            
            self.db.add(new_remark)
            self.db.flush()
            self.db.refresh(new_remark)

            log_info(
                f"메모 업데이트 완료: 새 ID={new_remark.remark_id}, 대시보드 ID={remark.dashboard_id}, "
                f"대시보드 버전={dashboard.version}"
            )
            return new_remark
        except ValueError as e:
            log_error(e, "메모 업데이트 실패: 유효성 검증 오류", {"remark_id": remark_id})
            return None
        except SQLAlchemyError as e:
            self.db.rollback()  # 트랜잭션 롤백 명시적 추가
            log_error(e, "메모 업데이트 실패", {"remark_id": remark_id})
            raise