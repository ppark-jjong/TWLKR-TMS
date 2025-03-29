# teckwah_project/main/server/api/auth_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Header
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer
from typing import Optional
from datetime import datetime, timedelta
from jose import jwt, JWTError

from main.server.schemas.auth_schema import (
    UserLogin,
    LoginResponse,
    Token,
    RefreshTokenRequest,
    UserResponse,
)
from main.server.schemas.common_schema import ApiResponse, MetaBuilder
from main.server.services.auth_service import AuthService
from main.server.repositories.auth_repository import AuthRepository
from main.server.config.database import get_db
from main.server.config.settings import get_settings
from main.server.utils.logger import log_info, log_error
from main.server.utils.auth import create_token
from main.server.utils.error import error_handler, UnauthorizedException
from main.server.utils.datetime import get_kst_now
from main.server.utils.constants import MESSAGES
from main.server.utils.auth import get_token_data_from_header

router = APIRouter()
settings = get_settings()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    """AuthService 의존성 주입"""
    repository = AuthRepository(db)
    return AuthService(repository)


@router.post("/login", response_model=ApiResponse[LoginResponse])
@error_handler("로그인")
async def login(
    user_data: UserLogin,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    """로그인 API"""
    # 로그인 처리
    login_result = await auth_service.login(user_data)

    # 쿠키 설정
    response.set_cookie(
        key="refresh_token",
        value=login_result.token.refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    return ApiResponse(success=True, message="로그인에 성공했습니다", data=login_result)


@router.get("/check-session", response_model=ApiResponse)
@error_handler("세션 유효성 검증")
async def check_session(authorization: str = Header(None)):
    """세션 유효성 검증 API"""
    try:
        # 개선된 공통 함수 활용
        token_data = get_token_data_from_header(authorization)

        return {
            "success": True,
            "message": "유효한 세션입니다",
            "data": {
                "user": {
                    "user_id": token_data.user_id,
                    "user_department": token_data.department,
                    "user_role": token_data.role,
                }
            },
        }
    except UnauthorizedException as e:
        # 표준화된 오류 응답 형식 사용
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "message": e.detail,
                "error_code": getattr(e, "error_code", "UNAUTHORIZED"),
            },
        )


@router.post("/refresh", response_model=ApiResponse[Token])
@error_handler("토큰 갱신")
async def refresh_token(
    refresh_token: str = Cookie(None),
    auth_service: AuthService = Depends(get_auth_service),
):
    """리프레시 토큰으로 액세스 토큰 갱신 API"""
    if not refresh_token:
        raise UnauthorizedException("리프레시 토큰이 없습니다")

    # 토큰 갱신
    new_token = await auth_service.refresh_token(refresh_token)

    return ApiResponse(success=True, message="토큰이 갱신되었습니다", data=new_token)


@router.post("/logout", response_model=ApiResponse[dict])
@error_handler("로그아웃")
async def logout(
    response: Response, auth_service: AuthService = Depends(get_auth_service)
):
    """로그아웃 API"""
    # 쿠키 삭제
    response.delete_cookie(key="refresh_token")

    return ApiResponse(success=True, message="로그아웃되었습니다", data={})


@router.get("/me", response_model=ApiResponse[UserResponse])
@error_handler("현재 사용자 정보 조회")
async def get_current_user_info(auth_service: AuthService = Depends(get_auth_service)):
    """현재 로그인한 사용자 정보 조회 API"""
    # 사용자 정보 조회
    user = await auth_service.get_current_user()

    return ApiResponse(success=True, message="사용자 정보를 조회했습니다", data=user)
