# teckwah_project/server/services/dashboard_lock_service.py
from typing import Dict, Any, Optional, List
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from server.config.database import get_db
from server.models.dashboard_lock_model import DashboardLock
from server.models.dashboard_model import Dashboard
from server.utils.datetime import get_kst_now
from server.utils.error import NotFoundException, LockConflictException


class DashboardLockService:
    def __init__(self, db: Session = Depends(get_db)):
        self.db = db
        self.lock_timeout = timedelta(minutes=5)  # 기본 5분

    def acquire_lock(
        self, dashboard_id: int, lock_type: str, user_id: str
    ) -> Dict[str, Any]:
        """대시보드 락을 획득합니다."""
        # 대시보드 존재 확인
        dashboard = (
            self.db.query(Dashboard)
            .filter(Dashboard.dashboard_id == dashboard_id)
            .first()
        )
        if not dashboard:
            raise NotFoundException(
                f"ID가 {dashboard_id}인 대시보드를 찾을 수 없습니다"
            )

        # 기존 락 확인
        lock = (
            self.db.query(DashboardLock)
            .filter(
                DashboardLock.dashboard_id == dashboard_id,
                DashboardLock.lock_type == lock_type,
            )
            .first()
        )

        # 락이 이미 존재하면 확인
        if lock:
            # 만료된 락이면 갱신
            if lock.is_expired:
                lock.locked_by = user_id
                lock.locked_at = get_kst_now()
                lock.expires_at = get_kst_now() + self.lock_timeout
            # 다른 사용자의 락이면 에러
            elif lock.locked_by != user_id:
                return {
                    "success": False,
                    "message": f"다른 사용자가 수정 중입니다 (잠금 해제: {lock.expires_at.isoformat()})",
                    "data": {
                        "is_locked": True,
                        "dashboard_id": dashboard_id,
                        "locked_by": lock.locked_by,
                        "lock_type": lock.lock_type,
                        "expires_at": lock.expires_at.isoformat(),
                    },
                }
            # 현재 사용자의 락이면 갱신
            else:
                lock.locked_at = get_kst_now()
                lock.expires_at = get_kst_now() + self.lock_timeout
        # 락이 없으면 새로 생성
        else:
            lock = DashboardLock(
                dashboard_id=dashboard_id,
                locked_by=user_id,
                lock_type=lock_type,
                locked_at=get_kst_now(),
                expires_at=get_kst_now() + self.lock_timeout,
            )
            self.db.add(lock)

        self.db.commit()
        self.db.refresh(lock)

        return {
            "success": True,
            "message": "락을 획득했습니다",
            "data": {
                "dashboard_id": dashboard_id,
                "locked_by": lock.locked_by,
                "lock_type": lock.lock_type,
                "expires_at": lock.expires_at.isoformat(),
            },
        }

    def release_lock(
        self, dashboard_id: int, lock_type: str, user_id: str
    ) -> Dict[str, Any]:
        """대시보드 락을 해제합니다."""
        # 락 확인
        lock = (
            self.db.query(DashboardLock)
            .filter(
                DashboardLock.dashboard_id == dashboard_id,
                DashboardLock.lock_type == lock_type,
            )
            .first()
        )

        # 락이 없으면 이미 해제됨 응답
        if not lock:
            return {
                "success": True,
                "message": "이미 잠금이 해제되었습니다",
            }

        # 다른 사용자의 락이면 에러
        if lock.locked_by != user_id:
            return {
                "success": False,
                "message": "다른 사용자의 락은 해제할 수 없습니다",
            }

        # 락 삭제
        self.db.delete(lock)
        self.db.commit()

        return {
            "success": True,
            "message": "락을 해제했습니다",
        }

    def get_lock_info(self, dashboard_id: int, lock_type: str) -> Dict[str, Any]:
        """대시보드 락 정보를 조회합니다."""
        # 락 확인
        lock = (
            self.db.query(DashboardLock)
            .filter(
                DashboardLock.dashboard_id == dashboard_id,
                DashboardLock.lock_type == lock_type,
            )
            .first()
        )

        # 락이 없으면 잠금 없음 응답
        if not lock:
            return {
                "is_locked": False,
                "dashboard_id": dashboard_id,
                "lock_type": lock_type,
            }

        # 만료된 락이면 잠금 없음 응답
        if lock.is_expired:
            return {
                "is_locked": False,
                "dashboard_id": dashboard_id,
                "lock_type": lock_type,
                "expired": True,
            }

        # 현재 락 정보 응답
        return {
            "is_locked": True,
            "dashboard_id": dashboard_id,
            "locked_by": lock.locked_by,
            "lock_type": lock_type,
            "locked_at": lock.locked_at.isoformat(),
            "expires_at": lock.expires_at.isoformat(),
        }


def get_dashboard_lock_service(db: Session = Depends(get_db)) -> DashboardLockService:
    """DashboardLockService 의존성 주입 함수"""
    return DashboardLockService(db=db)
