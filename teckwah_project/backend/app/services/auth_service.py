# backend/app/services/auth_service.py

from datetime import datetime, timedelta
from typing import Tuple
from fastapi import HTTPException
from jose import JWTError, jwt
import bcrypt

from app.schemas.auth_schema import (
    UserLogin, Token, TokenData, UserResponse
)
from app.repositories.auth_repository import AuthRepository
from app.config.settings import get_settings
from app.utils.logger import log_error, log_info
from app.utils.error_handler import (
    AuthenticationError, ValidationError, 
    create_error_response
)

settings = get_settings()

class AuthService:
    def __init__(self, auth_repository: AuthRepository):
        self.repository = auth_repository

    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """비밀번호 검증"""
        try:
            return bcrypt.checkpw(
                plain_password.encode('utf-8'),
                hashed_password.encode('utf-8')
            )
        except Exception as e:
            log_error(e, "비밀번호 검증 실패")
            raise AuthenticationError("비밀번호 검증 중 오류가 발생했습니다")

    def _create_token(self, user_id: str, department: str, role: str,
                     expires_delta: timedelta, is_refresh_token: bool = False) -> str:
        """JWT 토큰 생성"""
        try:
            expire = datetime.utcnow() + expires_delta
            to_encode = {
                "sub": user_id,
                "exp": expire,
                "department": department,
                "role": role
            }
            
            secret_key = settings.JWT_REFRESH_SECRET_KEY if is_refresh_token else settings.JWT_SECRET_KEY
            return jwt.encode(
                to_encode,
                secret_key,
                algorithm=settings.JWT_ALGORITHM
            )
        except Exception as e:
            log_error(e, "토큰 생성 실패", {
                "user_id": user_id,
                "is_refresh_token": is_refresh_token
            })
            raise AuthenticationError("토큰 생성 중 오류가 발생했습니다")

    def authenticate_user(self, login_data: UserLogin) -> Tuple[Token, UserResponse]:
        """사용자 인증 및 토큰 발급"""
        try:
            log_info(f"사용자 인증 시도: {login_data.user_id}")
            
            # 사용자 조회
            user = self.repository.get_user_by_id(login_data.user_id)
            if not user:
                log_info(f"사용자 없음: {login_data.user_id}")
                raise AuthenticationError("아이디 또는 비밀번호가 잘못되었습니다")

            # 비밀번호 검증
            if not self._verify_password(login_data.user_password, user.user_password):
                log_info(f"비밀번호 불일치: {login_data.user_id}")
                raise AuthenticationError("아이디 또는 비밀번호가 잘못되었습니다")

            # Access Token 생성
            access_token = self._create_token(
                user_id=user.user_id,
                department=user.user_department,
                role=user.user_role,
                expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            )

            # Refresh Token 생성
            refresh_token = self._create_token(
                user_id=user.user_id,
                department=user.user_department,
                role=user.user_role,
                expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
                is_refresh_token=True
            )

            # Refresh Token DB 저장
            self.repository.create_refresh_token(
                user_id=user.user_id,
                refresh_token=refresh_token,
                expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
            )

            log_info(f"사용자 인증 성공: {login_data.user_id}")
            return (
                Token(access_token=access_token, refresh_token=refresh_token),
                UserResponse(
                    user_id=user.user_id,
                    user_department=user.user_department,
                    user_role=user.user_role
                )
            )

        except AuthenticationError as e:
            raise HTTPException(
                status_code=401,
                detail=str(e)
            )
        except Exception as e:
            log_error(e, "인증 처리 실패", {"user_id": login_data.user_id})
            raise HTTPException(
                status_code=500,
                detail=create_error_response(e)
            )

    def refresh_access_token(self, refresh_token: str) -> Token:
        """리프레시 토큰을 사용하여 새로운 액세스 토큰 발급"""
        try:
            log_info("토큰 갱신 시도")
            
            # 리프레시 토큰 검증
            payload = jwt.decode(
                refresh_token,
                settings.JWT_REFRESH_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            # DB에서 리프레시 토큰 확인
            db_token = self.repository.get_refresh_token(refresh_token)
            if not db_token:
                log_info("저장된 리프레시 토큰 없음")
                raise AuthenticationError("토큰이 만료되었습니다")

            # 새로운 액세스 토큰 생성
            new_access_token = self._create_token(
                user_id=payload.get("sub"),
                department=payload.get("department"),
                role=payload.get("role"),
                expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            )

            log_info(f"토큰 갱신 성공: {payload.get('sub')}")
            return Token(
                access_token=new_access_token,
                refresh_token=refresh_token
            )

        except JWTError as e:
            log_error(e, "리프레시 토큰 검증 실패")
            raise HTTPException(
                status_code=401, 
                detail="토큰이 만료되었습니다"
            )
        except AuthenticationError as e:
            raise HTTPException(
                status_code=401,
                detail=str(e)
            )
        except Exception as e:
            log_error(e, "토큰 갱신 실패")
            raise HTTPException(
                status_code=500,
                detail=create_error_response(e)
            )

    def logout(self, refresh_token: str) -> bool:
        """로그아웃 (리프레시 토큰 삭제)"""
        try:
            log_info("로그아웃 시도")
            success = self.repository.delete_refresh_token(refresh_token)
            if success:
                log_info("로그아웃 성공")
            else:
                log_info("로그아웃 실패 - 토큰 없음")
            return success
        except Exception as e:
            log_error(e, "로그아웃 처리 실패")
            raise HTTPException(
                status_code=500,
                detail=create_error_response(e)
            )

    def cleanup_expired_tokens(self) -> int:
        """만료된 리프레시 토큰 정리"""
        try:
            return self.repository.delete_expired_tokens()
        except Exception as e:
            log_error(e, "만료 토큰 정리 실패")
            return 0