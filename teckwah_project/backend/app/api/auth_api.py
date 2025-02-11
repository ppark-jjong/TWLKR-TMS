from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.auth_schema import (
    LoginRequest, LoginResponse, UserResponse, 
    LogoutRequest, LogoutResponse, RefreshTokenRequest
)
from app.services.auth_service import AuthService
from app.utils.logger_util import Logger

router = APIRouter(prefix="/auth", tags=["인증"])

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """로그인 처리"""
    auth_service = AuthService(db)
    return await auth_service.login(request)

@router.post("/logout", response_model=LogoutResponse)
async def logout(
    request: LogoutRequest, 
    db: Session = Depends(get_db)
):
    """로그아웃 처리"""
    auth_service = AuthService(db)
    await auth_service.logout(request.refresh_token)
    return LogoutResponse(message="로그아웃되었습니다.")

@router.get("/me", response_model=UserResponse)
async def get_user_info(
    token: str,
    db: Session = Depends(get_db)
):
    """현재 사용자 정보 조회"""
    auth_service = AuthService(db)
    user = await auth_service.get_current_user(token)
    return UserResponse.from_orm(user)

@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """리프레시 토큰으로 액세스 토큰 갱신"""
    auth_service = AuthService(db)
    return await auth_service.refresh_access_token(request.refresh_token)