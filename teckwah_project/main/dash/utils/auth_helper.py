# teckwah_project/main/dash/utils/auth_helper.py
import time
import logging
from typing import Dict, Any, Optional, Tuple, Union
from dash import no_update
from datetime import datetime, timedelta

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

def handle_auth_error(pathname: str, auth_data: Optional[Dict[str, Any]], error_message: str = "인증이 필요합니다") -> Tuple[str, Dict[str, Any]]:
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