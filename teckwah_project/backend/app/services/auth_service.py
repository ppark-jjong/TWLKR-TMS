# backend/app/services/auth_service.py
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from app.schemas.auth_schema import UserLogin, LoginResponse, Token
from app.repositories.auth_repository import AuthRepository
from app.utils.auth import create_token, verify_password
from app.utils.logger import log_info, log_error
from app.config.settings import get_settings

settings = get_settings()


class AuthService:
    def __init__(self, auth_repository: AuthRepository):
        self.repository = auth_repository

    def authenticate_user(self, login_data: UserLogin) -> LoginResponse:
        """사용자 인증 및 토큰 발급"""
        try:
            # 사용자 조회
            user = self.repository.get_user_by_id(login_data.user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="아이디 또는 비밀번호가 잘못되었습니다",
                )

            # 비밀번호 검증
            if not verify_password(login_data.user_password, user.user_password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="아이디 또는 비밀번호가 잘못되었습니다",
                )

            # 토큰 생성
            access_token = create_token(
                user_id=user.user_id,
                department=user.user_department,
                role=user.user_role,
                expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            )

            refresh_token = create_token(
                user_id=user.user_id,
                department=user.user_department,
                role=user.user_role,
                expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
                is_refresh_token=True,
            )

            # 리프레시 토큰 저장
            self.repository.store_refresh_token(
                user_id=user.user_id,
                refresh_token=refresh_token,
                expires_at=datetime.utcnow()
                + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            )

            return LoginResponse(
                token=Token(access_token=access_token, refresh_token=refresh_token),
                user=user,
            )

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "인증 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="인증 처리 중 오류가 발생했습니다",
            )

    def refresh_token(self, refresh_token: str) -> Token:
        """토큰 갱신"""
        try:
            # 리프레시 토큰 검증
            token = self.repository.get_valid_refresh_token(refresh_token)
            if not token:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="토큰이 만료되었습니다",
                )

            # 새로운 액세스 토큰 발급
            user = self.repository.get_user_by_id(token.user_id)
            new_access_token = create_token(
                user_id=user.user_id,
                department=user.user_department,
                role=user.user_role,
                expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            )

            return Token(access_token=new_access_token, refresh_token=refresh_token)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "토큰 갱신 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="토큰 갱신 중 오류가 발생했습니다",
            )

    def logout(self, refresh_token: str) -> bool:
        """로그아웃"""
        try:
            success = self.repository.delete_refresh_token(refresh_token)
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="로그아웃 처리에 실패했습니다",
                )
            return True
        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "로그아웃 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="로그아웃 처리 중 오류가 발생했습니다",
            )
