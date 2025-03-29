# teckwah_project/server/repositories/lock_repository.py
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional

from server.models.dashboard_lock_model import DashboardLock
from server.utils.logger import log_info, log_error
from server.utils.datetime import get_kst_now
from server.utils.error import LockConflictException
from server.config.settings import get_settings

settings = get_settings()


class LockRepository:
    """락 관련 기능을 전담하는 저장소"""

    def __init__(self, db: Session):
        self.db = db
        # 락 타임아웃을 환경설정에서 가져오도록 수정
        self.lock_timeout = settings.LOCK_TIMEOUT_SECONDS

    def acquire_lock(
        self, dashboard_id: int, user_id: str, lock_type: str
    ) -> Optional[DashboardLock]:
        """락 획득 시도"""
        try:
            # 기존 락 정보 조회
            existing_lock = self.get_lock_info(dashboard_id)

            # 이미 락이 있는 경우 처리
            if existing_lock:
                # 만료된 락인 경우 자동 해제 후 새로 획득
                if existing_lock.is_expired:
                    self.db.delete(existing_lock)
                    self.db.flush()
                    log_info(
                        f"만료된 락 자동 해제: dashboard_id={dashboard_id}, user_id={existing_lock.locked_by}"
                    )
                # 같은 사용자의 락인 경우 갱신
                elif existing_lock.locked_by == user_id:
                    existing_lock.lock_type = lock_type
                    existing_lock.expires_at = get_kst_now() + timedelta(
                        seconds=self.lock_timeout
                    )
                    self.db.flush()
                    log_info(
                        f"기존 락 갱신: dashboard_id={dashboard_id}, user_id={user_id}"
                    )
                    return existing_lock
                # 다른 사용자의 락인 경우 충돌 예외
                else:
                    log_info(
                        f"락 충돌: dashboard_id={dashboard_id}, requested_by={user_id}, locked_by={existing_lock.locked_by}"
                    )
                    raise LockConflictException(
                        detail="다른 사용자가 작업 중입니다", error_code="LOCK_CONFLICT"
                    )

            # 새 락 생성
            now = get_kst_now()
            lock = DashboardLock(
                dashboard_id=dashboard_id,
                locked_by=user_id,
                locked_at=now,
                lock_type=lock_type,
                expires_at=now + timedelta(seconds=self.lock_timeout),
                lock_timeout=self.lock_timeout,
            )

            self.db.add(lock)
            self.db.flush()
            log_info(
                f"새 락 획득: dashboard_id={dashboard_id}, user_id={user_id}, type={lock_type}"
            )
            return lock

        except LockConflictException:
            # 락 충돌 예외는 그대로 전파
            raise
        except Exception as e:
            log_error(
                e, "락 획득 실패", {"dashboard_id": dashboard_id, "user_id": user_id}
            )
            self.db.rollback()
            return None

    def release_lock(self, dashboard_id: int, user_id: str) -> bool:
        """락 해제"""
        try:
            log_info(f"락 해제 시도: dashboard_id={dashboard_id}, user_id={user_id}")

            # 락 정보 조회
            lock = self.get_lock_info(dashboard_id)

            # 락이 없으면 성공으로 간주 (멱등성)
            if not lock:
                log_info(f"해제할 락 없음: dashboard_id={dashboard_id}")
                return True

            # 본인의 락이 아니면 실패
            if lock.locked_by != user_id:
                log_info(
                    f"락 해제 권한 없음: dashboard_id={dashboard_id}, requested_by={user_id}, locked_by={lock.locked_by}"
                )
                return False

            # 락 삭제
            self.db.delete(lock)
            self.db.flush()
            log_info(f"락 해제 성공: dashboard_id={dashboard_id}, user_id={user_id}")
            return True

        except Exception as e:
            log_error(
                e, "락 해제 실패", {"dashboard_id": dashboard_id, "user_id": user_id}
            )
            self.db.rollback()
            return False

    def get_lock_info(self, dashboard_id: int) -> Optional[DashboardLock]:
        """락 정보 조회"""
        try:
            lock = (
                self.db.query(DashboardLock)
                .filter(DashboardLock.dashboard_id == dashboard_id)
                .first()
            )

            return lock
        except Exception as e:
            log_error(e, "락 정보 조회 실패", {"dashboard_id": dashboard_id})
            return None

    def acquire_locks_for_multiple_dashboards(
        self, dashboard_ids: List[int], user_id: str, lock_type: str
    ) -> List[int]:
        """여러 대시보드에 대한 락 획득 시도 (All-or-Nothing 원칙)"""
        try:
            log_info(
                f"여러 락 획득 시도: dashboard_ids={dashboard_ids}, user_id={user_id}"
            )

            # 여러 락을 한 번에 처리하기 위한 트랜잭션 블록
            acquired_ids = []

            # 각 대시보드마다 락 획득 시도
            for dashboard_id in dashboard_ids:
                try:
                    lock = self.acquire_lock(dashboard_id, user_id, lock_type)
                    if lock:
                        acquired_ids.append(dashboard_id)
                except LockConflictException as e:
                    # 락 충돌 시 이미 획득한 락들 해제
                    for acquired_id in acquired_ids:
                        self.release_lock(acquired_id, user_id)

                    # 빈 목록 반환 (모두 실패)
                    log_info(
                        f"여러 락 획득 실패: 충돌={dashboard_id}, user_id={user_id}"
                    )
                    return []

            log_info(f"여러 락 획득 성공: 개수={len(acquired_ids)}, user_id={user_id}")
            return acquired_ids

        except Exception as e:
            log_error(
                e,
                "여러 락 획득 실패",
                {"dashboard_ids": dashboard_ids, "user_id": user_id},
            )
            # 이미 획득한 락들 해제
            for acquired_id in acquired_ids:
                try:
                    self.release_lock(acquired_id, user_id)
                except:
                    pass
            return []

    def cleanup_expired_locks(self) -> int:
        """만료된 락 자동 정리

        Returns:
            int: 정리된 락 개수
        """
        try:
            log_info("만료된 락 자동 정리 수행")

            # 방법 1: 직접 SQL 쿼리 실행
            # result = self.db.execute(text("CALL cleanup_expired_locks()")).first()
            # cleaned_count = result[0] if result else 0

            # 방법 2: SQLAlchemy ORM 사용
            now = get_kst_now()
            result = (
                self.db.query(DashboardLock)
                .filter(DashboardLock.expires_at < now)
                .delete(synchronize_session=False)
            )

            self.db.commit()

            if result > 0:
                log_info(f"만료된 락 정리 완료: {result}건")

            return result

        except Exception as e:
            log_error(e, "만료된 락 정리 실패")
            self.db.rollback()
            return 0
