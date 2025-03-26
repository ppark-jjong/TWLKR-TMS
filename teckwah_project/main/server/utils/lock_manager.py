# teckwah_project/main/server/utils/lock_manager.py
from contextlib import contextmanager
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from main.server.utils.logger import log_info, log_error
from main.server.utils.exceptions import PessimisticLockException


class LockManager:
    """락 관리자: 비관적 락(Pessimistic Lock) 획득 및 해제 관리"""

    def __init__(self, repository):
        self.repository = repository

    @contextmanager
    def acquire_lock(self, dashboard_id: int, user_id: str, lock_type: str):
        """컨텍스트 매니저: 락 획득 후 컨텍스트 종료 시 락 자동 해제"""
        lock = None
        acquired = False

        try:
            # 락 획득 시도
            lock = self.repository.acquire_lock(dashboard_id, user_id, lock_type)
            acquired = True if lock else False

            if not acquired:
                # 락 획득 실패
                lock_info = self.repository.get_lock_info(dashboard_id)
                error_msg = f"다른 사용자가 작업 중입니다 (dashboard_id={dashboard_id})"

                if lock_info:
                    error_msg += f", locked_by={lock_info.locked_by}, lock_type={lock_info.lock_type}"

                raise PessimisticLockException(
                    detail=error_msg, dashboard_id=dashboard_id
                )

            # 컨텍스트 내 작업 실행
            yield lock

        except Exception as e:
            # 예외 발생 시 로깅 후 전파
            log_error(e, f"락 컨텍스트 내 오류: dashboard_id={dashboard_id}")
            raise

        finally:
            # 컨텍스트 종료 시 락 자동 해제 (획득했을 경우에만)
            if lock and acquired:
                try:
                    self.repository.release_lock(dashboard_id, user_id)
                except Exception as e:
                    log_error(e, f"락 자동 해제 실패: dashboard_id={dashboard_id}")

    @contextmanager
    def acquire_multiple_locks(
        self, dashboard_ids: List[int], user_id: str, lock_type: str
    ):
        """여러 대시보드에 대한 락 획득 (all-or-nothing)"""
        if not dashboard_ids:
            yield []
            return

        acquired_ids = []
        try:
            # 일괄 락 획득 시도
            acquired_ids = self.repository.acquire_locks_for_multiple_dashboards(
                dashboard_ids, user_id, lock_type
            )

            if len(acquired_ids) != len(dashboard_ids):
                # 일부만 획득 - 모두 실패로 간주하고 이미 획득한 락 해제
                for id in acquired_ids:
                    self.repository.release_lock(id, user_id)

                # 실패 메시지 생성
                raise PessimisticLockException(
                    detail="일부 대시보드에 대한 락 획득 실패",
                    dashboard_ids=list(set(dashboard_ids) - set(acquired_ids)),
                )

            # 모든 락 획득 성공
            yield acquired_ids

        except Exception as e:
            # 예외 발생 시 로깅 후 전파
            log_error(e, f"다중 락 컨텍스트 내 오류: dashboard_ids={dashboard_ids}")
            raise

        finally:
            # 컨텍스트 종료 시 모든 락 자동 해제
            for id in acquired_ids:
                try:
                    self.repository.release_lock(id, user_id)
                except Exception as e:
                    log_error(e, f"다중 락 해제 실패: dashboard_id={id}")

    def get_lock_status(self, dashboard_id: int) -> Dict[str, Any]:
        """대시보드의 락 상태 정보 조회"""
        try:
            lock_info = self.repository.get_lock_info(dashboard_id)

            if not lock_info:
                return {"is_locked": False, "dashboard_id": dashboard_id}

            return {
                "is_locked": not lock_info.is_expired,
                "dashboard_id": dashboard_id,
                "locked_by": lock_info.locked_by,
                "lock_type": lock_info.lock_type,
                "expires_at": lock_info.expires_at.isoformat(),
                "is_expired": lock_info.is_expired,
            }

        except Exception as e:
            log_error(e, f"락 상태 조회 실패: dashboard_id={dashboard_id}")
            return {"is_locked": False, "dashboard_id": dashboard_id, "error": str(e)}
