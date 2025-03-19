# backend/app/api/deps.py
from typing import Optional
from fastapi import Depends, HTTPException, status, Request, Cookie, Header
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from datetime import datetime

from app.config.database import get_db
from app.config.settings import get_settings
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_info, log_error
from app.models.dashboard_model import Dashboard
from app.schemas.dashboard_schema import StatusUpdate
from app.services.dashboard_service import DashboardService
from app.repositories.dashboard_lock_repository import DashboardLockRepository
from app.repositories.dashboard_remark_repository import DashboardRemarkRepository
from app.repositories.dashboard_repository import DashboardRepository


settings = get_settings()

def get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    """DashboardService 의존성 주입"""
    repository = DashboardRepository(db)
    remark_repository = DashboardRemarkRepository(db)
    lock_repository = DashboardLockRepository(db)
    return DashboardService(repository, remark_repository, lock_repository)

async def get_current_user(
   authorization: str = Header(None, alias="Authorization")
) -> TokenData:
   """Authorization 헤더에서 토큰 추출하여 사용자 정보 반환"""
   if not authorization or not authorization.startswith("Bearer "):
       raise HTTPException(
           status_code=status.HTTP_401_UNAUTHORIZED,
           detail="인증 토큰이 필요합니다",
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
               status_code=status.HTTP_401_UNAUTHORIZED, detail="토큰이 만료되었습니다"
           )

       return TokenData(
           user_id=payload.get("sub"),
           department=payload.get("department"),
           role=payload.get("role"),
       )

   except JWTError:
       raise HTTPException(
           status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다"
       )


async def check_admin_access(current_user: TokenData = Depends(get_current_user)):
   """관리자 권한 체크"""
   if current_user.role != "ADMIN":
       raise HTTPException(
           status_code=status.HTTP_403_FORBIDDEN, detail="관리자만 접근할 수 있습니다"
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