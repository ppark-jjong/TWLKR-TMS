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
from datetime import datetime, timedelta

from main.dash.api.api_client import ApiClient
from main.dash.utils.auth_helper import is_token_valid
from main.dash.utils.format_helper import create_color_scale
from main.dash.utils.callback_helpers import handle_network_error, create_error_response, create_alert_data
from main.server.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

def register_callbacks(app: Dash):
    """시각화 관련 콜백 등록"""

    # 페이지 로드 시 기본 날짜 설정 및 데이터 자동 조회
    @app.callback(
        [
            Output("viz-date-picker-range", "start_date"),
            Output("viz-date-picker-range", "end_date"),
            Output("viz-refresh-trigger", "data"),
        ],
        [Input("url", "pathname")],
        [State("auth-store", "data")],
        prevent_initial_call=True,
    )
    def set_default_viz_date_and_load_data(pathname, auth_data):
        """시각화 페이지 로드 시 기본 날짜 설정 및 데이터 자동 조회"""
        # 시각화 페이지로 이동한 경우에만 실행
        if pathname != "/visualization":
            raise PreventUpdate
            
        # 인증 확인
        if not is_token_valid(auth_data):
            raise PreventUpdate
            
        # 기본 날짜 설정 (최근 7일)
        today = datetime.now().date()
        start_date = (today - timedelta(days=7)).isoformat()
        end_date = today.isoformat()
        
        # 데이터 로드 트리거
        trigger_value = {"timestamp": datetime.now().timestamp()}
        
        logger.info(f"시각화 페이지 로드: 기본 날짜({start_date} ~ {end_date})로 데이터 자동 조회 설정")
        
        return start_date, end_date, trigger_value

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
            # 배송 상태 차트 출력
            Output("delivery-status-pie-chart", "figure"),
            Output("department-status-bar-chart", "figure"),
            Output("total-delivery-count", "children"),
            Output("waiting-delivery-count", "children"),
            Output("completed-delivery-count", "children"),
            
            # 시간별 주문 차트 출력
            Output("hourly-orders-line-chart", "figure"),
            Output("department-hourly-heatmap", "figure"),
            Output("total-orders-count", "children"),
            Output("avg-orders-count", "children"),
            Output("peak-hour", "children"),
            
            # 공통 출력
            Output("viz-loading-spinner", "style"),
            Output("app-state-store", "data"),
        ],
        [
            Input("viz-refresh-button", "n_clicks"),  # 명시적 버튼 클릭
            Input("viz-refresh-trigger", "data"),     # 자동 조회 트리거
            Input("viz-date-picker-range", "start_date"),  # 날짜 변경 시 자동 조회
            Input("viz-date-picker-range", "end_date"),    # 날짜 변경 시 자동 조회
        ],
        [
            State("chart-type-selector", "value"),
            State("auth-store", "data"),
            State("app-state-store", "data")
        ],
        prevent_initial_call=True,
    )
    def update_visualization_charts(
        refresh_clicks, refresh_trigger, start_date, end_date, chart_type, auth_data, app_state
    ):
        """통합된 시각화 차트 업데이트 함수 - 자동 조회 포함"""
        ctx = callback_context
        if not ctx.triggered:
            raise PreventUpdate

        # 로딩 표시
        loading_style = {"display": "block"}

        # 인증 확인
        if not is_token_valid(auth_data):
            return (
                no_update, no_update, no_update, no_update, no_update,  # 배송 상태 차트
                no_update, no_update, no_update, no_update, no_update,  # 시간별 주문 차트
                {"display": "none"},  # 로딩 스피너
                {
                    **app_state,
                    "alert": {
                        "message": "로그인이 필요합니다",
                        "color": "warning",
                    },
                },  # 앱 상태
            )

        # 날짜 확인
        if not start_date or not end_date:
            return (
                no_update, no_update, no_update, no_update, no_update,  # 배송 상태 차트
                no_update, no_update, no_update, no_update, no_update,  # 시간별 주문 차트
                {"display": "none"},  # 로딩 스피너
                {
                    **app_state,
                    "alert": {
                        "message": "조회 기간을 선택해주세요",
                        "color": "warning",
                    },
                },  # 앱 상태
            )

        # 액세스 토큰
        access_token = auth_data.get("access_token", "")

        # 배송 상태 차트를 위한 기본값
        delivery_status_pie_chart = no_update
        department_status_bar_chart = no_update
        total_delivery_count = no_update
        waiting_delivery_count = no_update
        completed_delivery_count = no_update

        # 시간별 주문 차트를 위한 기본값
        hourly_orders_line_chart = no_update
        department_hourly_heatmap = no_update
        total_orders_count = no_update
        avg_orders_count = no_update
        peak_hour = no_update

        try:
            # 차트 타입에 따라 다른 API 호출
            if chart_type == "delivery_status":
                # 배송 현황 차트 데이터 로드
                response = ApiClient.get_delivery_status(start_date, end_date, access_token)
                
                if response.get("success", False):
                    # 데이터 추출
                    data = response.get("data", {})
                    
                    # 총 건수
                    total_count = data.get("total_count", 0)
                    total_delivery_count = f"{total_count:,}건"
                    
                    # 부서별 데이터
                    department_data = data.get("department_breakdown", {})
                    
                    # 상태별 카운트 초기화
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
                            department_status_data.append({
                                "department": dept,
                                "status": status,
                                "count": count,
                                "percentage": percentage,
                            })
                    
                    # 파이 차트 데이터 준비
                    status_labels = {
                        "WAITING": "대기",
                        "IN_PROGRESS": "진행 중",
                        "COMPLETE": "완료",
                        "ISSUE": "이슈",
                        "CANCEL": "취소",
                    }
                    
                    status_colors = {
                        "WAITING": "#FFC107",  # 노란색
                        "IN_PROGRESS": "#2196F3",  # 파란색
                        "COMPLETE": "#4CAF50",  # 녹색
                        "ISSUE": "#F44336",  # 빨간색
                        "CANCEL": "#9E9E9E",  # 회색
                    }
                    
                    # 파이 차트 준비
                    pie_values = []
                    pie_labels = []
                    pie_colors = []
                    pie_text = []
                    
                    for status, count in status_counts.items():
                        if count > 0:
                            pie_values.append(count)
                            pie_labels.append(status_labels.get(status, status))
                            pie_colors.append(status_colors.get(status, "#ccc"))
                            pie_text.append(f"{count:,}건")
                    
                    # 파이 차트 생성 - 개선된 시각화
                    delivery_status_pie_chart = go.Figure(
                        data=[
                            go.Pie(
                                values=pie_values,
                                labels=pie_labels,
                                marker=dict(colors=pie_colors),
                                textinfo="label+percent",
                                hoverinfo="label+value+percent",
                                hovertemplate="<b>%{label}</b><br>%{value:,}건<br>(%{percent})<extra></extra>",
                                textfont=dict(size=14),
                                insidetextorientation='radial',
                                pull=[0.03] * len(pie_values),  # 조각을 약간 분리하여 가시성 향상
                            )
                        ]
                    )
                    
                    # 차트 레이아웃 설정
                    delivery_status_pie_chart.update_layout(
                        title=dict(
                            text="배송 상태별 현황",
                            font=dict(size=18)
                        ),
                        margin=dict(l=20, r=20, t=50, b=20),
                        height=400,
                        legend=dict(
                            orientation="h",
                            yanchor="bottom",
                            y=-0.2,
                            xanchor="center",
                            x=0.5,
                            font=dict(size=12)
                        ),
                    )
                    
                    # 부서별 상태 막대 차트 준비
                    dept_df = pd.DataFrame(department_status_data)
                    
                    if not dept_df.empty:
                        # 데이터프레임 처리
                        # 상태를 범주형으로 변환하고 원하는 순서로 정렬
                        status_order = ["WAITING", "IN_PROGRESS", "COMPLETE", "ISSUE", "CANCEL"]
                        dept_df["status"] = pd.Categorical(
                            dept_df["status"], categories=status_order, ordered=True
                        )
                        
                        # 상태별 색상 매핑
                        dept_df["color"] = dept_df["status"].map(status_colors)
                        
                        # 상태 라벨 매핑
                        dept_df["status_label"] = dept_df["status"].map(status_labels)
                        
                        # 부서별 막대 차트 생성 - 개선된 시각화
                        department_status_bar_chart = go.Figure()
                        
                        for status, color in status_colors.items():
                            if status in dept_df["status"].values:
                                filtered_df = dept_df[dept_df["status"] == status]
                                department_status_bar_chart.add_trace(
                                    go.Bar(
                                        x=filtered_df["department"],
                                        y=filtered_df["count"],
                                        name=status_labels.get(status, status),
                                        marker_color=color,
                                        hovertemplate="<b>%{x}</b><br>%{y:,}건<extra></extra>",
                                        text=filtered_df["count"].apply(lambda x: f"{x:,}건"),
                                        textposition="auto",
                                    )
                                )
                        
                        # 차트 레이아웃 설정
                        department_status_bar_chart.update_layout(
                            title=dict(
                                text="부서별 배송 상태",
                                font=dict(size=18)
                            ),
                            legend=dict(
                                orientation="h",
                                yanchor="bottom",
                                y=1.02,
                                xanchor="center",
                                x=0.5,
                                font=dict(size=12)
                            ),
                            barmode="stack",
                            height=400,
                            margin=dict(l=20, r=20, t=50, b=20),
                            xaxis=dict(
                                title=dict(
                                    text="부서",
                                    font=dict(size=14)
                                ),
                                tickfont=dict(size=12)
                            ),
                            yaxis=dict(
                                title=dict(
                                    text="건수",
                                    font=dict(size=14)
                                ),
                                tickfont=dict(size=12)
                            ),
                        )
                    
                    # 대기 중인 건 수
                    waiting_count = status_counts.get("WAITING", 0)
                    waiting_delivery_count = f"{waiting_count:,}건"
                    
                    # 완료된 건 수
                    complete_count = status_counts.get("COMPLETE", 0)
                    completed_delivery_count = f"{complete_count:,}건"
                    
                else:
                    # API 오류 시 알림 설정 및 로딩 숨김
                    loading_style = {"display": "none"}
                    app_state = {
                        **app_state,
                        "alert": {
                            "message": response.get("message", "데이터 로드에 실패했습니다."),
                            "color": "danger",
                        },
                    }

            elif chart_type == "hourly_orders":
                # 시간별 주문 차트 데이터 로드
                response = ApiClient.get_hourly_orders(start_date, end_date, access_token)
                
                if response.get("success", False):
                    # 데이터 추출
                    data = response.get("data", {})
                    
                    # 시간대별 접수량 차트 개선
                    hourly_data = data.get("hourly_data", {})
                    hourly_counts = hourly_data.get("hourly_counts", [])
                    
                    # 차트에 맞는 형식으로 변환
                    hours = []
                    counts = []
                    for item in hourly_counts:
                        hour = item.get("hour", 0)
                        count = item.get("count", 0)
                        hours.append(hour)
                        counts.append(count)
                    
                    # 시간대별 접수량 차트 개선 - 더 명확한 시각화
                    hourly_orders_line_chart = go.Figure()
                    
                    # 영역 차트 추가 (라인 아래 부분)
                    hourly_orders_line_chart.add_trace(
                        go.Scatter(
                            x=hours,
                            y=counts,
                            mode="none",
                            fill="tozeroy",
                            fillcolor="rgba(63, 81, 181, 0.2)",
                            name="시간대별 접수량",
                            hoverinfo="skip",
                        )
                    )
                    
                    # 시간대별 라인 차트 데이터
                    hourly_orders_line_chart.add_trace(
                        go.Scatter(
                            x=hours,
                            y=counts,
                            mode="lines+markers+text",
                            name="시간대별 접수량",
                            line=dict(width=3, color="#3f51b5"),  # 두꺼운 선과 선명한 색상
                            marker=dict(size=8, color="#3f51b5", line=dict(width=2, color="white")),
                            hovertemplate="<b>%{x}시</b><br>%{y:,}건<extra></extra>",
                            text=[f"{c:,}" if i % 3 == 0 and c > 0 else "" for i, c in enumerate(counts)],
                            textposition="top center",
                        )
                    )
                    
                    # 차트 레이아웃 설정
                    hourly_orders_line_chart.update_layout(
                        title=dict(
                            text="시간대별 접수량",
                            font=dict(size=18)
                        ),
                        xaxis=dict(
                            title=dict(
                                text="시간",
                                font=dict(size=14)
                            ),
                            tickmode="array",
                            tickvals=list(range(24)),
                            ticktext=[f"{h}시" for h in range(24)],
                            tickfont=dict(size=12)
                        ),
                        yaxis=dict(
                            title=dict(
                                text="접수량",
                                font=dict(size=14)
                            ),
                            tickfont=dict(size=12)
                        ),
                        height=400,
                        margin=dict(l=20, r=20, t=50, b=20),
                        showlegend=False,
                    )
                    
                    # 부서별 시간대 접수량 히트맵
                    dept_hours = hourly_data.get("department_hourly", {})
                    
                    # 히트맵 개선 - 더 선명한 시각화
                    # 색상 스케일을 더 선명하게 조정
                    colorscale = [
                        [0, "#f7fbff"],
                        [0.2, "#d0e1f2"],
                        [0.4, "#94c4df"],
                        [0.6, "#4a98c9"],
                        [0.8, "#1764ab"],
                        [1, "#08306b"],
                    ]
                    
                    department_hourly_heatmap = go.Figure()
                    
                    # 각 부서별 히트맵 데이터 생성
                    if dept_hours:
                        # 모든 부서의 데이터를 하나의 2D 배열로 구성
                        z_data = []
                        y_labels = []
                        
                        for dept, hours in dept_hours.items():
                            hour_counts = []
                            for hour in range(24):
                                hour_count = next((item["count"] for item in hours if item["hour"] == hour), 0)
                                hour_counts.append(hour_count)
                            
                            z_data.append(hour_counts)
                            y_labels.append(dept)
                        
                        department_hourly_heatmap.add_trace(
                            go.Heatmap(
                                z=z_data,
                                x=[f"{i}시" for i in range(24)],
                                y=y_labels,
                                colorscale=colorscale,
                                hovertemplate="<b>%{y}</b><br>%{x}: <b>%{z:,}건</b><extra></extra>",
                                colorbar=dict(
                                    title=dict(text="접수량", font=dict(size=14)),
                                    tickfont=dict(size=12),
                                ),
                                showscale=True,
                            )
                        )
                        
                        # 히트맵 레이아웃 설정
                        department_hourly_heatmap.update_layout(
                            title=dict(
                                text="부서별 시간대 접수량",
                                font=dict(size=18)
                            ),
                            height=400,
                            margin=dict(l=20, r=20, t=50, b=20),
                            xaxis=dict(
                                title=dict(
                                    text="시간",
                                    font=dict(size=14)
                                ),
                                tickfont=dict(size=12)
                            ),
                            yaxis=dict(
                                title=dict(
                                    text="부서",
                                    font=dict(size=14)
                                ),
                                tickfont=dict(size=12)
                            ),
                        )
                    
                    # 요약 정보
                    summary = data.get("summary", {})
                    
                    # 총 주문 건수
                    total_count = summary.get("total_count", 0)
                    total_orders_count = f"{total_count:,}건"
                    
                    # 시간당 평균 건수
                    avg_count = summary.get("average_per_hour", 0)
                    avg_orders_count = f"{avg_count:.1f}건"
                    
                    # 피크 시간대
                    peak_hour_data = summary.get("peak_hour", {})
                    peak_hour_val = peak_hour_data.get("hour", "-")
                    peak_hour_count = peak_hour_data.get("count", 0)
                    peak_hour = f"{peak_hour_val}시 ({peak_hour_count:,}건)"
                    
                else:
                    # API 오류 시 알림 설정 및 로딩 숨김
                    loading_style = {"display": "none"}
                    app_state = {
                        **app_state,
                        "alert": {
                            "message": response.get("message", "데이터 로드에 실패했습니다."),
                            "color": "danger",
                        },
                    }
            
            # 로딩 숨김
            loading_style = {"display": "none"}
            
            return (
                delivery_status_pie_chart, department_status_bar_chart, total_delivery_count, 
                waiting_delivery_count, completed_delivery_count,
                hourly_orders_line_chart, department_hourly_heatmap, total_orders_count, 
                avg_orders_count, peak_hour,
                loading_style, app_state,
            )
            
        except Exception as e:
            # 예외 처리
            logger.error(f"시각화 데이터 로드 오류: {str(e)}", exc_info=True)
            
            return (
                no_update, no_update, no_update, no_update, no_update,  # 배송 상태 차트
                no_update, no_update, no_update, no_update, no_update,  # 시간별 주문 차트
                {"display": "none"},  # 로딩 스피너
                {
                    **app_state,
                    "alert": {
                        "message": "데이터 처리 중 오류가 발생했습니다.",
                        "color": "danger",
                    },
                },  # 앱 상태
            )