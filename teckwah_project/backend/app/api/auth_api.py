from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.auth_schema import LoginRequest, LoginResponse, UserResponse, LogoutRequest
from app.services.auth_service import AuthService, get_auth_service, get_current_user
from app.utils.logger_util import Logger

router = APIRouter(prefix="/auth", tags=["인증"])

@router.post("/login", response_model=LoginResponse)
async def login(request: Request, response: Response, login_data: LoginRequest, db: Session = Depends(get_db)):
    try:
        Logger.info(f"로그인 시도: {login_data.user_id}")
        service = get_auth_service(db)
        result = await service.login(login_data.user_id, login_data.password)
        response.set_cookie(key="session_id", value=result.get("session_id"), httponly=True)
        Logger.info(f"로그인 성공: {login_data.user_id} (세션 ID: {result.get('session_id')})")
        return {"user": result.get("user")}
    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"로그인 처리 중 오류: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="로그인 처리 중 오류가 발생했습니다.")

@router.post("/logout")
async def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    try:
        session_id = request.cookies.get("session_id")
        if not session_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="세션 정보가 존재하지 않습니다.")
        service = get_auth_service(db)
        await service.logout(session_id)
        response.delete_cookie(key="session_id")
        return {"message": "로그아웃되었습니다."}
    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"로그아웃 처리 중 오류: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="로그아웃 처리 중 오류가 발생했습니다.")

@router.get("/me", response_model=UserResponse)
async def get_user_info(current_user = Depends(get_current_user)):
    try:
        return current_user
    except Exception as e:
        Logger.error(f"사용자 정보 조회 중 오류: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="사용자 정보 조회 중 오류가 발생했습니다.")
