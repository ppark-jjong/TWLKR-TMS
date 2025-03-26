# teckwah_project/main/server/repositories/dashboard_lock_repository.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, text
from datetime import datetime, timedelta
from typing import List, Optional

from main.server.models.dashboard_lock_model import DashboardLock
from main.server.config.settings import get_settings
from main.server.utils.logger import log_info, log_error
from main.server.utils.exceptions import PessimisticLockException

settings = get_settings()


class DashboardLockRepository:
    """대시보드 락 저장소 구현"""

    def __init__(self, db: Session):
        self.db = db
        self.lock_timeout = settings.LOCK_TIMEOUT_SECONDS

    def acquire_lock(
        self, dashboard_id: int, user_id: str, lock_type: str
    ) -> Optional[DashboardLock]:
        """락 획득 시도 (낙관적 락)
        - 이미 락이 있으면 충돌 확인
        - 같은 사용자는 락 갱신
        - 다른 사용자는 예외 발생
        - 만료된 락은 새로 획득
        """
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
                    existing_lock.expires_at = datetime.utcnow() + timedelta(
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
                    raise PessimisticLockException(
                        detail="다른 사용자가 작업 중입니다",
                        locked_by=existing_lock.locked_by,
                        lock_type=existing_lock.lock_type,
                        dashboard_id=dashboard_id,
                        expires_at=existing_lock.expires_at,
                    )

            # 새 락 생성
            lock = DashboardLock(
                dashboard_id=dashboard_id,
                locked_by=user_id,
                locked_at=datetime.utcnow(),
                lock_type=lock_type,
                expires_at=datetime.utcnow() + timedelta(seconds=self.lock_timeout),
                lock_timeout=self.lock_timeout,
            )

            self.db.add(lock)
            self.db.flush()
            log_info(
                f"새 락 획득: dashboard_id={dashboard_id}, user_id={user_id}, type={lock_type}"
            )
            return lock

        except PessimisticLockException:
            # 락 충돌 예외는 그대로 전파
            raise
        except Exception as e:
            log_error(
                e, "락 획득 실패", {"dashboard_id": dashboard_id, "user_id": user_id}
            )
            self.db.rollback()
            return None

    def acquire_locks_for_multiple_dashboards(
        self, dashboard_ids: List[int], user_id: str, lock_type: str
    ) -> List[int]:
        """여러 대시보드에 대한 락 획득 시도
        - 모두 성공하거나 모두 실패 (원자적 연산)
        - 획득한 대시보드 ID 목록 반환
        """
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
                except PessimisticLockException as e:
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

    def release_lock(self, dashboard_id: int, user_id: str) -> bool:
        """락 해제
        - 본인의 락만 해제 가능
        - 없는 락은 True 반환 (멱등성)
        """
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

    def cleanup_expired_locks(self) -> int:
        """만료된 락 자동 정리"""
        try:
            # 현재 시간 기준으로 만료된 락 삭제
            result = (
                self.db.query(DashboardLock)
                .filter(DashboardLock.expires_at < datetime.utcnow())
                .delete(synchronize_session=False)
            )

            if result > 0:
                log_info(f"만료된 락 정리 완료: {result}건")

            return result
        except Exception as e:
            log_error(e, "만료된 락 정리 실패")
            self.db.rollback()
            return 0