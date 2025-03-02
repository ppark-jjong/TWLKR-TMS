# backend/app/utils/exceptions.py
from fastapi import HTTPException, status


class OptimisticLockException(HTTPException):
    """낙관적 락 충돌 시 발생하는 예외"""

    def __init__(self, detail: str, current_version: int = 0):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)
        self.current_version = current_version
