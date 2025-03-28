# teckwah_project/main/dash/callbacks/auth_callbacks.py
from dash import Dash, Output, Input, State, callback_context, no_update, html
from dash.exceptions import PreventUpdate
import logging
import json
import time
from typing import Dict, Any, List, Optional

from main.dash.api.api_client import ApiClient
from main.dash.utils.auth_helper import (
    is_token_valid,
    get_formatted_timestamp,
    check_token_expiry,
    refresh_token,
    check_session,
)
from main.dash.utils.state_manager import update_app_state, create_alert_data

logger = logging.getLogger(__name__)

def register_auth_callbacks(app: Dash):
    """인증 관련 콜백 통합 등록"""

    # 폼 제출과 로그인 버튼 클릭을 통합한 로그인 콜백
    @app.callback(
        [
            Output("auth-store", "data"),
            Output("user-info-store", "data"),
            Output("login-message", "children"),
            Output("url", "pathname"),
            Output("app-state-store", "data", allow_duplicate=True),
        ],
        [
            Input("login-button", "n_clicks"),
            Input("login-form", "n_submit"),
        ],
        [
            State("user_id", "value"),
            State("password", "value"),
            State("app-state-store", "data"),
        ],
        prevent_initial_call=True,
    )
    def login(n_clicks, n_submit, user_id, password, app_state):
        """통합 로그인 처리 - 버튼 클릭 또는 폼 제출로 트리거"""
        ctx = callback_context
        
        # 트리거 확인
        if not ctx.triggered:
            raise PreventUpdate
            
        # 입력값 검증
        if not user_id or not password:
            logger.warning("로그인 실패: 사용자 ID 또는 비밀번호 누락")
            return (
                no_update,
                no_update,
                "사용자 ID와 비밀번호를 입력하세요",
                no_update,
                no_update,
            )

        # API 호출하여 로그인
        logger.info(f"로그인 시도: {user_id}")
        response = ApiClient.login(user_id, password)

        if not response.get("success", False):
            error_message = response.get("message", "로그인에 실패했습니다")
            logger.warning(f"로그인 실패: {error_message}")
            return (
                no_update,
                no_update,
                error_message,
                no_update,
                no_update,
            )

        # 토큰 및 사용자 정보 추출
        token_data = response.get("token", {})
        user_data = response.get("user", {})

        # 세션 스토리지에 저장할 데이터
        auth_data = {
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "is_authenticated": True,
            "auth_time": get_formatted_timestamp(),
        }

        # 사용자 정보
        user_info = {
            "user_id": user_data.get("user_id"),
            "department": user_data.get("user_department"),
            "role": user_data.get("user_role"),
            "is_admin": user_data.get("user_role") == "ADMIN",
        }

        logger.info(f"로그인 성공: {user_info.get('user_id')}")

        # 로그인 성공 알림 메시지
        alert = create_alert_data(
            message=f"로그인 성공! {user_info.get('user_id')}님 환영합니다.",
            color="success",
        )

        # 앱 상태 업데이트 (알림 추가)
        updated_app_state = update_app_state(app_state or {}, {"alert": alert})

        # 대시보드 페이지로 리다이렉트
        return auth_data, user_info, no_update, "/dashboard", updated_app_state

    # 로그아웃 콜백
    @app.callback(
        [
            Output("auth-store", "clear_data"),
            Output("user-info-store", "clear_data"),
            Output("url", "pathname", allow_duplicate=True),
            Output("app-state-store", "data", allow_duplicate=True),
        ],
        [Input("logout-button", "n_clicks")],
        [State("auth-store", "data"), State("app-state-store", "data")],
        prevent_initial_call=True,
    )
    def logout(n_clicks, auth_data, app_state):
        """로그아웃 처리 콜백"""
        if not n_clicks or not auth_data:
            raise PreventUpdate

        # 리프레시 토큰으로 로그아웃 API 호출
        refresh_token_value = auth_data.get("refresh_token", "")
        access_token = auth_data.get("access_token", "")

        if refresh_token_value:
            try:
                ApiClient.logout(refresh_token_value, access_token)
            except Exception as e:
                logger.error(f"로그아웃 API 호출 오류: {str(e)}")

        logger.info("로그아웃 처리 완료")

        # 알림 메시지
        alert = create_alert_data(message="로그아웃 되었습니다.", color="primary")

        # 앱 상태 업데이트 (알림 추가)
        updated_app_state = update_app_state(app_state or {}, {"alert": alert})

        # 스토리지 데이터 삭제 및 로그인 페이지로 리다이렉트
        return True, True, "/", updated_app_state

    # 인증 상태 자동 리다이렉트 콜백
    @app.callback(
        Output("url", "pathname", allow_duplicate=True),
        [Input("auth-store", "data")],
        [State("url", "pathname")],
        prevent_initial_call=True,
    )
    def auto_redirect_based_on_auth(auth_data, pathname):
        """인증 상태에 따른 자동 리다이렉트"""
        # 패스명이 없거나 인증 데이터가 없으면 처리 불필요
        if pathname is None:
            raise PreventUpdate
            
        # 이미 로그인 페이지인 경우 인증 여부 확인
        if pathname == "/":
            # 인증된 상태면 대시보드로 리다이렉트
            if is_token_valid(auth_data):
                logger.info("이미 인증된 사용자가 로그인 페이지 접근, 대시보드로 리다이렉트")
                return "/dashboard"
            return no_update
        
        # 대시보드 또는 다른 페이지에 접근하려는 경우 인증 확인
        else:
            # 인증되지 않은 상태면 로그인 페이지로 리다이렉트
            if not is_token_valid(auth_data):
                logger.warning("인증되지 않은 상태로 페이지 접근, 로그인 페이지로 리다이렉트")
                return "/"
            return no_update
            
    # 토큰 갱신 콜백 - 명시적 버튼 클릭 시에만 동작
    @app.callback(
        [
            Output("auth-store", "data", allow_duplicate=True),
            Output("app-state-store", "data", allow_duplicate=True),
        ],
        [Input("refresh-token-button", "n_clicks")],
        [State("auth-store", "data"), State("app-state-store", "data")],
        prevent_initial_call=True,
    )
    def manual_token_refresh(n_clicks, auth_data, app_state):
        """수동 토큰 갱신 콜백"""
        if not n_clicks or not auth_data:
            raise PreventUpdate

        # 토큰 갱신 시도
        success, new_auth_data = refresh_token(auth_data)

        if not success or not new_auth_data:
            # 갱신 실패
            alert = create_alert_data(
                message="인증 토큰 갱신에 실패했습니다. 다시 로그인해주세요.",
                color="danger",
            )

            # 앱 상태 업데이트 (알림 추가)
            updated_app_state = update_app_state(app_state or {}, {"alert": alert})
            return no_update, updated_app_state

        # 갱신 성공
        logger.info("토큰 수동 갱신 성공")

        # 알림 메시지
        alert = create_alert_data(
            message="인증이 갱신되었습니다.",
            color="success",
        )

        # 앱 상태 업데이트 (알림 추가)
        updated_app_state = update_app_state(app_state or {}, {"alert": alert})

        return new_auth_data, updated_app_state

    # 세션 확인 콜백 - 명시적 버튼 클릭 시에만 동작
    @app.callback(
        Output("session-expiry-alert", "children"),
        [Input("check-session-button", "n_clicks")],
        [State("auth-store", "data")],
        prevent_initial_call=True,
    )
    def check_session_expiry(n_clicks, auth_data):
        """세션 만료 확인 및 경고 표시"""
        if not n_clicks or not auth_data:
            raise PreventUpdate

        # 토큰 만료 임박 확인
        if check_token_expiry(auth_data):
            return html.Div(
                dbc.Alert(
                    "세션이 곧 만료됩니다. '토큰 갱신' 버튼을 클릭하여 세션을 연장하세요.",
                    color="warning",
                    dismissable=True,
                    is_open=True,
                )
            )
        return html.Div()