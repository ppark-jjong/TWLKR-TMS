# teckwah_project/main/dash/callbacks/auth_callbacks.py
from dash import Dash, Output, Input, State, callback_context, no_update
from dash.exceptions import PreventUpdate
import logging
import json
from typing import Dict, Any, List, Optional

from api.api_client import ApiClient
from utils.auth_helper import is_token_valid, get_formatted_timestamp

logger = logging.getLogger(__name__)

def register_callbacks(app: Dash):
    """인증 관련 콜백 등록"""
    
    @app.callback(
        [
            Output("auth-store", "data", allow_duplicate=True),
            Output("user-info-store", "data", allow_duplicate=True),
            Output("login-message", "children"),
            Output("url", "pathname", allow_duplicate=True)
        ],
        [
            Input("login-button", "n_clicks")
        ],
        [
            State("user_id", "value"),
            State("password", "value")
        ],
        prevent_initial_call=True
    )
    def login(n_clicks, user_id, password):
        """로그인 처리 콜백"""
        if not n_clicks:
            raise PreventUpdate
        
        if not user_id or not password:
            return no_update, no_update, "사용자 ID와 비밀번호를 입력하세요", no_update
        
        # API 호출하여 로그인
        response = ApiClient.login(user_id, password)
        
        if not response.get("success", False):
            return no_update, no_update, response.get("message", "로그인에 실패했습니다"), no_update
        
        # 토큰 및 사용자 정보 추출
        token_data = response.get("token", {})
        user_data = response.get("user", {})
        
        # 세션 스토리지에 저장할 데이터
        auth_data = {
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "is_authenticated": True,
            "auth_time": get_formatted_timestamp()
        }
        
        # 사용자 정보
        user_info = {
            "user_id": user_data.get("user_id"),
            "department": user_data.get("user_department"),
            "role": user_data.get("user_role"),
            "is_admin": user_data.get("user_role") == "ADMIN"
        }
        
        logger.info(f"로그인 성공: {user_info.get('user_id')}")
        
        # 대시보드 페이지로 리다이렉트
        return auth_data, user_info, no_update, "/dashboard"
    
    @app.callback(
        [
            Output("auth-store", "clear_data"),
            Output("user-info-store", "clear_data"),
            Output("url", "pathname", allow_duplicate=True)
        ],
        [
            Input("logout-button", "n_clicks")
        ],
        [
            State("auth-store", "data")
        ],
        prevent_initial_call=True
    )
    def logout(n_clicks, auth_data):
        """로그아웃 처리 콜백"""
        if not n_clicks or not auth_data:
            raise PreventUpdate
        
        # 리프레시 토큰으로 로그아웃 API 호출
        refresh_token = auth_data.get("refresh_token", "")
        access_token = auth_data.get("access_token", "")
        
        if refresh_token:
            ApiClient.logout(refresh_token, access_token)
        
        logger.info("로그아웃 처리 완료")
        
        # 스토리지 데이터 삭제 및 로그인 페이지로 리다이렉트
        return True, True, "/"
    
    @app.callback(
        [
            Output("auth-store", "data", allow_duplicate=True),
            Output("url", "pathname", allow_duplicate=True)
        ],
        [
            Input("url", "pathname")
        ],
        [
            State("auth-store", "data")
        ],
        prevent_initial_call=True
    )
    def check_auth_status(pathname, auth_data):
        """인증 상태 확인 및 갱신"""
        # 로그인 페이지는 인증 검증 제외
        if pathname == "/" or pathname is None:
            return no_update, no_update
        
        # 인증 정보가 없는 경우
        if not is_token_valid(auth_data):
            logger.warning("인증 정보 없음, 로그인 페이지로 리다이렉트")
            return None, "/"
        
        # 인증 상태 확인 API 호출
        access_token = auth_data.get("access_token", "")
        response = ApiClient.check_session(access_token)
        
        # 인증 실패 시 리다이렉트
        if not response.get("success", False):
            if "need_login" in response:
                logger.warning("세션 만료, 로그인 페이지로 리다이렉트")
                return None, "/"
        
        # 인증 유효함
        return no_update, no_update