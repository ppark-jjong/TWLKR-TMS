# teckwah_project/main/server/api/deps.py
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Request, Cookie, Header
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from datetime import datetime

from main.server.config.database import get_db
from main.server.config.settings import get_settings, Settings
from main.server.schemas.auth_schema import TokenData
from main.server.utils.logger import log_info, log_error, set_request_id
from main.server.repositories.dashboard_repository import DashboardRepository
from main.server.repositories.lock_repository import LockRepository
from main.server.utils.lock_manager import LockManager
from main.server.utils.datetime import get_kst_now
from main.server.utils.constants import MESSAGES
from main.server.utils.datetime import get_kst_now as get_kst_now_helper
from main.server.utils.auth import get_token_data_from_header, verify_admin_role


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


def get_request_id():
    """요청 ID 생성"""
    import uuid

    return str(uuid.uuid4())


def get_settings_dependency():
    """설정 의존성"""
    return settings


async def get_current_user(
    authorization: str = Header(None, alias="Authorization"),
    request: Request = None,
) -> TokenData:
    """Authorization 헤더에서 토큰 추출하여 사용자 정보 반환

    모든 인증이 필요한 API 엔드포인트에서 사용되는 의존성 함수입니다.
    """
    try:
        return get_token_data_from_header(authorization)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "message": MESSAGES["ERROR"]["UNAUTHORIZED"],
                "error_code": "UNAUTHORIZED",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )


async def check_admin_access(current_user: TokenData = Depends(get_current_user)):
    """관리자 권한 체크"""
    return await verify_admin_role(current_user)


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
