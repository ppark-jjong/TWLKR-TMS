# app/repositories/dashboard_lock_repository.py
from datetime import datetime, timedelta
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from sqlalchemy.exc import SQLAlchemyError

from app.models.dashboard_lock_model import DashboardLock
from app.utils.logger import log_info, log_error
from app.utils.exceptions import PessimisticLockException


class DashboardLockRepository:
    def __init__(self, db: Session):
        self.db = db
        self.lock_timeout = 300  # 기본 락 타임아웃 5분

    def acquire_lock(
        self, dashboard_id: int, user_id: str, lock_type: str
    ) -> Optional[DashboardLock]:
        """대시보드에 락 획득 시도"""
        try:
            # 1. 이미 락이 존재하는지 확인
            existing_lock = (
                self.db.query(DashboardLock)
                .filter(DashboardLock.dashboard_id == dashboard_id)
                .first()
            )

            # 2. 기존 락이 있는 경우
            if existing_lock:
                # 만료된 락인 경우 삭제
                if existing_lock.is_expired:
                    self.db.delete(existing_lock)
                    self.db.flush()
                # 현재 사용자의 락인 경우 갱신
                elif existing_lock.locked_by == user_id:
                    existing_lock.expires_at = datetime.utcnow() + timedelta(
                        seconds=self.lock_timeout
                    )
                    self.db.flush()
                    return existing_lock
                # 다른 사용자의 락이 아직 유효한 경우 예외 발생
                else:
                    raise PessimisticLockException(
                        f"사용자 {existing_lock.locked_by}가 이미 수정 중입니다.",
                        locked_by=existing_lock.locked_by,
                    )

            # 3. 새 락 생성
            lock = DashboardLock(
                dashboard_id=dashboard_id,
                locked_by=user_id,
                locked_at=datetime.utcnow(),
                lock_type=lock_type,
                expires_at=datetime.utcnow() + timedelta(seconds=self.lock_timeout),
            )
            self.db.add(lock)
            self.db.flush()

            log_info(
                f"락 획득 성공: 대시보드 ID {dashboard_id}, 사용자 {user_id}, 유형 {lock_type}"
            )
            return lock

        except PessimisticLockException:
            raise
        except SQLAlchemyError as e:
            log_error(
                e, "락 획득 실패", {"dashboard_id": dashboard_id, "user_id": user_id}
            )
            raise

    def release_lock(self, dashboard_id: int, user_id: str) -> bool:
        """락 해제 (본인 소유의 락만 해제 가능)"""
        try:
            lock = (
                self.db.query(DashboardLock)
                .filter(
                    and_(
                        DashboardLock.dashboard_id == dashboard_id,
                        DashboardLock.locked_by == user_id,
                    )
                )
                .first()
            )

            if lock:
                self.db.delete(lock)
                self.db.flush()
                log_info(f"락 해제 성공: 대시보드 ID {dashboard_id}, 사용자 {user_id}")
                return True

            return False

        except SQLAlchemyError as e:
            log_error(
                e, "락 해제 실패", {"dashboard_id": dashboard_id, "user_id": user_id}
            )
            return False

    def cleanup_expired_locks(self) -> int:
        """만료된 락 자동 정리"""
        try:
            count = (
                self.db.query(DashboardLock)
                .filter(DashboardLock.expires_at < datetime.utcnow())
                .delete()
            )
            self.db.commit()
            if count > 0:
                log_info(f"만료된 락 {count}개 정리 완료")
            return count
        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "만료된 락 정리 실패")
            return 0
