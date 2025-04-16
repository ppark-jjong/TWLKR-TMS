"""
인증 관련 미들웨어
"""

from fastapi import Request, HTTPException, status, Depends
from backend.utils.logger import logger
from fastapi.security import APIKeyCookie
from typing import Optional, Dict, Any, Callable
from functools import wraps

from backend.utils.security import get_session
from backend.models.user import UserRole

# 쿠키 기반 세션 인증
session_cookie = APIKeyCookie(name="session_id", auto_error=False)


async def get_current_user(
    request: Request, session_id: Optional[str] = Depends(session_cookie)
) -> Dict[str, Any]:
    """
    현재 인증된 사용자 정보 반환
    """
    # /auth/me 엔드포인트에 대한 로깅 제한 (불필요한 경고 메시지 감소)
    is_auth_endpoint = request.url.path == "/auth/me"
    
    if not session_id:
        # /auth/me 엔드포인트인 경우 INFO 레벨로 로깅, 그 외에는 WARNING
        if not is_auth_endpoint:
            logger.warning(f"세션 없이 접근 시도: {request.url.path}")
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증이 필요합니다",
        )

    session = get_session(session_id)
    if not session:
        if not is_auth_endpoint:
            logger.warning(
                f"유효하지 않은 세션으로 접근 시도: {request.url.path}, 세션ID: {session_id[:8]}..."
            )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="세션이 만료되었거나 유효하지 않습니다",
        )

    return {
        "user_id": session["user_id"],
        "user_role": session["user_role"],
        "session_id": session_id,
    }


def admin_required(func: Callable) -> Callable:
    """
    관리자만 접근 가능한 엔드포인트 데코레이터
    """

    @wraps(func)
    async def wrapper(
        *args, current_user: Dict[str, Any] = Depends(get_current_user), **kwargs
    ):
        if current_user["user_role"] != UserRole.ADMIN:
            logger.warning(
                f"관리자 전용 기능 접근 시도: {current_user['user_id']}, 경로: {args[0].url.path if len(args) > 0 and hasattr(args[0], 'url') else 'UNKNOWN'}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다"
            )
        return await func(*args, current_user=current_user, **kwargs)

    return wrapper
