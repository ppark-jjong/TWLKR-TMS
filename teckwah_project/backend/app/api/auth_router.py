# backend/app/api/auth_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Header
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer
from typing import Optional
from datetime import datetime, timedelta
from jose import jwt, JWTError

from app.schemas.auth_schema import UserLogin, LoginResponse, Token, RefreshTokenRequest
from app.services.auth_service import AuthService
from app.repositories.auth_repository import AuthRepository
from app.config.database import get_db
from app.config.settings import get_settings
from app.utils.logger import log_info, log_error
from app.utils.auth import create_token
from app.utils.api_decorators import error_handler

router = APIRouter()
settings = get_settings()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    """AuthService 의존성 주입"""
    repository = AuthRepository(db)
    return AuthService(repository)


@router.post("/login", response_model=LoginResponse)
@error_handler("로그인")
async def login(
    login_data: UserLogin, auth_service: AuthService = Depends(get_auth_service)
):
    """로그인 API
    - 인증 성공 시 액세스 토큰(60분)과 리프레시 토큰(7일) 발급
    - 리프레시 토큰은 DB에 저장
    """
    log_info(f"로그인 요청 데이터: {login_data.dict()}")
    login_response = auth_service.authenticate_user(login_data)
    log_info(f"로그인 성공 응답: user_id={login_data.user_id}")
    return login_response


@router.get("/check-session")
@error_handler("세션 유효성 검증")
async def check_session(authorization: str = Header(None)):
    """세션 유효성 검증 API"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="접근 권한이 없습니다. 다시 로그인해주세요.",
        )

    token = authorization.split(" ")[1]

    # 토큰 검증 로직
    payload = jwt.decode(
        token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
    )

    # 유효성 검사
    if datetime.utcnow() > datetime.fromtimestamp(payload.get("exp", 0)):
        raise HTTPException(status_code=401, detail="토큰이 만료되었습니다")

    return {
        "success": True,
        "user": {
            "user_id": payload.get("sub"),
            "user_department": payload.get("department"),
            "user_role": payload.get("role"),
        },
    }


@router.post("/refresh")
@error_handler("토큰 갱신")
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """토큰 갱신 API"""
    if not refresh_data.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="리프레시 토큰이 필요합니다.",
        )

    token_data = auth_service.refresh_token(refresh_data.refresh_token)

    # 토큰을 응답 바디에 포함
    return {
        "success": True,
        "message": "토큰이 갱신되었습니다",
        "token": token_data,
    }


@router.post("/logout")
@error_handler("로그아웃")
async def logout(
    refresh_data: RefreshTokenRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """로그아웃 API"""
    if refresh_data.refresh_token:
        auth_service.logout(refresh_data.refresh_token)

    return {"success": True, "message": "로그아웃이 완료되었습니다"}
