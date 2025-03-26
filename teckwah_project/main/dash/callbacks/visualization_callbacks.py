# teckwah_project/main/dash/callbacks/visualization_callbacks.py
from dash import Dash, Output, Input, State, callback_context, no_update
from dash.exceptions import PreventUpdate
import plotly.graph_objects as go
import plotly.express as px
import logging
import json
import pandas as pd
from typing import Dict, Any, List, Optional

from main.dash.api.api_client import ApiClient
from main.dash.utils.auth_helper import is_token_valid
from main.dash.utils.format_helper import create_color_scale

logger = logging.getLogger(__name__)

def register_callbacks(app: Dash):
    """시각화 관련 콜백 등록"""
    
    @app.callback(
        [
            Output("delivery-status-container", "className"),
            Output("hourly-orders-container", "className"),
            Output("viz-loading-spinner", "style")
        ],
        [
            Input("chart-type-selector", "value")
        ],
        prevent_initial_call=True
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
            Output("delivery-status-pie-chart", "figure"),
            Output("department-status-bar-chart", "figure"),
            Output("total-delivery-count", "children"),
            Output("waiting-delivery-count", "children"),
            Output("completed-delivery-count", "children"),
            Output("viz-loading-spinner", "style", allow_duplicate=True),
            Output("app-state-store", "data", allow_duplicate=True)
        ],
        [
            Input("viz-date-picker-range", "start_date"),
            Input("viz-date-picker-range", "end_date"),
            Input("viz-refresh-button", "n_clicks"),
            Input("chart-type-selector", "value")
        ],
        [
            State("auth-store", "data"),
            State("app-state-store", "data")
        ],
        prevent_initial_call=True
    )
    def update_delivery_status_charts(start_date, end_date, refresh_clicks, chart_type,
                                      auth_data, app_state):
        """배송 현황 차트 업데이트"""
        ctx = callback_context
        if not ctx.triggered:
            raise PreventUpdate
        
        # 차트 타입이 배송 현황이 아닌 경우 무시
        if chart_type != "delivery_status":
            return no_update, no_update, no_update, no_update, no_update, no_update, no_update
        
        # 인증 확인
        if not is_token_valid(auth_data):
            return no_update, no_update, no_update, no_update, no_update, no_update, no_update
        
        # 날짜 확인
        if not start_date or not end_date:
            return no_update, no_update, no_update, no_update, no_update, {"display": "none"}, {
                **app_state, 
                "alert": {
                    "message": "조회 기간을 선택해주세요.", 
                    "color": "warning"
                }
            }
        
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
                return no_update, no_update, no_update, no_update, no_update, loading_style, {
                    **app_state, 
                    "alert": {
                        "message": response.get("message", "데이터 로드에 실패했습니다."), 
                        "color": "danger"
                    }
                }
            
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
                "CANCEL": 0
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
                        "percentage": percentage
                    })
            
            # 파이 차트 데이터 준비
            status_labels = {
                "WAITING": "대기",
                "IN_PROGRESS": "진행 중",
                "COMPLETE": "완료",
                "ISSUE": "이슈",
                "CANCEL": "취소"
            }
            
            status_colors = {
                "WAITING": "#ffebee",
                "IN_PROGRESS": "#fff8e1",
                "COMPLETE": "#e8f5e9",
                "ISSUE": "#ede7f6",
                "CANCEL": "#eceff1"
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
            
            pie_fig = go.Figure(data=[go.Pie(
                labels=pie_labels,
                values=pie_data,
                hole=0.3,
                marker_colors=pie_colors,
                textinfo="value+percent",
                textposition="inside",
                insidetextorientation="radial"
            )])
            
            pie_fig.update_layout(
                margin=dict(l=20, r=20, t=30, b=20),
                showlegend=True,
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="center", x=0.5)
            )
            
            # 부서별 바 차트 생성
            if department_status_data:
                df = pd.DataFrame(department_status_data)
                
                # 상태 순서 설정
                status_order = ["WAITING", "IN_PROGRESS", "COMPLETE", "ISSUE", "CANCEL"]
                df["status"] = pd.Categorical(df["status"], categories=status_order, ordered=True)
                df = df.sort_values(["department", "status"])
                
                # 각 상태를 한글로 변환
                df["status_label"] = df["status"].map(status_labels)
                
                bar_fig = px.bar(
                    df,
                    x="department",
                    y="count",
                    color="status_label",
                    color_discrete_map={status_labels[s]: status_colors[s] for s in status_order},
                    barmode="stack",
                    text="count",
                    labels={"department": "부서", "count": "건수", "status_label": "상태"}
                )
                
                bar_fig.update_layout(
                    margin=dict(l=20, r=20, t=30, b=20),
                    legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="center", x=0.5)
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
                    font=dict(size=20)
                )
            
            # 통계 카드 데이터
            total = f"{total_count:,}"
            waiting = f"{status_counts.get('WAITING', 0):,}"
            completed = f"{status_counts.get('COMPLETE', 0):,}"
            
            return pie_fig, bar_fig, total, waiting, completed, loading_style, app_state
            
        except Exception as e:
            logger.error(f"배송 현황 데이터 로드 오류: {str(e)}")
            return no_update, no_update, no_update, no_update, no_update, {"display": "none"}, {
                **app_state, 
                "alert": {
                    "message": "데이터 처리 중 오류가 발생했습니다.", 
                    "color": "danger"
                }
            }
    
    @app.callback(
        [
            Output("hourly-orders-line-chart", "figure"),
            Output("department-hourly-heatmap", "figure"),
            Output("total-orders-count", "children"),
            Output("avg-orders-count", "children"),
            Output("peak-hour", "children"),
            Output("viz-loading-spinner", "style", allow_duplicate=True),
            Output("app-state-store", "data", allow_duplicate=True)
        ],
        [
            Input("viz-date-picker-range", "start_date"),
            Input("viz-date-picker-range", "end_date"),
            Input("viz-refresh-button", "n_clicks"),
            Input("chart-type-selector", "value")
        ],
        [
            State("auth-store", "data"),
            State("app-state-store", "data")
        ],
        prevent_initial_call=True
    )
    def update_hourly_orders_charts(start_date, end_date, refresh_clicks, chart_type,
                                   auth_data, app_state):
        """시간대별 접수량 차트 업데이트"""
        ctx = callback_context
        if not ctx.triggered:
            raise PreventUpdate
        
        # 차트 타입이 시간대별 접수량이 아닌 경우 무시
        if chart_type != "hourly_orders":
            return no_update, no_update, no_update, no_update, no_update, no_update, no_update
        
        # 인증 확인
        if not is_token_valid(auth_data):
            return no_update, no_update, no_update, no_update, no_update, no_update, no_update
        
        # 날짜 확인
        if not start_date or not end_date:
            return no_update, no_update, no_update, no_update, no_update, {"display": "none"}, {
                **app_state, 
                "alert": {
                    "message": "조회 기간을 선택해주세요.", 
                    "color": "warning"
                }
            }
        
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
                return no_update, no_update, no_update, no_update, no_update, loading_style, {
                    **app_state, 
                    "alert": {
                        "message": response.get("message", "데이터 로드에 실패했습니다."), 
                        "color": "danger"
                    }
                }
            
            # 데이터 추출
            data = response.get("data", {})
            
            # 총 건수 및 평균
            total_count = data.get("total_count", 0)
            average_count = data.get("average_count", 0)
            
            # 부서별 데이터
            department_data = data.get("department_breakdown", {})
            
            # 시간대 정보
            time_slots = data.get("time_slots", [])
            
            # 일수
            days = data.get("days", 1)
            
            # 전체 시간대별 집계
            hourly_total = {}
            for slot in time_slots:
                slot_label = slot.get("label", "")
                hourly_total[slot_label] = 0
            
            # 부서별 시간대 데이터 구성
            dept_hourly_data = []
            
            # 피크 시간대 계산
            peak_hour = ""
            peak_count = 0
            
            for dept, dept_data in department_data.items():
                hourly_counts = dept_data.get("hourly_counts", {})
                
                for slot_label, count in hourly_counts.items():
                    dept_hourly_data.append({
                        "department": dept,
                        "time_slot": slot_label,
                        "count": count,
                        "average": count / days  # 일평균
                    })
                    
                    # 전체 집계에 추가
                    hourly_total[slot_label] = hourly_total.get(slot_label, 0) + count
                    
                    # 피크 시간대 업데이트
                    if count > peak_count:
                        peak_count = count
                        peak_hour = slot_label
            
            # 시간대별 접수량 라인 차트
            line_data = [{"time_slot": slot, "count": count} for slot, count in hourly_total.items()]
            if line_data:
                df_line = pd.DataFrame(line_data)
                
                # 시간대 순서 정렬
                hour_order = [slot.get("label", "") for slot in sorted(
                    time_slots, 
                    key=lambda x: x.get("start", 0) if x.get("label", "") != "야간(19-09)" else 24
                )]
                
                df_line["time_slot"] = pd.Categorical(df_line["time_slot"], categories=hour_order, ordered=True)
                df_line = df_line.sort_values("time_slot")
                
                line_fig = px.line(
                    df_line,
                    x="time_slot",
                    y="count",
                    markers=True,
                    labels={"time_slot": "시간대", "count": "접수 건수"}
                )
                
                line_fig.update_traces(
                    line=dict(width=3, color="#2962ff"),
                    marker=dict(size=8, color="#2962ff")
                )
                
                line_fig.update_layout(
                    margin=dict(l=20, r=20, t=30, b=20),
                    hovermode="x",
                    xaxis=dict(title="시간대"),
                    yaxis=dict(title="접수 건수")
                )
                
                # 각 점에 값 표시
                line_fig.update_traces(
                    texttemplate="%{y}",
                    textposition="top center"
                )
            else:
                # 데이터 없음 표시
                line_fig = go.Figure()
                line_fig.add_annotation(
                    text="데이터가 없습니다",
                    xref="paper",
                    yref="paper",
                    x=0.5,
                    y=0.5,
                    showarrow=False,
                    font=dict(size=20)
                )
            
            # 부서별 시간대 히트맵
            if dept_hourly_data:
                df_heatmap = pd.DataFrame(dept_hourly_data)
                
                # 시간대 순서 정렬
                df_heatmap["time_slot"] = pd.Categorical(df_heatmap["time_slot"], categories=hour_order, ordered=True)
                
                # 피벗 테이블로 변환
                pivot_df = df_heatmap.pivot_table(
                    values="average",
                    index="department",
                    columns="time_slot",
                    aggfunc="mean",
                    fill_value=0
                )
                
                # 부서 및 시간대 목록
                departments = pivot_df.index.tolist()
                time_slot_labels = pivot_df.columns.tolist()
                
                # 2D 데이터 배열 생성
                z_data = pivot_df.values.tolist()
                
                # 히트맵 생성
                heatmap_fig = go.Figure(data=go.Heatmap(
                    z=z_data,
                    x=time_slot_labels,
                    y=departments,
                    colorscale="Blues",
                    hoverongaps=False,
                    text=[[f"{val:.1f}" for val in row] for row in z_data],
                    texttemplate="%{text}",
                    showscale=True,
                    colorbar=dict(
                        title="일평균",
                        titleside="top",
                        tickfont=dict(size=10)
                    )
                ))
                
                heatmap_fig.update_layout(
                    margin=dict(l=20, r=20, t=30, b=20),
                    xaxis=dict(title="시간대"),
                    yaxis=dict(title="부서")
                )
            else:
                # 데이터 없음 표시
                heatmap_fig = go.Figure()
                heatmap_fig.add_annotation(
                    text="데이터가 없습니다",
                    xref="paper",
                    yref="paper",
                    x=0.5,
                    y=0.5,
                    showarrow=False,
                    font=dict(size=20)
                )
            
            # 통계 카드 데이터
            total = f"{total_count:,}"
            avg = f"{average_count:.1f}"
            peak = peak_hour
            
            return line_fig, heatmap_fig, total, avg, peak, loading_style, app_state
            
        except Exception as e:
            logger.error(f"시간대별 접수량 데이터 로드 오류: {str(e)}")
            return no_update, no_update, no_update, no_update, no_update, {"display": "none"}, {
                **app_state, 
                "alert": {
                    "message": "데이터 처리 중 오류가 발생했습니다.", 
                    "color": "danger"
                }
            }