from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.auth_schema import LoginRequest, LoginResponse, UserResponse, LogoutRequest
from app.services.auth_service import AuthService, get_current_user
from app.utils.logger_util import Logger
from app.models.user_model import User

router = APIRouter(prefix="/auth", tags=["인증"])

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """로그인 처리"""
    try:
        auth_service = AuthService(db)
        return await auth_service.login(request)
    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"로그인 처리 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="로그인 처리 중 오류가 발생했습니다."
        )

@router.post("/logout")
async def logout(request: LogoutRequest, db: Session = Depends(get_db)):
    """로그아웃 처리"""
    try:
        auth_service = AuthService(db)
        await auth_service.logout(request.refresh_token)
        return {"message": "로그아웃되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"로그아웃 처리 중 오류: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="로그아웃 처리 중 오류가 발생했습니다.")

@router.get("/me", response_model=UserResponse)
async def get_user_info(current_user: User = Depends(get_current_user)):
    """현재 사용자 정보 조회"""
    return UserResponse(
        user_id=current_user.user_id,
        user_department=current_user.user_department,
        user_role=current_user.user_role
    )
