# teckwah_project/main/dash/callbacks/visualization_callbacks.py
from dash import Dash, Output, Input, State, callback_context, no_update
from dash.exceptions import PreventUpdate
import plotly.graph_objects as go
import plotly.express as px
import logging
import json
import pandas as pd
from typing import Dict, Any, List, Optional
import requests

from main.dash.api.api_client import ApiClient
from main.dash.utils.auth_helper import is_token_valid
from main.dash.utils.format_helper import create_color_scale
from main.dash.utils.callback_helpers import handle_network_error, create_error_response, create_alert_data
from main.server.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

def register_callbacks(app: Dash):
    """시각화 관련 콜백 등록"""

    @app.callback(
        [
            Output("delivery-status-container", "className", allow_duplicate=True),
            Output("hourly-orders-container", "className", allow_duplicate=True),
            Output("viz-loading-spinner", "style", allow_duplicate=True),
        ],
        [Input("chart-type-selector", "value")],
        prevent_initial_call=True,
    )
    def toggle_chart_container(chart_type):
        """차트 타입에 따른 컨테이너 토글"""
        if chart_type == "delivery_status":
            return "d-block", "d-none", {"display": "none"}
        elif chart_type == "hourly_orders":
            return "d-none", "d-block", {"display": "none"}
        else:
            return no_update, no_update, no_update

    @app.callback(
        [
            Output("delivery-status-pie-chart", "figure", allow_duplicate=True),
            Output("department-status-bar-chart", "figure", allow_duplicate=True),
            Output("total-delivery-count", "children", allow_duplicate=True),
            Output("waiting-delivery-count", "children", allow_duplicate=True),
            Output("completed-delivery-count", "children", allow_duplicate=True),
            Output("viz-loading-spinner", "style", allow_duplicate=True),
            Output("app-state-store", "data", allow_duplicate=True),
        ],
        [Input("viz-refresh-button", "n_clicks")],  # 명시적 버튼 클릭으로 변경
        [
            State("viz-date-picker-range", "start_date"),
            State("viz-date-picker-range", "end_date"),
            State("chart-type-selector", "value"),
            State("auth-store", "data"),
            State("app-state-store", "data")
        ],
        prevent_initial_call=True,
    )
    def update_delivery_status_charts(
        refresh_clicks, start_date, end_date, chart_type, auth_data, app_state
    ):
        """배송 현황 차트 업데이트 (명시적 버튼 클릭으로 수정)"""
        if not refresh_clicks:
            raise PreventUpdate

        # 차트 타입이 배송 현황이 아닌 경우 무시
        if chart_type != "delivery_status":
            return (
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
            )

        # 인증 확인
        if not is_token_valid(auth_data):
            return (
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
            )

        # 날짜 확인
        if not start_date or not end_date:
            return (
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
                {"display": "none"},
                {
                    **app_state,
                    "alert": {
                        "message": "조회 기간을 선택해주세요.",
                        "color": "warning",
                    },
                },
            )

        # 액세스 토큰
        access_token = auth_data.get("access_token", "")

        # 로딩 표시
        loading_style = {"display": "block"}

        try:
            # API 호출로 데이터 로드
            response = ApiClient.get_delivery_status(start_date, end_date, access_token)

            # 로딩 숨김
            loading_style = {"display": "none"}

            if not response.get("success", False):
                # API 오류
                return (
                    no_update,
                    no_update,
                    no_update,
                    no_update,
                    no_update,
                    loading_style,
                    {
                        **app_state,
                        "alert": {
                            "message": response.get(
                                "message", "데이터 로드에 실패했습니다."
                            ),
                            "color": "danger",
                        },
                    },
                )

            # 데이터 추출
            data = response.get("data", {})

            # 총 건수
            total_count = data.get("total_count", 0)

            # 부서별 데이터
            department_data = data.get("department_breakdown", {})

            # 전체 상태별 카운트
            status_counts = {
                "WAITING": 0,
                "IN_PROGRESS": 0,
                "COMPLETE": 0,
                "ISSUE": 0,
                "CANCEL": 0,
            }

            department_status_data = []

            # 부서별 데이터 처리
            for dept, dept_data in department_data.items():
                dept_total = dept_data.get("total", 0)
                status_breakdown = dept_data.get("status_breakdown", [])

                for status_info in status_breakdown:
                    status = status_info.get("status", "")
                    count = status_info.get("count", 0)
                    percentage = status_info.get("percentage", 0)

                    # 전체 카운트에 더하기
                    if status in status_counts:
                        status_counts[status] += count

                    # 부서별 상태 데이터 추가
                    department_status_data.append(
                        {
                            "department": dept,
                            "status": status,
                            "count": count,
                            "percentage": percentage,
                        }
                    )

            # 파이 차트 데이터 준비
            status_labels = {
                "WAITING": "대기",
                "IN_PROGRESS": "진행 중",
                "COMPLETE": "완료",
                "ISSUE": "이슈",
                "CANCEL": "취소",
            }

            status_colors = {
                "WAITING": "#ffebee",
                "IN_PROGRESS": "#fff8e1",
                "COMPLETE": "#e8f5e9",
                "ISSUE": "#ede7f6",
                "CANCEL": "#eceff1",
            }

            # 파이 차트 생성
            pie_data = []
            pie_labels = []
            pie_colors = []

            for status, count in status_counts.items():
                if count > 0:
                    pie_data.append(count)
                    pie_labels.append(status_labels.get(status, status))
                    pie_colors.append(status_colors.get(status, "#e0e0e0"))

            pie_fig = go.Figure(
                data=[
                    go.Pie(
                        labels=pie_labels,
                        values=pie_data,
                        hole=0.3,
                        marker_colors=pie_colors,
                        textinfo="value+percent",
                        textposition="inside",
                        insidetextorientation="radial",
                    )
                ]
            )

            pie_fig.update_layout(
                margin=dict(l=20, r=20, t=30, b=20),
                showlegend=True,
                legend=dict(
                    orientation="h", yanchor="bottom", y=1.02, xanchor="center", x=0.5
                ),
            )

            # 부서별 바 차트 생성
            if department_status_data:
                df = pd.DataFrame(department_status_data)

                # 상태 순서 설정
                status_order = ["WAITING", "IN_PROGRESS", "COMPLETE", "ISSUE", "CANCEL"]
                df["status"] = pd.Categorical(
                    df["status"], categories=status_order, ordered=True
                )
                df = df.sort_values(["department", "status"])

                # 각 상태를 한글로 변환
                df["status_label"] = df["status"].map(status_labels)

                bar_fig = px.bar(
                    df,
                    x="department",
                    y="count",
                    color="status_label",
                    color_discrete_map={
                        status_labels[s]: status_colors[s] for s in status_order
                    },
                    barmode="stack",
                    text="count",
                    labels={
                        "department": "부서",
                        "count": "건수",
                        "status_label": "상태",
                    },
                )

                bar_fig.update_layout(
                    margin=dict(l=20, r=20, t=30, b=20),
                    legend=dict(
                        orientation="h",
                        yanchor="bottom",
                        y=1.02,
                        xanchor="center",
                        x=0.5,
                    ),
                )

                bar_fig.update_traces(textposition="inside", texttemplate="%{y}")
            else:
                # 데이터 없음 표시
                bar_fig = go.Figure()
                bar_fig.add_annotation(
                    text="데이터가 없습니다",
                    xref="paper",
                    yref="paper",
                    x=0.5,
                    y=0.5,
                    showarrow=False,
                    font=dict(size=20),
                )

            # 통계 카드 데이터
            total = f"{total_count:,}"
            waiting = f"{status_counts.get('WAITING', 0):,}"
            completed = f"{status_counts.get('COMPLETE', 0):,}"

            return pie_fig, bar_fig, total, waiting, completed, loading_style, app_state

        except requests.ConnectionError as e:
            logger.error(f"연결 오류: {str(e)}")
            return (
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
                {"display": "none"},
                {
                    **app_state,
                    "alert": {
                        "message": "서버 연결에 실패했습니다. 네트워크 연결을 확인하세요.",
                        "color": "danger",
                    },
                },
            )
        except requests.Timeout as e:
            logger.error(f"타임아웃 오류: {str(e)}")
            return (
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
                {"display": "none"},
                {
                    **app_state,
                    "alert": {
                        "message": f"서버 응답 시간이 초과되었습니다({settings.API_TIMEOUT}초). 다시 시도해주세요.",
                        "color": "danger",
                    },
                },
            )
        except Exception as e:
            logger.error(f"배송 현황 데이터 로드 오류: {str(e)}", exc_info=True)
            return (
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
                {"display": "none"},
                {
                    **app_state,
                    "alert": {
                        "message": "데이터 처리 중 오류가 발생했습니다.",
                        "color": "danger",
                    },
                },
            )

    @app.callback(
        [
            Output("hourly-orders-line-chart", "figure", allow_duplicate=True),
            Output("department-hourly-heatmap", "figure", allow_duplicate=True),
            Output("total-orders-count", "children", allow_duplicate=True),
            Output("avg-orders-count", "children", allow_duplicate=True),
            Output("peak-hour", "children", allow_duplicate=True),
            Output("viz-loading-spinner", "style", allow_duplicate=True),
            Output("app-state-store", "data", allow_duplicate=True),
        ],
        [Input("viz-refresh-button", "n_clicks")],  # 명시적 버튼 클릭으로 변경
        [
            State("viz-date-picker-range", "start_date"),
            State("viz-date-picker-range", "end_date"),
            State("chart-type-selector", "value"),
            State("auth-store", "data"),
            State("app-state-store", "data")
        ],
        prevent_initial_call=True,
    )
    def update_hourly_orders_charts(
        refresh_clicks, start_date, end_date, chart_type, auth_data, app_state
    ):
        """시간별 주문 차트 업데이트 (명시적 버튼 클릭으로 수정)"""
        if not refresh_clicks:
            raise PreventUpdate

        # 차트 타입이 시간별 주문이 아닌 경우 무시
        if chart_type != "hourly_orders":
            return (
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
            )

        # 인증 확인
        if not is_token_valid(auth_data):
            return (
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
                {"display": "none"},
                {
                    **app_state,
                    "alert": {
                        "message": "로그인이 필요합니다",
                        "color": "warning",
                    },
                },
            )

        # 날짜 확인
        if not start_date or not end_date:
            return (
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
                {"display": "none"},
                {
                    **app_state,
                    "alert": {
                        "message": "조회 기간을 선택해주세요",
                        "color": "warning",
                    },
                },
            )

        # 액세스 토큰
        access_token = auth_data.get("access_token", "")

        # 로딩 표시
        loading_style = {"display": "block"}

        try:
            # API 호출로 데이터 로드
            response = ApiClient.get_hourly_orders(start_date, end_date, access_token)

            # 로딩 숨김
            loading_style = {"display": "none"}

            if not response.get("success", False):
                # API 오류
                return (
                    no_update,
                    no_update,
                    no_update,
                    no_update,
                    no_update,
                    loading_style,
                    {
                        **app_state,
                        "alert": {
                            "message": response.get(
                                "message", "데이터 로드에 실패했습니다."
                            ),
                            "color": "danger",
                        },
                    },
                )

            # 데이터 추출
            data = response.get("data", {})
            
            # 여기에 시간별 주문 차트 생성 로직 추가...
            # 예시로 빈 차트만 생성
            line_fig = go.Figure()
            heatmap_fig = go.Figure()
            
            # 통계 데이터
            total_orders = "0"
            avg_orders = "0"
            peak_hour = "--"
            
            # 알림 메시지
            alert = create_alert_data(
                message="데이터를 성공적으로 로드했습니다.",
                color="success",
            )
            
            updated_app_state = {**app_state, "alert": alert}

            return (
                line_fig,
                heatmap_fig,
                total_orders,
                avg_orders,
                peak_hour,
                loading_style,
                updated_app_state,
            )

        except requests.ConnectionError as e:
            # 연결 오류 처리
            logger.error(f"API 서버 연결 오류: {str(e)}")
            return (
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
                {"display": "none"},
                {
                    **app_state,
                    "alert": {
                        "message": "API 서버에 연결할 수 없습니다. 네트워크 연결을 확인하세요.",
                        "color": "danger",
                    },
                },
            )

        except requests.Timeout as e:
            # 타임아웃 오류 처리
            logger.error(f"API 요청 타임아웃: {str(e)}")
            return (
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
                {"display": "none"},
                {
                    **app_state,
                    "alert": {
                        "message": f"API 서버 응답이 지연되고 있습니다({settings.API_TIMEOUT}초). 잠시 후 다시 시도해주세요.",
                        "color": "warning",
                    },
                },
            )

        except Exception as e:
            # 기타 오류 처리
            logger.error(f"시간별 주문 데이터 처리 중 오류 발생: {str(e)}")
            return (
                no_update,
                no_update,
                no_update,
                no_update,
                no_update,
                {"display": "none"},
                {
                    **app_state,
                    "alert": {
                        "message": f"데이터 처리 중 오류가 발생했습니다: {str(e)}",
                        "color": "danger",
                    },
                },
            )