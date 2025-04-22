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
    현재 인증된 사용자 정보 반환 + 디버깅 로그 추가
    """
    logger.debug(f"의존성 get_current_user 시작 - 경로: {request.url.path}")
    is_auth_endpoint = request.url.path == "/auth/me"

    if not session_id:
        logger.debug("  세션 ID 쿠키 없음 (session_id is None)")
        if not is_auth_endpoint:
            logger.warning(f"세션 없이 접근 시도: {request.url.path}")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증이 필요합니다",
        )
    else:
        logger.debug(f"  세션 ID 쿠키 발견: {session_id[:8]}...")

    try:
        session = get_session(session_id)
        logger.debug(f"  get_session('{session_id[:8]}...') 호출 결과: {session}")
    except Exception as e_get_session:
        logger.error(f"  get_session 호출 중 오류 발생: {e_get_session}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="세션 조회 중 오류 발생",
        )

    if not session:
        logger.debug("  세션 데이터 없음 (session is None/empty)")
        if not is_auth_endpoint:
            logger.warning(
                f"유효하지 않은 세션으로 접근 시도: {request.url.path}, 세션ID: {session_id[:8]}..."
            )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="세션이 만료되었거나 유효하지 않습니다",
        )

    user_info = {
        "user_id": session.get("user_id"),
        "user_role": session.get("user_role"),
        "session_id": session_id,
    }
    logger.debug(f"  get_current_user 반환 예정 데이터: {user_info}")

    if not isinstance(user_info.get("user_id"), str) or not user_info.get("user_id"):
        logger.warning(
            f"  세션에서 가져온 user_id가 유효하지 않음: {user_info.get('user_id')}"
        )

    return user_info


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
