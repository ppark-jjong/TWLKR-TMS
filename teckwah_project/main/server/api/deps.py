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
from main.server.models.dashboard_model import Dashboard
from main.server.schemas.dashboard_schema import StatusUpdate
from main.server.repositories.dashboard_repository import DashboardRepository
from main.server.repositories.dashboard_lock_repository import DashboardLockRepository
from main.server.repositories.dashboard_remark_repository import DashboardRemarkRepository
from main.server.utils.lock_manager import LockManager

settings = get_settings()


def get_repositories(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """모든 저장소 인스턴스 반환"""
    return {
        "dashboard": DashboardRepository(db),
        "remark": DashboardRemarkRepository(db),
        "lock": DashboardLockRepository(db),
    }


def get_lock_manager(repos: Dict[str, Any] = Depends(get_repositories)) -> LockManager:
    """LockManager 의존성 주입"""
    return LockManager(repos["lock"])

async def get_current_user(
    authorization: str = Header(None, alias="Authorization"),
    request: Request = None,
) -> TokenData:
    """Authorization 헤더에서 토큰 추출하여 사용자 정보 반환"""
    # 미들웨어에서 이미 요청 ID를 설정했으므로 여기서는 불필요
    # if request:
    #     set_request_id()

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "인증이 필요합니다"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ")[1]

    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )

        # 토큰 만료 검증
        exp = payload.get("exp")
        if not exp or datetime.utcnow().timestamp() > exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail={"success": False, "message": "인증이 만료되었습니다"}
            )

        return TokenData(
            user_id=payload.get("sub"),
            department=payload.get("department"),
            role=payload.get("role"),
        )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail={"success": False, "message": "인증에 실패했습니다"}
        )

async def check_admin_access(current_user: TokenData = Depends(get_current_user)):
    """관리자 권한 체크"""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"success": False, "message": "권한이 없습니다"}
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