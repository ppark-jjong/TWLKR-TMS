# teckwah_project/main/server/api/deps.py
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Request, Cookie, Header
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from datetime import datetime

from main.server.config.database import get_db
from main.server.config.settings import get_settings
from main.server.schemas.auth_schema import TokenData
from main.server.utils.logger import log_info, log_error, set_request_id
from main.server.repositories.dashboard_repository import DashboardRepository
from main.server.repositories.lock_repository import LockRepository
from main.server.utils.lock_manager import LockManager
from main.server.utils.datetime_helper import get_kst_now
from main.server.utils.constants import MESSAGES


settings = get_settings()


def get_dashboard_repository(db: Session = Depends(get_db)) -> DashboardRepository:
    """대시보드 레포지토리 의존성 주입"""
    return DashboardRepository(db)


def get_lock_repository(db: Session = Depends(get_db)) -> LockRepository:
    """락 레포지토리 의존성 주입"""
    return LockRepository(db)


def get_lock_manager(
    dashboard_repository: DashboardRepository = Depends(get_dashboard_repository),
    db: Session = Depends(get_db),
) -> LockManager:
    """LockManager 의존성 주입"""
    return LockManager(dashboard_repository, db)


async def get_current_user(
    authorization: str = Header(None, alias="Authorization"),
    request: Request = None,
) -> TokenData:
    """Authorization 헤더에서 토큰 추출하여 사용자 정보 반환"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "message": MESSAGES["ERROR"]["UNAUTHORIZED"],
                "error_code": "UNAUTHORIZED",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ")[1]

    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )

        # 토큰 만료 검증 (KST 시간 사용)
        exp = payload.get("exp")
        if not exp or get_kst_now().timestamp() > exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "success": False,
                    "message": "인증이 만료되었습니다",
                    "error_code": "TOKEN_EXPIRED",
                },
            )

        return TokenData(
            user_id=payload.get("sub"),
            department=payload.get("department"),
            role=payload.get("role"),
        )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "message": MESSAGES["ERROR"]["UNAUTHORIZED"],
                "error_code": "INVALID_TOKEN",
            },
        )


async def check_admin_access(current_user: TokenData = Depends(get_current_user)):
    """관리자 권한 체크"""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "message": MESSAGES["ERROR"]["FORBIDDEN"],
                "error_code": "FORBIDDEN",
            },
        )
    return current_user


async def get_transaction_db():
    """트랜잭션 세션 제공 (with 구문과 사용)"""
    db = next(get_db())
    try:
        yield db
        db.commit()
    except:
        db.rollback()
        raise
    finally:
        db.close()