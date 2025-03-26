# teckwah_project/main/dash/utils/auth_helper.py
import time
import logging
from typing import Dict, Any, Optional, Tuple, Union
from dash import no_update
from datetime import datetime, timedelta
from main.dash.api.api_client import ApiClient

logger = logging.getLogger(__name__)


def is_token_valid(auth_data: Optional[Dict[str, Any]]) -> bool:
    """토큰 유효성 확인"""
    if not auth_data:
        return False

    # 인증 데이터 확인
    access_token = auth_data.get("access_token")
    is_authenticated = auth_data.get("is_authenticated", False)

    return access_token is not None and is_authenticated


def is_admin_user(user_info: Optional[Dict[str, Any]]) -> bool:
    """관리자 사용자 여부 확인"""
    if not user_info:
        return False

    # 역할 확인
    role = user_info.get("role")
    is_admin = user_info.get("is_admin", False)

    return role == "ADMIN" or is_admin


def get_user_id(user_info: Optional[Dict[str, Any]]) -> str:
    """사용자 ID 가져오기"""
    if not user_info:
        return ""

    return user_info.get("user_id", "")


def handle_auth_error(
    pathname: str,
    auth_data: Optional[Dict[str, Any]],
    error_message: str = "인증이 필요합니다",
) -> Tuple[str, Dict[str, Any]]:
    """인증 오류 처리"""
    # 이미 로그인 페이지인 경우
    if pathname == "/" or pathname is None:
        return pathname, no_update

    # 로그인 페이지로 리다이렉트
    logger.warning(f"인증 오류 발생: {error_message}, 로그인 페이지로 리다이렉트")

    # 인증 데이터 초기화
    auth_data = None

    return "/", auth_data


def get_formatted_timestamp() -> str:
    """현재 타임스탬프 문자열 반환 (로깅용)"""
    now = datetime.now()
    return now.strftime("%Y-%m-%d %H:%M:%S")


def check_token_expiry(auth_data: Optional[Dict[str, Any]]) -> bool:
    """토큰 만료 임박 여부 확인 (만료 5분 전)

    Args:
        auth_data: 인증 데이터

    Returns:
        bool: 만료 임박 여부
    """
    if not auth_data:
        return False

    # 인증 시간 확인
    auth_time_str = auth_data.get("auth_time")
    if not auth_time_str:
        return False

    try:
        # 문자열을 datetime으로 변환
        auth_time = datetime.strptime(auth_time_str, "%Y-%m-%d %H:%M:%S")
        # 현재 시간
        now = datetime.now()
        # 액세스 토큰 만료 시간 계산 (기본 60분)
        expires_at = auth_time + timedelta(minutes=55)  # 만료 5분 전

        # 만료 임박 확인
        return now >= expires_at
    except Exception as e:
        logger.error(f"토큰 만료 시간 확인 중 오류: {str(e)}")
        return False


def refresh_token(auth_data: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """리프레시 토큰으로 액세스 토큰 갱신

    Args:
        auth_data: 현재 인증 데이터

    Returns:
        Tuple[bool, Optional[Dict]]: 성공 여부, 새 인증 데이터
    """
    if not auth_data:
        return False, None

    # 리프레시 토큰 확인
    refresh_token = auth_data.get("refresh_token")
    if not refresh_token:
        return False, None

    try:
        # 토큰 갱신 API 호출
        response = ApiClient.refresh_token(refresh_token)

        # 응답 확인
        if not response.get("success", False):
            logger.warning(
                f"토큰 갱신 실패: {response.get('message', '알 수 없는 오류')}"
            )
            return False, None

        # 새 토큰 정보 추출
        token_data = response.get("data", {}).get("token", {})

        # 새 인증 데이터 생성
        new_auth_data = {
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "is_authenticated": True,
            "auth_time": get_formatted_timestamp(),
        }

        logger.info("토큰 갱신 성공")
        return True, new_auth_data

    except Exception as e:
        logger.error(f"토큰 갱신 중 오류 발생: {str(e)}")
        return False, None


def check_session(access_token: str) -> bool:
    """세션 유효성 확인

    Args:
        access_token: 액세스 토큰

    Returns:
        bool: 세션 유효 여부
    """
    try:
        # 세션 확인 API 호출
        response = ApiClient.check_session(access_token)

        # 성공 여부 반환
        return response.get("success", False)
    except Exception as e:
        logger.error(f"세션 확인 중 오류 발생: {str(e)}")
        return False
