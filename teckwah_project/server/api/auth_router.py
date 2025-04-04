# teckwah_project/server/api/auth_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Header, Body
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer
from typing import Optional, List
from datetime import datetime, timedelta
from jose import jwt, JWTError

from server.schemas.auth_schema import (
    UserLogin,
    LoginResponse,
    Token,
    RefreshTokenRequest,
    UserResponse,
    UserCreate,
    UserList,
)
from server.schemas.common_schema import ApiResponse, MetaBuilder
from server.services.auth_service import AuthService
from server.repositories.auth_repository import AuthRepository
from server.config.database import get_db
from server.config.settings import get_settings
from server.utils.logger import log_info, log_error
from server.utils.auth import create_token
from server.utils.error import error_handler, UnauthorizedException, ForbiddenException
from server.utils.datetime import get_kst_now
from server.utils.constants import MESSAGES
from server.utils.auth import get_token_data_from_header
from server.api.deps import check_admin_access

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


@router.get("/users", response_model=ApiResponse[List[UserResponse]])
@error_handler("사용자 목록 조회")
async def get_users(
    current_user = Depends(check_admin_access),
    auth_service: AuthService = Depends(get_auth_service),
):
    """사용자 목록 조회 API (관리자 전용)"""
    users = await auth_service.get_all_users()
    return ApiResponse(success=True, message="사용자 목록을 조회했습니다", data=users)


@router.post("/users", response_model=ApiResponse[UserResponse])
@error_handler("사용자 생성")
async def create_user(
    user_data: UserCreate,
    current_user = Depends(check_admin_access),
    auth_service: AuthService = Depends(get_auth_service),
):
    """사용자 생성 API (관리자 전용)"""
    user = await auth_service.create_user(user_data)
    return ApiResponse(success=True, message="사용자가 생성되었습니다", data=user)


@router.delete("/users/{user_id}", response_model=ApiResponse)
@error_handler("사용자 삭제")
async def delete_user(
    user_id: str,
    current_user = Depends(check_admin_access),
    auth_service: AuthService = Depends(get_auth_service),
):
    """사용자 삭제 API (관리자 전용)"""
    # 관리자가 자기 자신을 삭제하는 것 방지
    if user_id == current_user.user_id:
        raise ForbiddenException("관리자 자신을 삭제할 수 없습니다")
        
    success = await auth_service.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
        
    return ApiResponse(success=True, message="사용자가 삭제되었습니다")


@router.get("/users/me", response_model=ApiResponse[UserResponse])
@error_handler("현재 사용자 정보 조회")
async def get_current_user_info(
    current_user = Depends(get_token_data_from_header),
    auth_service: AuthService = Depends(get_auth_service),
):
    """현재 로그인한 사용자 정보 조회 API"""
    user = await auth_service.get_user_by_id(current_user.user_id)
    return ApiResponse(success=True, message="사용자 정보를 조회했습니다", data=user)
