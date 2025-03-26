# teckwah_project/main/server/repositories/memo_repository.py
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from sqlalchemy.exc import SQLAlchemyError

from main.server.models.dashboard_memo_model import DashboardMemo
from main.server.utils.logger import log_error, log_info


class MemoRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_memo(
        self, dashboard_id: int, user_id: str, content: str
    ) -> DashboardMemo:
        """메모 생성 (항상 새 레코드로 추가)"""
        try:
            log_info(f"메모 생성: dashboard_id={dashboard_id}, user_id={user_id}")

            # 메모 객체 생성 (formatted_content는 DB 트리거가 자동 설정)
            memo = DashboardMemo(
                dashboard_id=dashboard_id, user_id=user_id, content=content
            )

            self.db.add(memo)
            self.db.commit()
            self.db.refresh(memo)

            log_info(f"메모 생성 완료: memo_id={memo.memo_id}")
            return memo

        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(
                e, "메모 생성 실패", {"dashboard_id": dashboard_id, "user_id": user_id}
            )
            raise

    def get_memos_by_dashboard_id(
        self, dashboard_id: int, limit: int = 20
    ) -> List[DashboardMemo]:
        """대시보드 ID로 메모 목록 조회 (최신순)"""
        try:
            log_info(f"메모 목록 조회: dashboard_id={dashboard_id}, limit={limit}")

            result = (
                self.db.query(DashboardMemo)
                .filter(DashboardMemo.dashboard_id == dashboard_id)
                .order_by(desc(DashboardMemo.created_at))
                .limit(limit)
                .all()
            )

            log_info(f"메모 목록 조회 결과: {len(result)}건")
            return result

        except SQLAlchemyError as e:
            log_error(e, "메모 목록 조회 실패", {"dashboard_id": dashboard_id})
            raise

    def get_memo_by_id(self, memo_id: int) -> Optional[DashboardMemo]:
        """메모 ID로 메모 조회"""
        try:
            log_info(f"메모 조회: memo_id={memo_id}")

            result = (
                self.db.query(DashboardMemo)
                .filter(DashboardMemo.memo_id == memo_id)
                .first()
            )

            log_info(f"메모 조회 결과: {'성공' if result else '실패'}")
            return result

        except SQLAlchemyError as e:
            log_error(e, "메모 조회 실패", {"memo_id": memo_id})
            raise

    def delete_memo(self, memo_id: int, user_id: str, is_admin: bool = False) -> bool:
        """메모 삭제 (작성자 본인 또는 관리자만 가능)"""
        try:
            log_info(
                f"메모 삭제: memo_id={memo_id}, user_id={user_id}, is_admin={is_admin}"
            )

            # 메모 조회
            memo = self.get_memo_by_id(memo_id)
            if not memo:
                log_info(f"메모 삭제 실패: 메모 없음 (memo_id={memo_id})")
                return False

            # 권한 검증
            if not is_admin and memo.user_id != user_id:
                log_info(
                    f"메모 삭제 실패: 권한 없음 (memo.user_id={memo.user_id}, user_id={user_id})"
                )
                return False

            # 메모 삭제
            self.db.delete(memo)
            self.db.commit()

            log_info(f"메모 삭제 완료: memo_id={memo_id}")
            return True

        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "메모 삭제 실패", {"memo_id": memo_id, "user_id": user_id})
            raise

    def get_memo_count_by_dashboard_id(self, dashboard_id: int) -> int:
        """대시보드별 메모 수 조회"""
        try:
            count = (
                self.db.query(func.count(DashboardMemo.memo_id))
                .filter(DashboardMemo.dashboard_id == dashboard_id)
                .scalar()
            )

            return count or 0

        except SQLAlchemyError as e:
            log_error(e, "메모 수 조회 실패", {"dashboard_id": dashboard_id})
            return 0
