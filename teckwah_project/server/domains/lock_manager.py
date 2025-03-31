from contextlib import contextmanager
from typing import List, Dict, Any, Optional, Set
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from fastapi import HTTPException, status

from server.models.dashboard_lock_model import DashboardLock
from server.models.dashboard_model import Dashboard
from server.utils.logger import log_info, log_error, log_warning
from server.utils.error import LockConflictException
from server.utils.datetime import get_kst_now
from server.config.settings import get_settings

settings = get_settings()

class LockManager:
    """
    개선된 락 관리자
    
    데이터베이스 트랜잭션과 락 관리를 통합하여 원자성을 보장합니다.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.lock_timeout_seconds = settings.LOCK_TIMEOUT_SECONDS
    
    @contextmanager
    def acquire_lock(self, dashboard_id: int, user_id: str, lock_type: str = "EDIT"):
        """
        단일 대시보드 락 획득 및 자동 해제 (with 문 지원)
        
        락 획득과 해제를 자동으로 관리하며, 트랜잭션과 통합되어 있습니다.
        """
        # 대시보드 존재 확인
        dashboard = self.db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
        if not dashboard:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"ID가 {dashboard_id}인 대시보드를 찾을 수 없습니다"
            )
        
        # 락 획득 시도
        lock = None
        acquired = False
        
        try:
            # 기존 락 조회
            existing_lock = (
                self.db.query(DashboardLock)
                .filter(DashboardLock.dashboard_id == dashboard_id)
                .first()
            )
            
            now = get_kst_now()
            
            if existing_lock:
                # 만료된 락이면 새로 획득
                if existing_lock.expires_at < now:
                    self.db.delete(existing_lock)
                    self.db.flush()
                    lock = self._create_new_lock(dashboard_id, user_id, lock_type)
                    acquired = True
                # 현재 사용자 락이면 갱신
                elif existing_lock.locked_by == user_id:
                    existing_lock.expires_at = now + timedelta(seconds=self.lock_timeout_seconds)
                    self.db.flush()
                    lock = existing_lock
                    acquired = True
                # 다른 사용자의 락이면 충돌
                else:
                    # 명확한 락 충돌 메시지 제공
                    remaining_time = (existing_lock.expires_at - now).total_seconds()
                    raise LockConflictException(
                        detail=f"다른 사용자({existing_lock.locked_by})가 {lock_type} 작업 중입니다. " 
                               f"약 {int(remaining_time / 60)}분 {int(remaining_time % 60)}초 후 다시 시도해주세요.",
                        error_code="LOCK_CONFLICT",
                        lock_info={
                            "dashboard_id": dashboard_id,
                            "locked_by": existing_lock.locked_by,
                            "lock_type": existing_lock.lock_type,
                            "expires_at": existing_lock.expires_at.isoformat(),
                            "remaining_seconds": int(remaining_time),
                        }
                    )
            else:
                # 락이 없으면 새로 생성
                lock = self._create_new_lock(dashboard_id, user_id, lock_type)
                acquired = True
            
            # 컨텍스트로 락 객체 전달
            yield lock
            
        except LockConflictException:
            # 락 충돌은 그대로 전파
            raise
        except Exception as e:
            # 기타 예외 처리
            log_error(f"락 획득/사용 중 오류: dashboard_id={dashboard_id}, error={str(e)}")
            raise
        finally:
            # 락 해제 시도 (획득했을 경우에만)
            if acquired and lock:
                try:
                    self._release_lock(dashboard_id, user_id)
                except Exception as e:
                    log_error(f"락 해제 실패: dashboard_id={dashboard_id}, error={str(e)}")
    
    def _create_new_lock(self, dashboard_id: int, user_id: str, lock_type: str) -> DashboardLock:
        """새 락 생성 - 내부 메서드"""
        now = get_kst_now()
        lock = DashboardLock(
            dashboard_id=dashboard_id,
            locked_by=user_id,
            locked_at=now,
            lock_type=lock_type,
            expires_at=now + timedelta(seconds=self.lock_timeout_seconds),
        )
        self.db.add(lock)
        self.db.flush()
        log_info(f"락 획득: dashboard_id={dashboard_id}, user_id={user_id}, type={lock_type}")
        return lock
    
    def _release_lock(self, dashboard_id: int, user_id: str) -> bool:
        """락 해제 시도 - 내부 메서드"""
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
            log_info(f"락 해제: dashboard_id={dashboard_id}, user_id={user_id}")
            return True
        except Exception as e:
            log_error(f"락 해제 오류: dashboard_id={dashboard_id}, error={str(e)}")
            return False
    
    @contextmanager
    def acquire_multiple_locks(self, dashboard_ids: List[int], user_id: str, lock_type: str = "EDIT"):
        """
        다중 대시보드 락 획득 및 자동 해제 (with 문 지원)
        
        All-or-Nothing 원칙: 모든 락 획득 성공 또는 전체 실패
        """
        if not dashboard_ids:
            yield []
            return
        
        # 모든 대시보드가 존재하는지 한 번에 확인
        existing_ids = set(
            row[0]
            for row in self.db.query(Dashboard.dashboard_id)
            .filter(Dashboard.dashboard_id.in_(dashboard_ids))
            .all()
        )
        
        missing_ids = [id for id in dashboard_ids if id not in existing_ids]
        if missing_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"존재하지 않는 대시보드 ID: {missing_ids}"
            )
        
        acquired_ids: Set[int] = set()  # 획득한 락 ID 추적
        locks = []
        
        try:
            # 모든 기존 락 상태를 한 번에 조회 (N+1 문제 방지)
            existing_locks = {
                lock.dashboard_id: lock
                for lock in self.db.query(DashboardLock)
                .filter(DashboardLock.dashboard_id.in_(dashboard_ids))
                .all()
            }
            
            now = get_kst_now()
            
            # 모든 대시보드에 대해 락 획득 시도
            for dashboard_id in dashboard_ids:
                existing_lock = existing_locks.get(dashboard_id)
                
                if existing_lock:
                    # 만료된 락이면 새로 획득
                    if existing_lock.expires_at < now:
                        self.db.delete(existing_lock)
                        self.db.flush()
                        lock = self._create_new_lock(dashboard_id, user_id, lock_type)
                        locks.append(lock)
                        acquired_ids.add(dashboard_id)
                    # 현재 사용자 락이면 갱신
                    elif existing_lock.locked_by == user_id:
                        existing_lock.expires_at = now + timedelta(seconds=self.lock_timeout_seconds)
                        self.db.flush()
                        locks.append(existing_lock)
                        acquired_ids.add(dashboard_id)
                    # 다른 사용자의 락이면 충돌 - 모든 락 롤백
                    else:
                        # 이미 획득한 락 모두 해제
                        for id in acquired_ids:
                            self._release_lock(id, user_id)
                        
                        # 충돌 발생 메시지 명확하게 제공
                        remaining_time = (existing_lock.expires_at - now).total_seconds()
                        raise LockConflictException(
                            detail=f"ID {dashboard_id}인 대시보드를 다른 사용자({existing_lock.locked_by})가 " 
                                   f"작업 중입니다. 약 {int(remaining_time / 60)}분 {int(remaining_time % 60)}초 후 다시 시도해주세요.",
                            error_code="LOCK_CONFLICT",
                            lock_info={
                                "dashboard_id": dashboard_id,
                                "locked_by": existing_lock.locked_by,
                                "lock_type": existing_lock.lock_type,
                                "expires_at": existing_lock.expires_at.isoformat(),
                                "remaining_seconds": int(remaining_time),
                            }
                        )
                else:
                    # 락이 없으면 새로 생성
                    lock = self._create_new_lock(dashboard_id, user_id, lock_type)
                    locks.append(lock)
                    acquired_ids.add(dashboard_id)
            
            # 모든 락 획득 성공 - 작업 진행
            yield locks
            
        except LockConflictException:
            # 락 충돌은 그대로 전파 (rollback은 finally에서 처리)
            raise
        except Exception as e:
            # 기타 예외 처리
            log_error(f"다중 락 획득/사용 중 오류: dashboard_ids={dashboard_ids}, error={str(e)}")
            raise
        finally:
            # 모든 획득한 락 해제 시도
            for id in acquired_ids:
                try:
                    self._release_lock(id, user_id)
                except Exception as e:
                    log_error(f"다중 락 해제 실패: dashboard_id={id}, error={str(e)}")
    
    def get_lock_info(self, dashboard_id: int) -> Dict[str, Any]:
        """대시보드 락 상태 정보 조회"""
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
                }
            
            # 만료 여부 확인
            now = get_kst_now()
            is_expired = lock.expires_at < now
            
            # 남은 시간 계산
            remaining_seconds = 0
            if not is_expired:
                remaining_seconds = int((lock.expires_at - now).total_seconds())
            
            return {
                "is_locked": not is_expired,
                "dashboard_id": dashboard_id,
                "locked_by": lock.locked_by,
                "lock_type": lock.lock_type,
                "locked_at": lock.locked_at.isoformat(),
                "expires_at": lock.expires_at.isoformat(),
                "is_expired": is_expired,
                "remaining_seconds": remaining_seconds,
            }
        except Exception as e:
            log_error(f"락 상태 조회 실패: dashboard_id={dashboard_id}, error={str(e)}")
            return {
                "is_locked": False,
                "dashboard_id": dashboard_id,
                "error": str(e),
            } 