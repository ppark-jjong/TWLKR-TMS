# teckwah_project/main/server/services/auth_service.py
from datetime import datetime, timedelta
from main.server.schemas.auth_schema import UserLogin, LoginResponse, Token, UserResponse
from main.server.repositories.auth_repository import AuthRepository
from main.server.utils.auth import create_token, verify_password
from main.server.utils.logger import log_info, log_error
from main.server.config.settings import get_settings
from main.server.utils.transaction import transactional
from main.server.utils.exceptions import UnauthorizedException, NotFoundException

settings = get_settings()


class AuthService:
    def __init__(self, auth_repository: AuthRepository):
        self.repository = auth_repository


    def authenticate_user(self, login_data: UserLogin) -> LoginResponse:
        """사용자 인증 및 토큰 발급"""
        # 사용자 조회
        user = self.repository.get_user_by_id(login_data.user_id)
        if not user:
            log_error(None, "로그인 실패: 사용자 없음")
            raise Exception("로그인에 실패했습니다")

        # 비밀번호 검증 (user_password 필드 사용)
        if not verify_password(login_data.password, user.user_password):
            log_error(None, "로그인 실패: 비밀번호 불일치")
            raise Exception("로그인에 실패했습니다")

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

        log_info(f"로그인 성공: {user.user_id}")

        # LoginResponse 객체 반환
        return LoginResponse(
            token=Token(access_token=access_token, refresh_token=refresh_token),
            user=UserResponse(
                user_id=user.user_id,
                user_department=user.user_department,
                user_role=user.user_role,
            ),
        )

    def logout(self, refresh_token: str) -> bool:
        """로그아웃 처리 - 리프레시 토큰 삭제"""
        result = self.repository.delete_refresh_token(refresh_token)
        return result
    
    @transactional
    def refresh_token(self, refresh_token: str) -> Token:
        """리프레시 토큰을 사용하여 액세스 토큰 갱신"""
        # 리프레시 토큰 유효성 검증
        token_entry = self.repository.get_valid_refresh_token(refresh_token)
        if not token_entry:
            raise Exception("인증에 실패했습니다")

        # 사용자 정보 조회
        user = self.repository.get_user_by_id(token_entry.user_id)
        if not user:
            raise Exception("사용자 정보를 찾을 수 없습니다")

        # 새 액세스 토큰 생성
        access_token = create_token(
            user_id=user.user_id,
            department=user.user_department,
            role=user.user_role,
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        # 새 리프레시 토큰 생성
        new_refresh_token = create_token(
            user_id=user.user_id,
            department=user.user_department,
            role=user.user_role,
            expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            is_refresh_token=True,
        )

        # 리프레시 토큰 업데이트
        self.repository.store_refresh_token(
            user_id=user.user_id,
            refresh_token=new_refresh_token,
            expires_at=datetime.utcnow()
            + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )

        log_info(f"토큰 갱신 성공: {user.user_id}")

        return Token(access_token=access_token, refresh_token=new_refresh_token)