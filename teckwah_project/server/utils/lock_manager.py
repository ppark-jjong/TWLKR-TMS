# teckwah_project/server/utils/lock_manager.py
import time
from contextlib import contextmanager
from typing import List, Dict, Any, Optional, Set, Tuple
from sqlalchemy.orm import Session

from server.models.dashboard_lock_model import DashboardLock
from server.utils.logger import log_info, log_error, log_warning
from server.utils.error import LockConflictException
from server.utils.datetime import get_kst_now
from server.config.settings import get_settings

settings = get_settings()


class LockManager:
    """개선된 비관적 락 관리자

    이 클래스는 대시보드 항목에 대한 락 획득, 해제, 확장 등을 담당합니다.
    컨텍스트 매니저를 통한 with 문 지원을 제공합니다.
    """

    def __init__(self, repository, db: Session, service=None):
        self.repository = repository
        self.db = db
        self.service = service
        self.max_retry = 0  # 락 획득 재시도 없음
        self.retry_delay = 0  # 재시도 대기 시간 없음
        self.release_retry_count = 1  # 락 해제 재시도 없음
        self.release_retry_delay = 0  # 락 해제 재시도 대기 시간 없음

    @contextmanager
    def acquire_lock(self, dashboard_id: int, user_id: str, lock_type: str = "EDIT"):
        """단일 대시보드 락 획득 및 자동 해제 (with 문 지원)

        사용 예:
        with lock_manager.acquire_lock(dashboard_id, user_id) as lock:
            # 락이 획득된 상태에서 작업 수행
            service.update_dashboard(...)
        # with 블록 종료 시 자동으로 락 해제
        """
        lock = None
        acquired = False

        try:
            # 락 획득 시도 (재시도 없음)
            try:
                # 서비스가 있으면 서비스 통해 락 획득, 없으면 리포지토리 직접 호출
                if self.service:
                    result = self.service.acquire_lock(dashboard_id, lock_type, user_id)
                    if result and result.get("success", False):
                        lock = result.get("data", {})
                        acquired = True
                else:
                    # 저장소 직접 접근
                    lock_obj = self.repository.acquire_lock(
                        dashboard_id, user_id, lock_type
                    )
                    if lock_obj:
                        acquired = True
                        lock = {
                            "dashboard_id": dashboard_id,
                            "locked_by": lock_obj.locked_by,
                            "lock_type": lock_obj.lock_type,
                            "expires_at": lock_obj.expires_at.isoformat(),
                        }
            except LockConflictException as e:
                log_warning(f"락 획득 실패 (충돌): dashboard_id={dashboard_id}")
                raise
            except Exception as e:
                log_error(e, f"락 획득 실패: dashboard_id={dashboard_id}")
                raise

            if not acquired:
                raise LockConflictException(
                    f"ID {dashboard_id}인 대시보드의 락 획득에 실패했습니다"
                )

            yield lock

        finally:
            # 컨텍스트 종료 시 락 자동 해제 (획득했을 경우에만)
            if lock and acquired:
                self._release_lock_with_retry(dashboard_id, user_id, lock_type)

    @contextmanager
    def acquire_multiple_locks(
        self, dashboard_ids: List[int], user_id: str, lock_type: str = "EDIT"
    ):
        """여러 대시보드 락 획득 및 자동 해제 (with 문 지원)

        사용 예:
        with lock_manager.acquire_multiple_locks([1, 2, 3], user_id) as locks:
            # 모든 락이 획득된 상태에서 작업 수행
            service.update_multiple_dashboards(...)
        # with 블록 종료 시 자동으로 모든 락 해제
        """
        acquired_ids = set()  # 성공적으로 락을 획득한 대시보드 ID 목록
        locks = []

        try:
            # 각 대시보드에 대해 락 획득 시도
            for dashboard_id in dashboard_ids:
                try:
                    # 락 획득 시도 (재시도 없음)
                    if self.service:
                        result = self.service.acquire_lock(
                            dashboard_id, lock_type, user_id
                        )
                        if result and result.get("success", False):
                            locks.append(result.get("data", {}))
                            acquired_ids.add(dashboard_id)
                        else:
                            # 락 획득 실패 메시지 확인
                            error_msg = (
                                result.get("message", "알 수 없는 오류")
                                if result
                                else "락 획득 실패"
                            )
                            raise LockConflictException(error_msg)
                    else:
                        # 저장소 직접 접근
                        lock_obj = self.repository.acquire_lock(
                            dashboard_id, user_id, lock_type
                        )
                        if lock_obj:
                            locks.append(
                                {
                                    "dashboard_id": dashboard_id,
                                    "locked_by": lock_obj.locked_by,
                                    "lock_type": lock_obj.lock_type,
                                    "expires_at": lock_obj.expires_at.isoformat(),
                                }
                            )
                            acquired_ids.add(dashboard_id)
                        else:
                            raise LockConflictException(
                                f"ID {dashboard_id}인 대시보드의 락 획득에 실패했습니다"
                            )
                except Exception as e:
                    # 실패 시 이미 획득한 모든 락 롤백
                    for id in acquired_ids:
                        self._release_lock_with_retry(id, user_id, lock_type)

                    # "모두 성공 아니면 모두 실패" 원칙에 따라 예외 발생
                    log_error(e, "다중 락 획득 실패")
                    if isinstance(e, LockConflictException):
                        raise
                    raise LockConflictException(f"다중 락 획득 실패: {str(e)}")

            # 모든 락을 성공적으로 획득했으면 작업 수행
            yield locks

        finally:
            # 작업 완료 후 모든 획득한 락 해제
            for id in acquired_ids:
                self._release_lock_with_retry(id, user_id, lock_type)

    def _release_lock_with_retry(
        self, dashboard_id: int, user_id: str, lock_type: str = "EDIT"
    ) -> bool:
        """락 해제 시도 (재시도 없음)"""
        try:
            if self.service:
                result = self.service.release_lock(dashboard_id, lock_type, user_id)
                if result and result.get("success", False):
                    return True
            else:
                # 저장소 직접 접근
                if self.repository.release_lock(dashboard_id, user_id):
                    return True

            log_warning(f"락 해제 실패: dashboard_id={dashboard_id}")
        except Exception as e:
            log_error(
                e,
                f"락 해제 중 오류: dashboard_id={dashboard_id}",
            )

        log_error(
            None, f"락 해제 최종 실패: dashboard_id={dashboard_id}, 수동 확인 필요"
        )
        return False

    def get_lock_status(
        self, dashboard_id: int, lock_type: str = None
    ) -> Dict[str, Any]:
        """대시보드의 락 상태 정보 조회"""
        try:
            if self.service:
                return self.service.get_lock_info(dashboard_id, lock_type)
            else:
                lock_info = self.repository.get_lock_info(dashboard_id)

                if not lock_info:
                    return {
                        "is_locked": False,
                        "dashboard_id": dashboard_id,
                        "lock_type": lock_type,
                    }

                # 락 타입 필터링 (지정된 경우)
                if lock_type and lock_info.lock_type != lock_type:
                    return {
                        "is_locked": False,
                        "dashboard_id": dashboard_id,
                        "lock_type": lock_type,
                    }

                return {
                    "is_locked": not lock_info.is_expired,
                    "dashboard_id": dashboard_id,
                    "locked_by": lock_info.locked_by,
                    "lock_type": lock_info.lock_type,
                    "locked_at": lock_info.locked_at.isoformat(),
                    "expires_at": lock_info.expires_at.isoformat(),
                    "is_expired": lock_info.is_expired,
                }
        except Exception as e:
            log_error(e, f"락 상태 조회 실패: dashboard_id={dashboard_id}")
            return {
                "is_locked": False,
                "dashboard_id": dashboard_id,
                "lock_type": lock_type,
                "error": str(e),
            }
