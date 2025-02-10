import os
import uuid
from datetime import datetime, timedelta
from fastapi import HTTPException, status, Depends, Request
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.models.user_model import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth_schema import UserResponse, LoginRequest, LoginResponse
from fastapi.responses import Response
from jose import JWTError, jwt
from app.utils.logger_util import Logger
from app.repositories.token_repository import TokenRepository

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SESSION_EXPIRE_HOURS = int(os.getenv("SESSION_EXPIRE_HOURS", 4))

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repository = UserRepository(db)
        self.session_repo = SessionRepository(db)
        self.token_repository = TokenRepository(db)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    async def login(self, login_data: LoginRequest) -> LoginResponse:
        """로그인 처리"""
        user = await self.user_repository.get_by_user_id(login_data.user_id)
        if not user or not user.verify_password(login_data.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="아이디 또는 비밀번호가 올바르지 않습니다."
            )

        access_token = self.create_access_token({"sub": user.user_id})
        refresh_token = self.create_refresh_token({"sub": user.user_id})

        # 토큰 저장
        expires_at = datetime.utcnow() + timedelta(days=7)  # 예: 7일 후 만료
        self.token_repository.create_token(user.user_id, refresh_token, expires_at)

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse(
                user_id=user.user_id,
                user_department=user.user_department,
                user_role=user.user_role
            )
        )

    async def logout(self, refresh_token: str):
        """로그아웃 처리"""
        # 리프레시 토큰 삭제 로직 추가
        # 예: TokenRepository.delete_user_tokens(user_id)
        pass

    def create_access_token(self, data: dict) -> str:
        """액세스 토큰 생성"""
        expire = datetime.utcnow() + timedelta(minutes=30)
        to_encode = data.copy()
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, "SECRET_KEY", algorithm="HS256")

    def create_refresh_token(self, data: dict) -> str:
        """리프레시 토큰 생성"""
        expire = datetime.utcnow() + timedelta(days=7)
        to_encode = data.copy()
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, "REFRESH_SECRET_KEY", algorithm="HS256")

def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)
