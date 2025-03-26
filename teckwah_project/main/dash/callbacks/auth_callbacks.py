# teckwah_project/main/dash/callbacks/auth_callbacks.py
from dash import Dash, Output, Input, State, callback_context, no_update
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
from main.dash.utils.callback_helpers import create_alert_data

logger = logging.getLogger(__name__)


def register_callbacks(app: Dash):
    """인증 관련 콜백 등록"""

    @app.callback(
        [
            Output("auth-store", "data", allow_duplicate=True),
            Output("user-info-store", "data", allow_duplicate=True),
            Output("login-message", "children"),
            Output("url", "pathname", allow_duplicate=True),
            Output("app-state-store", "data", allow_duplicate=True),
        ],
        [Input("login-button", "n_clicks")],
        [
            State("user_id", "value"),
            State("password", "value"),
            State("app-state-store", "data"),
        ],
        prevent_initial_call=True,
    )
    def login(n_clicks, user_id, password, app_state):
        """로그인 처리 콜백"""
        if not n_clicks:
            raise PreventUpdate

        if not user_id or not password:
            return (
                no_update,
                no_update,
                "사용자 ID와 비밀번호를 입력하세요",
                no_update,
                no_update,
            )

        # API 호출하여 로그인
        response = ApiClient.login(user_id, password)

        if not response.get("success", False):
            logger.warning(f"로그인 실패: {response.get('message', '알 수 없는 오류')}")
            return (
                no_update,
                no_update,
                response.get("message", "로그인에 실패했습니다"),
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
        if app_state is None:
            app_state = {}
        updated_app_state = {**app_state, "alert": alert}

        # 대시보드 페이지로 리다이렉트
        return auth_data, user_info, no_update, "/dashboard", updated_app_state

    @app.callback(
        [
            Output("auth-store", "clear_data", allow_duplicate=True),
            Output("user-info-store", "clear_data", allow_duplicate=True),
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
        refresh_token = auth_data.get("refresh_token", "")
        access_token = auth_data.get("access_token", "")

        if refresh_token:
            ApiClient.logout(refresh_token, access_token)

        logger.info("로그아웃 처리 완료")

        # 알림 메시지
        alert = create_alert_data(message="로그아웃 되었습니다.", color="primary")

        # 앱 상태 업데이트 (알림 추가)
        if app_state is None:
            app_state = {}
        updated_app_state = {**app_state, "alert": alert}

        # 스토리지 데이터 삭제 및 로그인 페이지로 리다이렉트
        return True, True, "/", updated_app_state

    @app.callback(
        [
            Output("auth-store", "data", allow_duplicate=True),
            Output("url", "pathname", allow_duplicate=True),
            Output("app-state-store", "data", allow_duplicate=True),
        ],
        [Input("url", "pathname")],
        [State("auth-store", "data"), State("app-state-store", "data")],
        prevent_initial_call=True,
    )
    def check_auth_status(pathname, auth_data, app_state):
        """인증 상태 확인"""
        # 로그인 페이지는 인증 검증 제외
        if pathname == "/" or pathname is None:
            return no_update, no_update, no_update

        # 인증 정보가 없는 경우
        if not is_token_valid(auth_data):
            logger.warning("인증 정보 없음, 로그인 페이지로 리다이렉트")

            # 알림 메시지
            alert = create_alert_data(
                message="인증이 필요합니다. 로그인해주세요.", color="warning"
            )

            # 앱 상태 업데이트 (알림 추가)
            if app_state is None:
                app_state = {}
            updated_app_state = {**app_state, "alert": alert}

            return None, "/", updated_app_state

        return no_update, no_update, no_update

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
            if app_state is None:
                app_state = {}
            updated_app_state = {**app_state, "alert": alert}

            return no_update, updated_app_state

        # 갱신 성공
        logger.info("토큰 수동 갱신 성공")

        # 알림 메시지
        alert = create_alert_data(
            message="인증이 갱신되었습니다.",
            color="success",
        )

        # 앱 상태 업데이트 (알림 추가)
        if app_state is None:
            app_state = {}
        updated_app_state = {**app_state, "alert": alert}

        return new_auth_data, updated_app_state

    # 인증 만료 확인 콜백 - 사용자에게 경고 표시
    @app.callback(
        Output("session-expiry-alert", "children", allow_duplicate=True),
        [Input("check-session-button", "n_clicks")],
        [State("auth-store", "data")],
        prevent_initial_call=True,
    )
    def check_session_expiry(n_clicks, auth_data):
        """세션 만료 확인"""
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
