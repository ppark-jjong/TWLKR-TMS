# backend/app/utils/exceptions.py
from fastapi import HTTPException, status


class OptimisticLockException(HTTPException):
    """낙관적 락 충돌 시 발생하는 예외"""

    def __init__(self, detail: str, current_version: int = 0):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)
        self.current_version = current_version


class PessimisticLockException(HTTPException):
    """비관적 락 충돌 시 발생하는 예외"""

    def __init__(self, detail: str, locked_by: str = None):
        super().__init__(status_code=status.HTTP_423_LOCKED, detail=detail)
        self.locked_by = locked_by
