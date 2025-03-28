# teckwah_project/main/server/utils/lock_manager.py
from contextlib import contextmanager
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import time
from fastapi import HTTPException, status

from main.server.utils.logger import log_info, log_error
from main.server.utils.exceptions import PessimisticLockException
from main.server.repositories.lock_repository import LockRepository
from main.server.config.settings import get_settings

settings = get_settings()

class LockManager:
    """락 관리자: 비관적 락(Pessimistic Lock) 획득 및 해제 관리"""

    def __init__(self, repository, db=None):
        self.dashboard_repository = repository
        self.db = getattr(repository, "db", None) if db is None else db
        self.lock_repository = LockRepository(self.db)
        # 락 해제 재시도 설정
        self.release_retry_count = 3
        self.release_retry_delay = 0.5  # 0.5초

    @contextmanager
    def acquire_lock(self, dashboard_id: int, user_id: str, lock_type: str):
        """컨텍스트 매니저: 락 획득 후 컨텍스트 종료 시 락 자동 해제"""
        lock = None
        acquired = False

        try:
            # 락 획득 시도
            lock = self.lock_repository.acquire_lock(dashboard_id, user_id, lock_type)
            acquired = True if lock else False

            if not acquired:
                # 락 획득 실패 - 상세 메시지 대신 표준화된 오류 코드만 포함
                lock_info = self.lock_repository.get_lock_info(dashboard_id)
                error_msg = "다른 사용자가 작업 중입니다"
                
                # 로깅용으로만 상세 정보 기록
                if lock_info:
                    log_info(f"락 충돌: dashboard_id={dashboard_id}, locked_by={lock_info.locked_by}, lock_type={lock_info.lock_type}")
                
                # 프론트엔드에는 최소 정보만 전달
                raise PessimisticLockException(
                    detail={
                        "success": False,
                        "message": error_msg,
                        "error_code": "RESOURCE_LOCKED",
                        "dashboard_id": dashboard_id
                    }
                )

            # 컨텍스트 내 작업 실행
            yield lock

        except PessimisticLockException:
            # 이미 처리된 락 예외는 그대로 전파
            raise
        except Exception as e:
            # 예외 발생 시 로깅 후 전파
            log_error(e, f"락 컨텍스트 내 오류: dashboard_id={dashboard_id}")
            raise

        finally:
            # 컨텍스트 종료 시 락 자동 해제 (획득했을 경우에만)
            if lock and acquired:
                release_success = self._release_lock_with_retry(dashboard_id, user_id)
                if not release_success:
                    log_error(None, f"락 자동 해제 최종 실패: dashboard_id={dashboard_id}, 수동 확인 필요")

    def _release_lock_with_retry(self, dashboard_id: int, user_id: str) -> bool:
        """락 해제 시도 및 실패 시 재시도"""
        for attempt in range(self.release_retry_count):
            try:
                result = self.lock_repository.release_lock(dashboard_id, user_id)
                if result:
                    if attempt > 0:
                        log_info(f"락 해제 재시도 성공 (시도 {attempt+1}): dashboard_id={dashboard_id}")
                    return True
                else:
                    log_error(None, f"락 해제 실패 (시도 {attempt+1}): dashboard_id={dashboard_id}")
            except Exception as e:
                log_error(e, f"락 해제 중 오류 (시도 {attempt+1}): dashboard_id={dashboard_id}")
                
            # 마지막 시도가 아니면 잠시 대기 후 재시도
            if attempt < self.release_retry_count - 1:
                time.sleep(self.release_retry_delay)
        
        return False

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
            acquired_ids = self.lock_repository.acquire_locks_for_multiple_dashboards(
                dashboard_ids, user_id, lock_type
            )

            if len(acquired_ids) != len(dashboard_ids):
                # 일부만 획득 - 모두 실패로 간주하고 이미 획득한 락 해제
                for id in acquired_ids:
                    self._release_lock_with_retry(id, user_id)

                # 상세 정보는 로그만 남기고 프론트엔드에는 간결한 정보만 전달
                failed_ids = list(set(dashboard_ids) - set(acquired_ids))
                log_info(f"다중 락 획득 실패: {failed_ids}")
                
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail={
                        "success": False,
                        "message": "일부 대시보드에 대한 락 획득 실패",
                        "error_code": "RESOURCE_LOCKED"
                    }
                )

            # 모든 락 획득 성공
            yield acquired_ids

        except HTTPException:
            # 이미 처리된 HTTP 예외는 그대로 전파
            raise
        except Exception as e:
            # 예외 발생 시 로깅 후 전파
            log_error(e, f"다중 락 컨텍스트 내 오류: dashboard_ids={dashboard_ids}")
            raise

        finally:
            # 컨텍스트 종료 시 모든 락 자동 해제
            for id in acquired_ids:
                self._release_lock_with_retry(id, user_id)

    def get_lock_status(self, dashboard_id: int) -> Dict[str, Any]:
        """대시보드의 락 상태 정보 조회"""
        try:
            lock_info = self.lock_repository.get_lock_info(dashboard_id)

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