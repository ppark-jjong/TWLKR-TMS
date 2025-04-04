# teckwah_project/server/services/auth_service.py
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
import bcrypt
from jose import jwt

from server.schemas.auth_schema import (
    UserLogin,
    LoginResponse,
    Token,
    UserResponse,
    TokenData,
    UserCreate,
)
from server.repositories.auth_repository import AuthRepository
from server.utils.auth import (
    create_token,
    verify_password,
    verify_refresh_token,
    get_token_data_from_header,
    decode_and_validate_token,
)
from server.utils.logger import log_info, log_error
from server.config.settings import get_settings
from server.utils.transaction import transactional
from server.utils.error import UnauthorizedException, NotFoundException, ValidationException
from server.utils.datetime import get_kst_now, get_unix_timestamp
from server.utils.constants import MESSAGES

settings = get_settings()


class AuthService:
    def __init__(self, auth_repository: AuthRepository):
        self.repository = auth_repository

    async def login(self, login_data: UserLogin) -> LoginResponse:
        """사용자 인증 및 토큰 발급"""
        log_info(f"로그인 시도: {login_data.user_id}")

        # 사용자 조회
        user = self.repository.get_user_by_id(login_data.user_id)
        if not user:
            log_error(None, "로그인 실패: 사용자 없음")
            raise UnauthorizedException(MESSAGES["ERROR"]["UNAUTHORIZED"])

        # 비밀번호 검증 (user_password 필드 사용)
        if not verify_password(login_data.password, user.user_password):
            log_error(None, "로그인 실패: 비밀번호 불일치")
            raise UnauthorizedException(MESSAGES["ERROR"]["UNAUTHORIZED"])

        log_info(f"로그인 성공: {login_data.user_id}")

        # 토큰 생성 (개선된 함수 사용)
        access_token = create_token(
            user_id=user.user_id,
            department=user.user_department,
            role=user.user_role,
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            is_refresh_token=False,
        )

        refresh_token = create_token(
            user_id=user.user_id,
            department=user.user_department,
            role=user.user_role,
            expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            is_refresh_token=True,
        )

        # 리프레시 토큰 저장 - KST 시간 사용
        self.repository.store_refresh_token(
            user_id=user.user_id,
            refresh_token=refresh_token,
            expires_at=get_kst_now()
            + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )

        # LoginResponse 객체 반환
        return LoginResponse(
            token=Token(
                access_token=access_token, 
                refresh_token=refresh_token,
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            ),
            user=UserResponse(
                user_id=user.user_id,
                department=user.user_department,
                role=user.user_role,
            ),
        )

    async def logout(self, refresh_token: str) -> bool:
        """로그아웃 처리 - 리프레시 토큰 삭제"""
        result = self.repository.delete_refresh_token(refresh_token)
        return result

    @transactional
    async def refresh_token(self, refresh_token: str) -> Token:
        """리프레시 토큰을 사용하여 액세스 토큰 갱신"""
        try:
            # 리프레시 토큰 유효성 검증 (개선된 함수 사용)
            payload = verify_refresh_token(refresh_token)
            user_id = payload.get("sub")

            # 토큰 DB 검증
            token_entry = self.repository.get_valid_refresh_token(refresh_token)
            if not token_entry or token_entry.user_id != user_id:
                raise UnauthorizedException(
                    MESSAGES["ERROR"]["UNAUTHORIZED"],
                    error_code="INVALID_REFRESH_TOKEN",
                )

            # 사용자 정보 조회
            user = self.repository.get_user_by_id(user_id)
            if not user:
                raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

            # 새 액세스 토큰 생성
            access_token = create_token(
                user_id=user.user_id,
                department=user.user_department,
                role=user.user_role,
                expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
                is_refresh_token=False,
            )

            # 새 리프레시 토큰 생성
            new_refresh_token = create_token(
                user_id=user.user_id,
                department=user.user_department,
                role=user.user_role,
                expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
                is_refresh_token=True,
            )

            # 리프레시 토큰 업데이트 - KST 시간 사용
            self.repository.store_refresh_token(
                user_id=user.user_id,
                refresh_token=new_refresh_token,
                expires_at=get_kst_now()
                + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            )

            log_info(f"토큰 갱신 성공: {user.user_id}")

            return Token(
                access_token=access_token, 
                refresh_token=new_refresh_token,
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
            )
        except Exception as e:
            log_error(e, f"토큰 갱신 실패")
            if isinstance(e, UnauthorizedException):
                raise
            raise UnauthorizedException(
                MESSAGES["ERROR"]["UNAUTHORIZED"], error_code="REFRESH_FAILED"
            )

    async def get_current_user(self, authorization: str = None) -> UserResponse:
        """현재 사용자 정보 조회"""
        try:
            token_data = get_token_data_from_header(authorization)
            user = self.repository.get_user_by_id(token_data.user_id)

            if not user:
                raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

            return UserResponse(
                user_id=user.user_id,
                user_department=user.user_department,
                user_role=user.user_role,
            )
        except Exception as e:
            log_error(e, "사용자 정보 조회 실패")
            if isinstance(e, (UnauthorizedException, NotFoundException)):
                raise
            raise UnauthorizedException(MESSAGES["ERROR"]["UNAUTHORIZED"])

    async def get_user_by_id(self, user_id: str) -> Optional[UserResponse]:
        """사용자 ID로 사용자 정보 조회"""
        user = self.repository.get_user_by_id(user_id)
        if not user:
            return None

        return UserResponse(
            user_id=user.user_id,
            department=user.user_department,
            role=user.user_role,
        )

    async def get_all_users(self) -> List[UserResponse]:
        """모든 사용자 목록 조회"""
        users = self.repository.get_all_users()
        return [
            UserResponse(
                user_id=user.user_id,
                department=user.user_department,
                role=user.user_role,
            )
            for user in users
        ]

    async def create_user(self, user_data: UserCreate) -> UserResponse:
        """사용자 생성"""
        # 사용자 ID 중복 확인
        existing_user = self.repository.get_user_by_id(user_data.user_id)
        if existing_user:
            raise ValidationException("이미 존재하는 사용자 ID입니다")

        # 부서 유효성 검증
        if user_data.department not in ["CS", "HES", "LENOVO"]:
            raise ValidationException("유효하지 않은 부서입니다 (CS, HES, LENOVO 중 하나여야 합니다)")

        # 권한 유효성 검증
        if user_data.role not in ["ADMIN", "USER"]:
            raise ValidationException("유효하지 않은 권한입니다 (ADMIN 또는 USER 중 하나여야 합니다)")

        # 비밀번호 해싱
        hashed_password = self._hash_password(user_data.password)

        # 사용자 생성
        user = self.repository.create_user(
            user_data.user_id, hashed_password, user_data.department, user_data.role
        )

        return UserResponse(
            user_id=user.user_id,
            department=user.user_department,
            role=user.user_role,
        )

    async def delete_user(self, user_id: str) -> bool:
        """사용자 삭제"""
        return self.repository.delete_user(user_id)

    def _hash_password(self, password: str) -> str:
        """비밀번호 해싱"""
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """비밀번호 검증"""
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
