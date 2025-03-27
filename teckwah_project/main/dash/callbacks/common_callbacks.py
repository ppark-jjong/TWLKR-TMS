# teckwah_project/main/dash/callbacks/common_callbacks.py
from dash import Dash, Output, Input, State, callback_context, no_update, html
from dash.exceptions import PreventUpdate
import dash_bootstrap_components as dbc
import logging
import json
from typing import Dict, Any, List, Optional

from main.dash.components.navbar import create_navbar
from main.dash.components.alerts import create_alert
from main.dash.layouts.login_layout import create_login_layout
from main.dash.layouts.dashboard_layout import create_dashboard_layout
from main.dash.layouts.visualization_layout import create_visualization_layout
from main.dash.layouts.download_layout import create_download_layout

from main.dash.utils.auth_helper import is_token_valid, is_admin_user, handle_auth_error
from main.dash.api.api_client import ApiClient

logger = logging.getLogger(__name__)


def register_callbacks(app: Dash):
    """공통 콜백 등록"""

    @app.callback(
        [
            Output("page-content", "children"),
            Output("navbar-container", "children"),
            Output("auth-store", "data", allow_duplicate=True),
            Output("url", "pathname", allow_duplicate=True),
        ],
        [Input("url", "pathname")],
        [State("auth-store", "data"), State("user-info-store", "data")],
        prevent_initial_call=True,
    )
    def display_page(pathname, auth_data, user_info):
        """페이지 라우팅 처리"""
        ctx = callback_context
        if not ctx.triggered:
            raise PreventUpdate

        # 현재 경로
        current_path = pathname or "/"

        # 인증 상태 확인
        if not is_token_valid(auth_data) and current_path != "/":
            # 인증 정보 없음 => 로그인 페이지로 리다이렉트
            return create_login_layout(), html.Div(), None, "/"

        # 경로별 페이지 컴포넌트 반환
        if current_path == "/":
            # 이미 로그인된 상태라면 대시보드로 리다이렉트
            if is_token_valid(auth_data):
                return no_update, no_update, no_update, "/dashboard"
            else:
                return create_login_layout(), html.Div(), no_update, no_update

        elif current_path == "/dashboard":
            return (
                create_dashboard_layout(),
                create_navbar(user_info),
                no_update,
                no_update,
            )

        elif current_path == "/visualization":
            return (
                create_visualization_layout(),
                create_navbar(user_info),
                no_update,
                no_update,
            )

        elif current_path == "/download":
            # 관리자만 접근 가능
            if not is_admin_user(user_info):
                return (
dbc.Alert("관리자 권한이 필요합니다.", color="danger"),
                    create_navbar(user_info),
                    no_update,
                    "/dashboard",
                )
            return (
                create_download_layout(),
                create_navbar(user_info),
                no_update,
                no_update,
            )

        else:
            # 알 수 없는 경로 => 대시보드로 리다이렉트
            return no_update, no_update, no_update, "/dashboard"

    @app.callback(
        Output("alert-container", "children", allow_duplicate=True),
        [Input("app-state-store", "data")],
        prevent_initial_call=True,
    )
    def show_alert(app_state):
        """알림 메시지 표시 - 개선된 사용자 피드백 제공"""
        if not app_state or not isinstance(app_state, dict):
            raise PreventUpdate

        # 알림 메시지 추출
        alert_data = app_state.get("alert")
        if not alert_data:
            raise PreventUpdate

        # 알림 속성 추출
        message = alert_data.get("message", "")
        color = alert_data.get("color", "primary")
        duration = alert_data.get("duration", 5000)  # 더 길게 표시
        icon = None

        # 내용이 없으면 무시
        if not message:
            raise PreventUpdate
        
        # 메시지 타입에 따른 아이콘 설정
        if color == "success":
            icon = html.I(className="fas fa-check-circle me-2")
        elif color == "danger":
            icon = html.I(className="fas fa-exclamation-circle me-2")
        elif color == "warning":
            icon = html.I(className="fas fa-exclamation-triangle me-2")
        elif color == "info":
            icon = html.I(className="fas fa-info-circle me-2")
        else:
            icon = html.I(className="fas fa-bell me-2")
        
        # 알림 내용 구성
        alert_content = [
            html.Div(
                [
                    icon, 
                    html.Span(message, style={"verticalAlign": "middle"}),
                ],
                className="d-flex align-items-center"
            )
        ]

        # 알림 컴포넌트 생성 - 향상된 스타일 적용
        return dbc.Alert(
            alert_content,
            color=color,
            dismissable=True,
            duration=duration,
            is_open=True,
            className="shadow-lg border-start border-5 border-" + color,
            style={
                "position": "fixed", 
                "top": "20px", 
                "right": "20px", 
                "zIndex": 9999,
                "minWidth": "300px",
                "maxWidth": "500px",
                "fontSize": "16px",
                "opacity": 0.95,
            },
        )

    # 앱 상태 초기화 콜백 단순화
    @app.callback(
        Output("app-state-store", "data", allow_duplicate=True),
        [Input("url", "search")],
        [State("app-state-store", "data")],
        prevent_initial_call=True,
    )
    def init_app_state(_, current_state):
        """앱 상태 초기화 (단순화)"""
        # 이미 초기화되어 있으면 업데이트 방지
        if current_state is not None:
            raise PreventUpdate

        # 기본 앱 상태 설정
        app_state = {
            "alert": None,
            "modals": {
                "detail": {"is_open": False, "dashboard_id": None},
                "assign": {"is_open": False, "selected_ids": []},
                "delete": {"is_open": False, "selected_ids": []},
                "new": {"is_open": False},
            },
            "filters": {"type": "ALL", "department": "ALL", "warehouse": "ALL"},
        }

        return app_state

    # 모달 컴포넌트 렌더링 콜백 (필요시에만 갱신)
    @app.callback(
        Output("modals-container", "children", allow_duplicate=True),
        [Input("app-state-store", "data")],
        prevent_initial_call=True,
    )
    def render_modals(app_state):
        """모달 컴포넌트 렌더링 (상태 변경 시에만)"""
        if not app_state or "modals" not in app_state:
            raise PreventUpdate

        from main.dash.components.modals import (
            create_detail_modal,
            create_assign_modal,
            create_delete_confirm_modal,
            create_new_dashboard_modal,
        )

        # 모든 모달 컴포넌트 생성
        detail_modal = create_detail_modal()
        assign_modal = create_assign_modal()
        delete_modal = create_delete_confirm_modal()
        new_modal = create_new_dashboard_modal()

        return [detail_modal, assign_modal, delete_modal, new_modal]