# teckwah_project/main/server/utils/auth.py
from datetime import datetime, timedelta
from typing import Dict, Optional
from jose import jwt
from main.server.config.settings import get_settings
from main.server.utils.logger import log_error
from main.server.utils.datetime_helper import get_kst_now
import bcrypt

settings = get_settings()


def create_token(
    user_id: str,
    department: str,
    role: str,
    expires_delta: timedelta,
    is_refresh_token: bool = False,
) -> str:
    """JWT 토큰 생성 - KST 기준 시간 사용"""
    try:
        expire = get_kst_now() + expires_delta
        payload = {
            "sub": user_id,
            "exp": int(expire.timestamp()),  # timestamp로 변환
            "department": department,
            "role": role,
            "type": "refresh" if is_refresh_token else "access",
        }
        secret = (
            settings.JWT_REFRESH_SECRET_KEY
            if is_refresh_token
            else settings.JWT_SECRET_KEY
        )
        return jwt.encode(payload, secret, algorithm=settings.JWT_ALGORITHM)
    except Exception as e:
        log_error(e, "토큰 생성 실패")
        raise


def decode_token(token: str, is_refresh_token: bool = False) -> Dict:
    """JWT 토큰 디코딩"""
    try:
        secret = (
            settings.JWT_REFRESH_SECRET_KEY
            if is_refresh_token
            else settings.JWT_SECRET_KEY
        )
        return jwt.decode(token, secret, algorithms=[settings.JWT_ALGORITHM])
    except Exception as e:
        log_error(e, "토큰 디코딩 실패")
        raise


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증"""
    try:
        # 해시된 비밀번호와 평문 비밀번호 비교
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), hashed_password.encode('utf-8')
        )
    except Exception as e:
        log_error(e, "비밀번호 검증 실패")
        raise