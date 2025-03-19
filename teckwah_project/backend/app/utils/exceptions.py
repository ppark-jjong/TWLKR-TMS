# backend/app/utils/exceptions.py

from fastapi import HTTPException, status
from datetime import datetime

class PessimisticLockException(HTTPException):
    """비관적 락 충돌 시 발생하는 예외"""

    def __init__(
        self, 
        detail: str, 
        locked_by: str = None, 
        lock_type: str = None,
        dashboard_id: int = None,
        expires_at: datetime = None
    ):
        super().__init__(status_code=status.HTTP_423_LOCKED, detail=detail)
        self.locked_by = locked_by
        self.lock_type = lock_type
        self.dashboard_id = dashboard_id
        self.expires_at = expires_at
        
    def to_dict(self):
        """예외 정보를 딕셔너리로 변환"""
        result = {"message": self.detail}
        if self.locked_by:
            result["locked_by"] = self.locked_by
        if self.lock_type:
            result["lock_type"] = self.lock_type
        if self.dashboard_id:
            result["dashboard_id"] = self.dashboard_id
        if self.expires_at:
            result["expires_at"] = self.expires_at.isoformat()
        return result


class DatabaseLockTimeoutException(PessimisticLockException):
    """데이터베이스 락 타임아웃 시 발생하는 예외"""
    
    def __init__(self, detail: str = "데이터베이스 락 획득 시간 초과"):
        super().__init__(detail=detail)


class ConcurrentModificationException(PessimisticLockException):
    """동시 수정 충돌 시 발생하는 예외"""
    
    def __init__(self, detail: str = "다른 사용자가 이미 데이터를 수정했습니다"):
        super().__init__(detail=detail)