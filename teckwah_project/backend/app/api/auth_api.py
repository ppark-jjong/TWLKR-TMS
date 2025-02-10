"""인증 관련 API 라우터"""

from datetime import datetime, timedelta
import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.user_model import User
from app.schemas.auth_schema import (
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    TokenResponse,
    UserResponse,
    LogoutRequest,
)
from app.services.auth_service import AuthService, get_auth_service, get_current_user
from app.utils.logger_util import Logger

router = APIRouter(prefix="/auth", tags=["인증"])

# JWT 설정
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
REFRESH_SECRET_KEY = os.getenv("JWT_REFRESH_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

if not SECRET_KEY or not REFRESH_SECRET_KEY:
    raise ValueError("JWT 시크릿 키가 설정되지 않았습니다.")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        Logger.error(f"비밀번호 검증 중 오류 발생: {str(e)}")
        return False

def create_access_token(data: dict) -> str:
    """액세스 토큰 생성"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict) -> str:
    """리프레시 토큰 생성"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """로그인 처리"""
    try:
        # 사용자 조회
        user = db.query(User).filter(User.user_id == request.user_id).first()
        if not user or not verify_password(request.password, user.user_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="아이디 또는 비밀번호가 올바르지 않습니다."
            )

        # 토큰 생성
        token_data = {"sub": user.user_id}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        # 사용자 정보 반환
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserResponse(
                user_id=user.user_id,
                user_department=user.user_department,
                user_role=user.user_role
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"로그인 처리 중 오류 발생: {str(e)}")
        Logger.error(f"{user}")  # 디버깅용 로그
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="로그인 처리 중 오류가 발생했습니다."
        )

@router.get("/me", response_model=UserResponse)
async def get_user_info(current_user: User = Depends(get_current_user)):
    """현재 사용자 정보 조회"""
    try:
        return UserResponse(
            user_id=current_user.user_id,
            user_department=current_user.user_department,
            user_role=current_user.user_role
        )
    except Exception as e:
        Logger.error(f"사용자 정보 조회 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="사용자 정보 조회 중 오류가 발생했습니다."
        )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """토큰 갱신"""
    try:
        # 리프레시 토큰 검증
        try:
            payload = jwt.decode(request.refresh_token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="유효하지 않은 토큰입니다."
                )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않은 토큰입니다."
            )

        # 새 토큰 생성
        token_data = {"sub": user_id}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )
    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"토큰 갱신 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="토큰 갱신 중 오류가 발생했습니다."
        )

@router.post("/logout")
async def logout(request: LogoutRequest, current_user: User = Depends(get_current_user)):
    """로그아웃 처리"""
    try:
        # 리프레시 토큰 검증 및 삭제 로직 추가 필요
        return {"message": "로그아웃되었습니다."}
    except Exception as e:
        Logger.error(f"로그아웃 처리 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="로그아웃 처리 중 오류가 발생했습니다."
        )