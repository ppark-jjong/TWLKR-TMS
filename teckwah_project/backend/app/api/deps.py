# backend/app/api/deps.py
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from datetime import datetime

from app.config.database import get_db
from app.config.settings import get_settings
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_info, log_error

settings = get_settings()


async def get_token_from_header(request: Request) -> str:
    """요청 헤더에서 토큰 추출"""
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 토큰이 필요합니다",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return authorization.split(" ")[1]


async def verify_token(token: str = Depends(get_token_from_header)) -> TokenData:
    """토큰 검증 및 페이로드 추출"""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )

        # 토큰 만료 검증
        exp = payload.get("exp")
        if not exp or datetime.utcnow().timestamp() > exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="토큰이 만료되었습니다"
            )

        return TokenData(
            user_id=payload.get("sub"),
            department=payload.get("department"),
            role=payload.get("role"),
        )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다"
        )


async def get_current_user_department(
    token_data: TokenData = Depends(verify_token),
) -> str:
    """현재 사용자 부서 정보 추출"""
    return token_data.department
