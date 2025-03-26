# teckwah_project/main/server/utils/lock_manager.py
from contextlib import contextmanager
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from main.server.utils.logger import log_info, log_error
from main.server.utils.exceptions import PessimisticLockException


class LockManager:
    """락 관리자: 비관적 락(Pessimistic Lock) 획득 및 해제를 자동으로 관리"""

    def __init__(self, lock_repository):
        self.lock_repository = lock_repository
        # 락 재시도 관련 기본 설정
        self.retry_count = 3
        self.retry_delay_ms = 500  # 재시도 간 대기 시간(밀리초)

    @contextmanager
    def acquire_lock(self, dashboard_id: int, user_id: str, lock_type: str, retry: bool = False):
        """
        컨텍스트 매니저: 락 획득 후 컨텍스트 종료 시 락 자동 해제
        
        Args:
            dashboard_id: 대시보드 ID
            user_id: 사용자 ID
            lock_type: 락 타입 (EDIT, STATUS 등)
            retry: 락 획득 실패 시 재시도 여부
        
        Raises:
            PessimisticLockException: 락 획득 실패 시
        """
        lock = None
        acquired = False
        attempt = 0
        
        try:
            # 락 획득 시도 (재시도 옵션 적용)
            while not acquired and (attempt == 0 or (retry and attempt < self.retry_count)):
                attempt += 1
                
                try:
                    lock = self.lock_repository.acquire_lock(dashboard_id, user_id, lock_type)
                    
                    if lock:
                        acquired = True
                        log_info(
                            f"락 획득 성공: dashboard_id={dashboard_id}, user_id={user_id}, type={lock_type}, attempt={attempt}"
                        )
                    elif attempt < self.retry_count and retry:
                        # 재시도 대기
                        import time
                        time.sleep(self.retry_delay_ms / 1000)
                        log_info(f"락 획득 재시도 {attempt}/{self.retry_count}: dashboard_id={dashboard_id}")
                        
                except PessimisticLockException as e:
                    if not retry or attempt >= self.retry_count:
                        # 재시도 불가 또는 최대 재시도 횟수 초과
                        raise
                    
                    # 재시도 대기
                    import time
                    time.sleep(self.retry_delay_ms / 1000)
                    log_info(f"락 획득 실패 후 재시도 {attempt}/{self.retry_count}: dashboard_id={dashboard_id}")

            # 모든 재시도 후에도 락 획득 실패
            if not acquired:
                error_msg = f"다른 사용자가 작업 중입니다 (dashboard_id={dashboard_id})"
                lock_info = self.lock_repository.get_lock_info(dashboard_id)
                
                if lock_info:
                    error_msg += f", locked_by={lock_info.locked_by}, lock_type={lock_info.lock_type}"
                
                raise PessimisticLockException(
                    detail=error_msg,
                    dashboard_id=dashboard_id
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
                    release_result = self.lock_repository.release_lock(dashboard_id, user_id)
                    if release_result:
                        log_info(
                            f"락 자동 해제 완료: dashboard_id={dashboard_id}, user_id={user_id}"
                        )
                    else:
                        log_error(
                            None,
                            f"락 자동 해제 실패 (권한 없음): dashboard_id={dashboard_id}, user_id={user_id}"
                        )
                except Exception as e:
                    log_error(
                        e,
                        f"락 자동 해제 실패: dashboard_id={dashboard_id}",
                        {"error": str(e)},
                    )

    @contextmanager
    def acquire_multiple_locks(self, dashboard_ids: List[int], user_id: str, lock_type: str):
        """
        여러 대시보드에 대한 락 획득 (all-or-nothing)
        
        Args:
            dashboard_ids: 대시보드 ID 목록
            user_id: 사용자 ID
            lock_type: 락 타입
            
        Raises:
            PessimisticLockException: 락 획득 실패 시
        """
        if not dashboard_ids:
            # 락 획득할 대시보드가 없음
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
                missing_ids = set(dashboard_ids) - set(acquired_ids)
                log_error(
                    None,
                    f"일부 락만 획득됨: 획득={len(acquired_ids)}, 실패={len(missing_ids)}",
                    {"acquired": acquired_ids, "missing": list(missing_ids)}
                )
                
                # 획득한 락 해제
                for id in acquired_ids:
                    self.lock_repository.release_lock(id, user_id)
                    
                # 실패 정보 수집하여 예외 발생    
                lock_info = None
                if missing_ids:
                    # 첫 번째 실패한 ID에 대한 락 정보 조회
                    first_missing = next(iter(missing_ids))
                    lock_info = self.lock_repository.get_lock_info(first_missing)
                
                raise PessimisticLockException(
                    detail="일부 대시보드에 대한 락 획득 실패",
                    dashboard_ids=list(missing_ids),
                    locked_by=lock_info.locked_by if lock_info else None
                )
                
            # 모든 락 획득 성공
            log_info(f"다중 락 획득 성공: {len(acquired_ids)}개, user_id={user_id}, type={lock_type}")
            yield acquired_ids
            
        except Exception as e:
            # 예외 발생 시 로깅 후 전파
            log_error(e, f"다중 락 컨텍스트 내 오류: dashboard_ids={dashboard_ids}")
            raise
            
        finally:
            # 컨텍스트 종료 시 모든 락 자동 해제
            for id in acquired_ids:
                try:
                    self.lock_repository.release_lock(id, user_id)
                except Exception as e:
                    log_error(e, f"다중 락 해제 실패: dashboard_id={id}", {"user_id": user_id})

    def auto_release_expired_locks(self) -> int:
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
            
    def get_lock_status(self, dashboard_id: int) -> Dict[str, Any]:
        """
        대시보드의 락 상태 정보 조회
        
        Args:
            dashboard_id: 대시보드 ID
            
        Returns:
            락 상태 정보를 담은 딕셔너리
        """
        try:
            lock_info = self.lock_repository.get_lock_info(dashboard_id)
            
            if not lock_info:
                return {
                    "is_locked": False,
                    "dashboard_id": dashboard_id
                }
                
            # 만료 여부 확인
            is_expired = lock_info.is_expired
            
            return {
                "is_locked": not is_expired,
                "dashboard_id": dashboard_id,
                "locked_by": lock_info.locked_by,
                "lock_type": lock_info.lock_type,
                "expires_at": lock_info.expires_at.isoformat(),
                "is_expired": is_expired
            }
            
        except Exception as e:
            log_error(e, f"락 상태 조회 실패: dashboard_id={dashboard_id}")
            # 오류 발생 시 기본값 반환
            return {
                "is_locked": False,
                "dashboard_id": dashboard_id,
                "error": str(e)
            }