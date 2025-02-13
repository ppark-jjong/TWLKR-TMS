# backend/app/api/auth_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.schemas.auth_schema import (
    UserLogin,
    LoginResponse,
    Token,
    RefreshTokenRequest,
    LogoutRequest,
)
from app.services.auth_service import AuthService
from app.repositories.auth_repository import AuthRepository
from app.config.database import get_db
from app.utils.logger import log_info, log_error

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """로그인 API
    - 인증 성공 시 액세스 토큰(60분)과 리프레시 토큰(7일) 발급
    - 리프레시 토큰은 DB에 저장
    """
    try:
        repository = AuthRepository(db)
        service = AuthService(repository)
        return service.authenticate_user(login_data)
    except Exception as e:
        log_error(e, "로그인 실패")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/refresh", response_model=Token)
async def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """토큰 갱신 API
    - 리프레시 토큰으로 새로운 액세스 토큰 발급
    """
    try:
        repository = AuthRepository(db)
        service = AuthService(repository)
        return service.refresh_token(request.refresh_token)
    except Exception as e:
        log_error(e, "토큰 갱신 실패")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/logout")
async def logout(request: LogoutRequest, db: Session = Depends(get_db)):
    """로그아웃 API
    - 리프레시 토큰 DB에서 삭제
    """
    try:
        repository = AuthRepository(db)
        service = AuthService(repository)
        service.logout(request.refresh_token)
        return {"message": "로그아웃되었습니다"}
    except Exception as e:
        log_error(e, "로그아웃 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
