# teckwah_project/main/dash/callbacks/download_callbacks.py
from dash import Dash, Output, Input, State, callback_context, no_update, dcc
from dash.exceptions import PreventUpdate
import dash_bootstrap_components as dbc
import logging
import io
from typing import Dict, Any, List, Optional
from datetime import datetime

from api.api_client import ApiClient
from utils.auth_helper import is_token_valid, is_admin_user

logger = logging.getLogger(__name__)

def register_callbacks(app: Dash):
    """다운로드 관련 콜백 등록"""
    
    @app.callback(
        [
            Output("admin-check-container", "children")
        ],
        [
            Input("url", "pathname")
        ],
        [
            State("user-info-store", "data")
        ],
        prevent_initial_call=True
    )
    def check_admin_access(pathname, user_info):
        """관리자 권한 확인"""
        if pathname != "/download":
            raise PreventUpdate
        
        # 관리자 여부 확인
        is_admin = is_admin_user(user_info)
        
        if not is_admin:
            return [dbc.Alert(
                [
                    html.I(className="fas fa-exclamation-triangle me-2"),
                    "관리자 권한이 필요합니다. 일반 사용자는 이 기능을 사용할 수 없습니다."
                ],
                color="danger",
                className="my-3"
            )]
        
        return [html.Div()]
    
    @app.callback(
        [
            Output("download-date-range-info", "children")
        ],
        [
            Input("url", "pathname")
        ],
        [
            State("auth-store", "data")
        ],
        prevent_initial_call=True
    )
    def load_download_date_range(pathname, auth_data):
        """다운로드 가능 날짜 범위 로드"""
        if pathname != "/download":
            raise PreventUpdate
        
        if not is_token_valid(auth_data):
            raise PreventUpdate
        
        # 액세스 토큰
        access_token = auth_data.get("access_token", "")
        
        try:
            # API 호출로 날짜 범위 조회
            response = ApiClient.get_download_date_range(access_token)
            
            if not response.get("success", False):
                return ["날짜 범위 정보를 불러올 수 없습니다."]
            
            # 날짜 범위 추출
            date_range = response.get("date_range", {})
            oldest_date = date_range.get("oldest_date", "")
            latest_date = date_range.get("latest_date", "")
            
            if oldest_date and latest_date:
                return [f"다운로드 가능 기간: {oldest_date} ~ {latest_date}"]
            else:
                return ["다운로드 가능 기간 정보가 없습니다."]
            
        except Exception as e:
            logger.error(f"다운로드 날짜 범위 조회 오류: {str(e)}")
            return ["날짜 범위 정보를 불러올 수 없습니다."]
    
    @app.callback(
        [
            Output("download-excel", "data"),
            Output("download-loading-spinner", "style"),
            Output("app-state-store", "data", allow_duplicate=True)
        ],
        [
            Input("download-excel-button", "n_clicks")
        ],
        [
            State("download-date-picker-range", "start_date"),
            State("download-date-picker-range", "end_date"),
            State("auth-store", "data"),
            State("app-state-store", "data")
        ],
        prevent_initial_call=True
    )
    def download_excel_file(n_clicks, start_date, end_date, auth_data, app_state):
        """Excel 파일 다운로드"""
        if not n_clicks:
            raise PreventUpdate
        
        if not is_token_valid(auth_data):
            return no_update, {"display": "none"}, {
                **app_state, 
                "alert": {
                    "message": "인증이 필요합니다.", 
                    "color": "danger"
                }
            }
        
        # 날짜 확인
        if not start_date or not end_date:
            return no_update, {"display": "none"}, {
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
            # API 호출로 Excel 다운로드
            file_content = ApiClient.download_excel(start_date, end_date, access_token)
            
            # 로딩 숨김
            loading_style = {"display": "none"}
            
            if not file_content:
                return no_update, loading_style, {
                    **app_state, 
                    "alert": {
                        "message": "다운로드에 실패했습니다.", 
                        "color": "danger"
                    }
                }
            
            # 파일명 생성
            start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
            
            file_name = f"대시보드_데이터_{start_date_obj.strftime('%Y%m%d')}_{end_date_obj.strftime('%Y%m%d')}.xlsx"
            
            # 다운로드 데이터 반환
            return dict(
                content=file_content,
                filename=file_name,
                type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                base64=False
            ), loading_style, {
                **app_state, 
                "alert": {
                    "message": "데이터 다운로드가 시작되었습니다.", 
                    "color": "success",
                    "duration": 2000
                }
            }
            
        except Exception as e:
            logger.error(f"Excel 다운로드 오류: {str(e)}")
            return no_update, {"display": "none"}, {
                **app_state, 
                "alert": {
                    "message": "다운로드 중 오류가 발생했습니다.", 
                    "color": "danger"
                }
            }