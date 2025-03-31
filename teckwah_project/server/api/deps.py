# server/api/deps.py - 필요한 함수 추가

from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Request, Cookie, Header
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from datetime import datetime
from fastapi.security import OAuth2PasswordBearer

from server.config.database import get_db
from server.config.settings import get_settings, Settings
from server.schemas.auth_schema import TokenData
from server.utils.logger import log_info, log_error, set_request_id, log_warning
from server.repositories.dashboard_repository import DashboardRepository
from server.repositories.lock_repository import LockRepository
from server.utils.lock_manager import LockManager
from server.utils.datetime import get_kst_now
from server.utils.constants import MESSAGES
from server.utils.datetime import get_kst_now as get_kst_now_helper
from server.utils.auth import get_token_data_from_header, verify_admin_role
from server.services.dashboard_lock_service import DashboardLockService
from server.utils.error import UnauthorizedException, ForbiddenException
from server.models.user_model import User
from server.domains.dashboard_manager import DashboardManager

settings = get_settings()

# OAuth2 설정
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


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


def get_dashboard_lock_service(db: Session = Depends(get_db)) -> DashboardLockService:
    """DashboardLockService 의존성 주입 함수"""
    return DashboardLockService(db=db)


def get_request_id():
    """요청 ID 생성"""
    import uuid

    return str(uuid.uuid4())


def get_settings_dependency():
    """설정 의존성"""
    return settings


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="유효하지 않은 인증 정보",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # 토큰 디코딩
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        # 토큰 만료 확인
        exp: int = payload.get("exp")
        if not exp or datetime.fromtimestamp(exp) < datetime.now():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="토큰이 만료되었습니다",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # 사용자 정보 확인
        token_data = TokenData(
            user_id=user_id,
            user_name=payload.get("user_name", ""),
            user_department=payload.get("user_department", ""),
            is_admin=payload.get("is_admin", False),
            is_active=payload.get("is_active", True),
        )
        
        # DB에서 사용자 확인
        user = db.query(User).filter(User.user_id == user_id).first()
        if user is None or not user.is_active:
            raise credentials_exception
        
        return token_data
    except JWTError as e:
        log_error(f"JWT 검증 오류: {str(e)}")
        raise credentials_exception


async def get_admin_user(
    current_user: TokenData = Depends(get_current_user)
) -> TokenData:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="접근 권한이 없습니다. 관리자만 이 기능을 사용할 수 있습니다."
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


def get_dashboard_manager(db: Session = Depends(get_db)) -> DashboardManager:
    """DashboardManager 의존성 주입 헬퍼"""
    return DashboardManager(db)