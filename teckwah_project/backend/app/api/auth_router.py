# backend/app/api/auth_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer
from typing import Optional

from app.schemas.auth_schema import UserLogin, LoginResponse, Token
from app.services.auth_service import AuthService
from app.repositories.auth_repository import AuthRepository
from app.config.database import get_db
from app.config.settings import get_settings
from app.utils.logger import log_info, log_error

router = APIRouter()
settings = get_settings()


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: UserLogin, response: Response, db: Session = Depends(get_db)
):
    """로그인 API
    - 인증 성공 시 액세스 토큰(60분)과 리프레시 토큰(7일) 발급
    - 리프레시 토큰은 DB에 저장
    """
    try:
        repository = AuthRepository(db)
        service = AuthService(repository)
        user, token = service.authenticate_user(login_data)

        # Access Token을 HTTP Only 쿠키로 설정
        response.set_cookie(
            key="access_token",
            value=token.access_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

        # Refresh Token을 HTTP Only 쿠키로 설정
        response.set_cookie(
            key="refresh_token",
            value=token.refresh_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        )

        return LoginResponse(
            success=True, message="로그인되었습니다", token=token, user=user
        )

    except Exception as e:
        log_error(e, "로그인 실패")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인에 실패했습니다. 사용자 ID 또는 비밀번호를 확인하세요.",
        )


@router.get("/check-session")
async def check_session(
    access_token: str = Cookie(None),
    refresh_token: str = Cookie(None),
    db: Session = Depends(get_db),
):
    """세션 유효성 검증 API"""
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="접근 권한이 없습니다. 다시 로그인해주세요.",
        )

    try:
        repository = AuthRepository(db)
        service = AuthService(repository)

        # 토큰 검증
        user = service.verify_token(access_token)
        return {"success": True, "user": user}

    except Exception as e:
        if refresh_token:
            try:
                # refresh 토큰으로 새로운 access 토큰 발급 시도
                result = service.refresh_token(refresh_token)
                response.set_cookie(
                    key="access_token",
                    value=result.access_token,
                    httponly=True,
                    secure=True,
                    samesite="lax",
                    max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                )
                return {"success": True, "message": "토큰이 갱신되었습니다"}
            except:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="세션이 만료되었습니다. 다시 로그인해주세요.",
                )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="세션이 만료되었습니다. 다시 로그인해주세요.",
        )


@router.post("/logout")
async def logout(
    response: Response, refresh_token: str = Cookie(None), db: Session = Depends(get_db)
):
    try:
        if refresh_token:
            repository = AuthRepository(db)
            service = AuthService(repository)
            service.logout(refresh_token)

        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")

        return {"success": True, "message": "로그아웃이 완료되었습니다"}

    except Exception as e:
        log_error(e, "로그아웃 실패")
        # 에러가 발생하더라도 쿠키는 삭제
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="로그아웃 처리 중 오류가 발생했습니다",
        )
