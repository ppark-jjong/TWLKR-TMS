# teckwah_project/main/server/utils/auth.py
from datetime import datetime, timedelta
from typing import Dict, Optional
from jose import jwt
from app.config.settings import get_settings
from app.utils.logger import log_error
import bcrypt

settings = get_settings()


def create_token(
    user_id: str,
    department: str,
    role: str,
    expires_delta: timedelta,
    is_refresh_token: bool = False,
) -> str:
    """JWT 토큰 생성"""
    try:
        expire = datetime.utcnow() + expires_delta
        payload = {
            "sub": user_id,
            "exp": expire,
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