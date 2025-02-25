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

router = APIRouter()
settings = get_settings()


@router.post("/login", response_model=LoginResponse)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """로그인 API
    - 인증 성공 시 액세스 토큰(60분)과 리프레시 토큰(7일) 발급
    - 리프레시 토큰은 DB에 저장
    """
    try:
        repository = AuthRepository(db)
        service = AuthService(repository)
        login_response = service.authenticate_user(login_data)

        # 응답 구조 확인 - LoginResponse 스키마에 맞게 반환
        return login_response

    except Exception as e:
        log_error(e, "로그인 실패")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인에 실패했습니다. 사용자 ID 또는 비밀번호를 확인하세요.",
        )


@router.get("/check-session")
async def check_session(authorization: str = Header(None)):
    """세션 유효성 검증 API"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="접근 권한이 없습니다. 다시 로그인해주세요.",
        )

    token = authorization.split(" ")[1]

    try:
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

    except JWTError as e:
        log_error(e, "토큰 검증 실패")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="세션이 만료되었습니다. 다시 로그인해주세요.",
        )
    except Exception as e:
        log_error(e, "세션 체크 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="세션 확인 중 오류가 발생했습니다.",
        )


@router.post("/refresh")
async def refresh_token(
    refresh_data: RefreshTokenRequest, db: Session = Depends(get_db)
):
    """토큰 갱신 API"""
    if not refresh_data.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="리프레시 토큰이 필요합니다.",
        )

    try:
        repository = AuthRepository(db)
        service = AuthService(repository)
        token_data = service.refresh_token(refresh_data.refresh_token)

        # 토큰을 응답 바디에 포함
        return {
            "success": True,
            "message": "토큰이 갱신되었습니다",
            "token": token_data,
        }
    except Exception as e:
        log_error(e, "토큰 갱신 실패")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰 갱신에 실패했습니다. 다시 로그인해주세요.",
        )


@router.post("/logout")
async def logout(refresh_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """로그아웃 API"""
    try:
        if refresh_data.refresh_token:
            repository = AuthRepository(db)
            service = AuthService(repository)
            service.logout(refresh_data.refresh_token)

        return {"success": True, "message": "로그아웃이 완료되었습니다"}
    except Exception as e:
        log_error(e, "로그아웃 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="로그아웃 처리 중 오류가 발생했습니다",
        )
