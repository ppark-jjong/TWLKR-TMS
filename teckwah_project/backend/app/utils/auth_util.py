from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config.settings import get_settings
from backend.app.utils.exceptions_util import AuthenticationError
from backend.app.utils.logger_util import setup_logger

settings = get_settings()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = setup_logger()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """비밀번호 해시화"""
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    """액세스 토큰 생성"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token() -> tuple[str, datetime]:
    """리프레시 토큰 생성"""
    expires_delta = timedelta(days=7)
    expires_at = datetime.utcnow() + expires_delta
    to_encode = {"exp": expires_at}
    token = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return token, expires_at


def decode_token(token: str) -> Optional[dict]:
    """토큰 디코딩"""
    try:
        return jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError as e:
        logger.error(f"토큰 디코딩 실패: {str(e)}")
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """현재 인증된 사용자 정보 조회"""
    try:
        token = credentials.credentials
        payload = decode_token(token)
        if payload is None:
            raise AuthenticationError("유효하지 않은 토큰입니다.")
        return payload
    except Exception as e:
        logger.error(f"사용자 인증 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증에 실패했습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
