# app/utils/lock_manager.py
from contextlib import contextmanager
from typing import Optional
from datetime import datetime, timedelta

from app.utils.logger import log_info, log_error
from app.utils.exceptions import PessimisticLockException


class LockManager:
    """락 관리자: 비관적 락(Pessimistic Lock) 획득 및 해제를 자동으로 관리"""

    def __init__(self, lock_repository):
        self.lock_repository = lock_repository

    @contextmanager
    def acquire_lock(self, dashboard_id: int, user_id: str, lock_type: str):
        """컨텍스트 매니저: 락 획득 후 컨텍스트 종료 시 락 자동 해제
        
        사용 예:
        ```
        with lock_manager.acquire_lock(dashboard_id, user_id, "EDIT"):
            # 락이 획득된 상태에서 작업 수행
            do_something()
        # 컨텍스트 종료 시 락 자동 해제
        ```
        """
        lock = None
        try:
            # 락 획득 시도
            lock = self.lock_repository.acquire_lock(dashboard_id, user_id, lock_type)
            if not lock:
                raise PessimisticLockException(
                    detail="락 획득에 실패했습니다",
                    locked_by="Unknown",
                    lock_type=lock_type,
                    dashboard_id=dashboard_id,
                )

            log_info(
                f"락 획득 성공: dashboard_id={dashboard_id}, user_id={user_id}, type={lock_type}"
            )

            # 컨텍스트 내 작업 실행
            yield lock

        except PessimisticLockException:
            # 락 획득 실패 예외는 그대로 전파
            raise
        except Exception as e:
            # 다른 예외 발생 시 로깅 후 전파
            log_error(e, f"락 컨텍스트 내 오류: dashboard_id={dashboard_id}")
            raise
        finally:
            # 컨텍스트 종료 시 락 자동 해제 (획득했을 경우에만)
            if lock:
                try:
                    self.lock_repository.release_lock(dashboard_id, user_id)
                    log_info(
                        f"락 자동 해제 완료: dashboard_id={dashboard_id}, user_id={user_id}"
                    )
                except Exception as e:
                    log_error(
                        e,
                        f"락 자동 해제 실패: dashboard_id={dashboard_id}",
                        {"error": str(e)},
                    )
                    # 락 해제 실패는 critical 이슈가 아니므로 예외를 발생시키지 않음
    
    def auto_release_expired_locks(self):
        """만료된 락을 자동으로 해제하는 메서드
        주기적으로 호출하여 시스템 안정성 확보
        """
        try:
            count = self.lock_repository.cleanup_expired_locks()
            if count > 0:
                log_info(f"만료된 락 자동 해제: {count}건")
            return count
        except Exception as e:
            log_error(e, "만료된 락 자동 해제 실패")
            return 0