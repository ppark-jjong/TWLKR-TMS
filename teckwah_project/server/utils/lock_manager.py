# server/utils/lock_manager.py - 자동 재시도 로직 제거 및 단순화

from contextlib import contextmanager
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from server.models.dashboard_lock_model import DashboardLock
from server.utils.logger import log_info, log_error, log_warning
from server.utils.error import LockConflictException
from server.utils.datetime import get_kst_now
from server.config.settings import get_settings

settings = get_settings()

class LockManager:
    """단순화된 락 관리자
    
    락 획득 및 해제를 간소화하고 안정적으로 관리합니다.
    YAGNI 원칙에 따라 불필요한 복잡성 제거
    """

    def __init__(self, repository, db: Session):
        self.repository = repository
        self.db = db
        self.lock_timeout = settings.LOCK_TIMEOUT_SECONDS

    @contextmanager
    def acquire_lock(self, dashboard_id: int, user_id: str, lock_type: str = "EDIT"):
        """단일 대시보드 락 획득 및 자동 해제 (with 문 지원)
        
        사용자 트리거에 의해 호출되며, 백그라운드에서 자동으로 락을 관리합니다.
        """
        lock = None
        acquired = False

        try:
            # 락 정보 조회
            existing_lock = self.repository.get_lock_info(dashboard_id)
            
            # 단순화된 락 획득 로직
            if existing_lock:
                # 만료된 락이면 삭제하고 새로 생성
                if existing_lock.is_expired:
                    self.db.delete(existing_lock)
                    self.db.flush()
                    lock = self._create_new_lock(dashboard_id, user_id, lock_type)
                    acquired = True
                # 현재 사용자의 락이면 갱신
                elif existing_lock.locked_by == user_id:
                    existing_lock.expires_at = get_kst_now() + settings.LOCK_TIMEOUT_SECONDS
                    self.db.flush()
                    lock = existing_lock
                    acquired = True
                # 다른 사용자의 락이면 충돌 예외 발생
                else:
                    log_warning(f"락 충돌: dashboard_id={dashboard_id}, user_id={user_id}, locked_by={existing_lock.locked_by}")
                    raise LockConflictException(
                        detail="다른 사용자가 작업 중입니다",
                        error_code="LOCK_CONFLICT",
                        lock_info={
                            "dashboard_id": dashboard_id,
                            "locked_by": existing_lock.locked_by,
                            "lock_type": existing_lock.lock_type,
                            "expires_at": existing_lock.expires_at.isoformat(),
                        }
                    )
            else:
                # 락이 없으면 새로 생성
                lock = self._create_new_lock(dashboard_id, user_id, lock_type)
                acquired = True

            # 컨텍스트로 락 객체 전달
            yield lock

        except Exception as e:
            # 모든 예외 상황 그대로 전파
            if isinstance(e, LockConflictException):
                raise
            log_error(e, f"락 획득/사용 중 오류: dashboard_id={dashboard_id}")
            raise
        finally:
            # 컨텍스트 종료 시 락 자동 해제 (획득했을 경우에만)
            if acquired and lock:
                try:
                    self._release_lock(dashboard_id, user_id)
                except Exception as e:
                    log_error(e, f"락 해제 실패: dashboard_id={dashboard_id}")

    def _create_new_lock(self, dashboard_id: int, user_id: str, lock_type: str) -> DashboardLock:
        """새로운 락 생성 - 내부 메서드"""
        now = get_kst_now()
        lock = DashboardLock(
            dashboard_id=dashboard_id,
            locked_by=user_id,
            locked_at=now,
            lock_type=lock_type,
            expires_at=now + settings.LOCK_TIMEOUT_SECONDS,
            lock_timeout=settings.LOCK_TIMEOUT_SECONDS,
        )
        self.db.add(lock)
        self.db.flush()
        log_info(f"새 락 획득: dashboard_id={dashboard_id}, user_id={user_id}")
        return lock

    @contextmanager
    def acquire_multiple_locks(self, dashboard_ids: List[int], user_id: str, lock_type: str = "EDIT"):
        """여러 대시보드 락 획득 및 자동 해제 (with 문 지원)
        
        All-or-Nothing 원칙: 모든 락을 획득하거나, 하나라도 실패 시 모두 해제
        """
        if not dashboard_ids:
            yield []
            return
            
        acquired_ids = set()  # 성공적으로 락을 획득한 대시보드 ID 목록
        locks = []

        try:
            # 각 대시보드에 대해 락 획득 시도
            for dashboard_id in dashboard_ids:
                try:
                    existing_lock = self.repository.get_lock_info(dashboard_id)
                    
                    # 락 획득 로직 (단일 락 획득과 동일)
                    if existing_lock:
                        if existing_lock.is_expired:
                            self.db.delete(existing_lock)
                            self.db.flush()
                            lock = self._create_new_lock(dashboard_id, user_id, lock_type)
                            locks.append(lock)
                            acquired_ids.add(dashboard_id)
                        elif existing_lock.locked_by == user_id:
                            existing_lock.expires_at = get_kst_now() + settings.LOCK_TIMEOUT_SECONDS
                            self.db.flush()
                            locks.append(existing_lock)
                            acquired_ids.add(dashboard_id)
                        else:
                            # 하나라도 실패하면 이미 획득한 락을 모두 해제 (All-or-Nothing)
                            for id in acquired_ids:
                                self._release_lock(id, user_id)
                            raise LockConflictException(
                                detail=f"다른 사용자가 ID {dashboard_id}인 대시보드를 작업 중입니다",
                                error_code="LOCK_CONFLICT",
                                lock_info={
                                    "dashboard_id": dashboard_id,
                                    "locked_by": existing_lock.locked_by,
                                    "lock_type": existing_lock.lock_type,
                                    "expires_at": existing_lock.expires_at.isoformat(),
                                }
                            )
                    else:
                        lock = self._create_new_lock(dashboard_id, user_id, lock_type)
                        locks.append(lock)
                        acquired_ids.add(dashboard_id)
                except Exception as e:
                    # 실패 시 이미 획득한 모든 락 롤백
                    for id in acquired_ids:
                        self._release_lock(id, user_id)
                    log_error(e, "다중 락 획득 실패")
                    if isinstance(e, LockConflictException):
                        raise
                    raise LockConflictException(f"다중 락 획득 실패: {str(e)}")

            # 모든 락을 성공적으로 획득했으면 작업 수행
            yield locks

        finally:
            # 작업 완료 후 모든 획득한 락 해제 (자동으로 모든 활동에서 락 해제 보장)
            for id in acquired_ids:
                try:
                    self._release_lock(id, user_id)
                except Exception as e:
                    log_error(e, f"다중 락 해제 실패: dashboard_id={id}")

    def _release_lock(self, dashboard_id: int, user_id: str) -> bool:
        """락 해제 시도 - 단순화된 버전"""
        try:
            lock = (
                self.db.query(DashboardLock)
                .filter(DashboardLock.dashboard_id == dashboard_id)
                .first()
            )
            
            if not lock:
                return True  # 이미 해제됨
                
            if lock.locked_by != user_id:
                log_warning(f"락 해제 권한 없음: dashboard_id={dashboard_id}, requested_by={user_id}, locked_by={lock.locked_by}")
                return False
                
            self.db.delete(lock)
            self.db.flush()
            log_info(f"락 해제 완료: dashboard_id={dashboard_id}, user_id={user_id}")
            return True
        except Exception as e:
            log_error(e, f"락 해제 중 오류: dashboard_id={dashboard_id}")
            return False

    def get_lock_status(self, dashboard_id: int, lock_type: str = None) -> Dict[str, Any]:
        """대시보드의 락 상태 정보 조회 - 단순화된 버전"""
        try:
            lock = (
                self.db.query(DashboardLock)
                .filter(DashboardLock.dashboard_id == dashboard_id)
                .first()
            )

            if not lock:
                return {
                    "is_locked": False,
                    "dashboard_id": dashboard_id,
                    "lock_type": lock_type,
                }

            # 락 타입 필터링
            if lock_type and lock.lock_type != lock_type:
                return {
                    "is_locked": False,
                    "dashboard_id": dashboard_id,
                    "lock_type": lock_type,
                }

            # 만료 여부 확인
            now = get_kst_now()
            is_expired = lock.expires_at < now

            return {
                "is_locked": not is_expired,
                "dashboard_id": dashboard_id,
                "locked_by": lock.locked_by,
                "lock_type": lock.lock_type,
                "locked_at": lock.locked_at.isoformat(),
                "expires_at": lock.expires_at.isoformat(),
                "is_expired": is_expired,
            }
        except Exception as e:
            log_error(e, f"락 상태 조회 실패: dashboard_id={dashboard_id}")
            return {
                "is_locked": False,
                "dashboard_id": dashboard_id,
                "lock_type": lock_type,
                "error": str(e),
            }