from datetime import datetime, timedelta
from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.models.user_model import User
from app.repositories.user_repository import UserRepository
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.schemas.auth_schema import LoginRequest, LoginResponse, UserResponse
from app.utils.logger_util import Logger

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repository = UserRepository(db)
        self.token_repository = RefreshTokenRepository(db)

    async def verify_token(self, token: str) -> User:
        """토큰 검증"""
        try:
            payload = jwt.decode(token, "SECRET_KEY", algorithms=["HS256"])
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=401, detail="유효하지 않은 토큰")
            
            user = await self.user_repository.get_by_user_id(user_id)
            if not user:
                raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다")
            
            return user
        except JWTError:
            raise HTTPException(status_code=401, detail="토큰이 만료되었습니다")

    async def login(self, login_data: LoginRequest) -> LoginResponse:
        """로그인 처리"""
        try:
            user = await self.user_repository.get_by_user_id(login_data.user_id)
            if not user or not user.verify_password(login_data.password):
                raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 일치하지 않습니다")

            # 토큰 생성
            access_token = self._create_access_token({"sub": user.user_id})
            refresh_token = self._create_refresh_token({"sub": user.user_id})

            # 리프레시 토큰 저장
            await self.token_repository.save_refresh_token(
                user.user_id, 
                refresh_token,
                datetime.utcnow() + timedelta(days=7)
            )

            return LoginResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                user=UserResponse.from_orm(user)
            )
        except Exception as e:
            Logger.error(f"로그인 처리 중 오류 발생: {str(e)}")
            raise HTTPException(status_code=500, detail="로그인 처리 중 오류가 발생했습니다")

    async def logout(self, refresh_token: str):
        """로그아웃 처리"""
        try:
            await self.token_repository.delete_refresh_token(refresh_token)
        except Exception as e:
            Logger.error(f"로그아웃 처리 중 오류 발생: {str(e)}")
            raise HTTPException(status_code=500, detail="로그아웃 처리 중 오류가 발생했습니다")

    async def refresh_access_token(self, refresh_token: str) -> LoginResponse:
        """액세스 토큰 갱신"""
        try:
            token_data = await self.token_repository.get_refresh_token(refresh_token)
            if not token_data:
                raise HTTPException(status_code=401, detail="유효하지 않은 리프레시 토큰")

            user = await self.user_repository.get_by_user_id(token_data.user_id)
            if not user:
                raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다")

            access_token = self._create_access_token({"sub": user.user_id})
            return LoginResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                user=UserResponse.from_orm(user)
            )
        except Exception as e:
            Logger.error(f"토큰 갱신 중 오류 발생: {str(e)}")
            raise HTTPException(status_code=500, detail="토큰 갱신 중 오류가 발생했습니다")

    def _create_access_token(self, data: dict) -> str:
        """액세스 토큰 생성"""
        expire = datetime.utcnow() + timedelta(minutes=30)
        data.update({"exp": expire})
        return jwt.encode(data, "SECRET_KEY", algorithm="HS256")

    def _create_refresh_token(self, data: dict) -> str:
        """리프레시 토큰 생성"""
        expire = datetime.utcnow() + timedelta(days=7)
        data.update({"exp": expire})
        return jwt.encode(data, "SECRET_KEY", algorithm="HS256")