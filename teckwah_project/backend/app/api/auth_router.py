# backend/app/api/auth_router.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas.auth_schema import UserLogin, Token, UserResponse
from app.repositories.auth_repository import AuthRepository
from app.services.auth_service import AuthService
from app.database import get_db

router = APIRouter()

def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    repository = AuthRepository(db)
    return AuthService(repository)

@router.post("/login", response_model=dict)
async def login(
    login_data: UserLogin,
    service: AuthService = Depends(get_auth_service)
):
    """로그인 API"""
    try:
        token, user = service.authenticate_user(login_data)
        return {
            "token": token.dict(),
            "user": user.dict()
        }
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=str(e)
        )

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    service: AuthService = Depends(get_auth_service)
):
    """액세스 토큰 갱신 API"""
    return service.refresh_access_token(refresh_token)

@router.post("/logout")
async def logout(
    refresh_token: str,
    service: AuthService = Depends(get_auth_service)
):
    """로그아웃 API"""
    success = service.logout(refresh_token)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="로그아웃 처리에 실패했습니다"
        )
    return {"message": "로그아웃되었습니다"}