# teckwah_project/server/utils/auth.py
from datetime import datetime, timedelta
from typing import Dict, Optional, Any, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, status, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from server.config.settings import get_settings
from server.utils.logger import log_info, log_error
from server.utils.datetime import get_kst_now
from server.utils.error import UnauthorizedException, ERROR_MESSAGES
from server.schemas.auth_schema import TokenData

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def hash_password(password: str) -> str:
    """비밀번호 해싱"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증"""
    return pwd_context.verify(plain_password, hashed_password)


def create_token(
    user_id: str,
    department: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
    is_refresh_token: bool = False,
) -> str:
    """JWT 토큰 생성

    인증 토큰 또는 리프레시 토큰을 생성합니다.
    """
    now = get_kst_now()

    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": user_id,
        "department": department,
        "role": role,
        "iat": now.timestamp(),
        "exp": expire.timestamp(),
    }

    if is_refresh_token:
        payload["token_type"] = "refresh"
        secret_key = settings.JWT_REFRESH_SECRET_KEY
    else:
        payload["token_type"] = "access"
        secret_key = settings.JWT_SECRET_KEY

    return jwt.encode(payload, secret_key, algorithm=settings.JWT_ALGORITHM)


def decode_and_validate_token(token: str, token_type: str = "access") -> Dict[str, Any]:
    """토큰 디코딩 및 유효성 검증

    토큰을 디코딩하고 만료 여부를 확인합니다.
    """
    try:
        # 토큰 타입에 따라 적절한 시크릿 키 선택
        if token_type == "refresh":
            secret_key = settings.JWT_REFRESH_SECRET_KEY
        else:
            secret_key = settings.JWT_SECRET_KEY

        # 토큰 디코딩
        payload = jwt.decode(token, secret_key, algorithms=[settings.JWT_ALGORITHM])

        # 토큰 타입 검증 (추가적인 보안)
        if payload.get("token_type") != token_type:
            raise UnauthorizedException(
                f"잘못된 토큰 타입: {payload.get('token_type')}"
            )

        # 만료 시간 검증
        exp = payload.get("exp")
        now = get_kst_now().timestamp()

        if not exp or now > exp:
            raise UnauthorizedException(
                "인증이 만료되었습니다", error_code="TOKEN_EXPIRED"
            )

        return payload

    except JWTError as e:
        log_error(e, "토큰 디코딩 실패")
        raise UnauthorizedException(
            "유효하지 않은 토큰입니다", error_code="INVALID_TOKEN"
        )


def extract_token_from_header(authorization: Optional[str]) -> str:
    """Authorization 헤더에서 토큰 추출"""
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedException(
            "인증 헤더가 올바르지 않습니다", error_code="INVALID_AUTH_HEADER"
        )

    # "Bearer " 제거 후 토큰 반환
    return authorization.split(" ")[1]


def get_token_data_from_header(
    authorization: Optional[str], token_type: str = "access"
) -> TokenData:
    """Authorization 헤더에서 토큰 추출하여 사용자 정보 반환

    이 함수는 API 컨트롤러에서 인증을 처리할 때 사용됩니다.
    """
    token = extract_token_from_header(authorization)
    payload = decode_and_validate_token(token, token_type)

    return TokenData(
        user_id=payload.get("sub"),
        department=payload.get("department"),
        role=payload.get("role"),
    )


def verify_access_token(token: str) -> Dict[str, Any]:
    """액세스 토큰 검증 (이전 버전과의 호환성 유지)"""
    return decode_and_validate_token(token, "access")


def verify_refresh_token(token: str) -> Dict[str, Any]:
    """리프레시 토큰 검증 (이전 버전과의 호환성 유지)"""
    return decode_and_validate_token(token, "refresh")


async def verify_admin_role(token_data: TokenData) -> TokenData:
    """관리자 권한 검증

    사용자 토큰 데이터에서 관리자 권한이 있는지 확인합니다.
    """
    if token_data.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "message": ERROR_MESSAGES["FORBIDDEN"],
                "error_code": "FORBIDDEN",
            },
        )
    return token_data
