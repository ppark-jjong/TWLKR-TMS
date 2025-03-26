# teckwah_project/main/dash/callbacks/dashboard_callbacks.py
from dash import Dash, Output, Input, State, callback_context, no_update
from dash.exceptions import PreventUpdate
import dash_bootstrap_components as dbc
import logging
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from main.dash.api.api_client import ApiClient
from main.dash.utils.auth_helper import is_token_valid, is_admin_user, get_user_id
from main.dash.utils.format_helper import prepare_table_data, filter_table_data, format_status, format_type, format_warehouse
from main.dash.components.modals import create_detail_modal, create_assign_modal, create_delete_confirm_modal

logger = logging.getLogger(__name__)

def register_callbacks(app: Dash):
    """대시보드 관련 콜백 등록"""
    
    @app.callback(
        [
            Output("dashboard-table", "data"),
            Output("table-loading-container", "className"),
            Output("empty-data-container", "className"),
            Output("app-state-store", "data", allow_duplicate=True)
        ],
        [
            Input("date-picker-range", "start_date"),
            Input("date-picker-range", "end_date"),
            Input("refresh-button", "n_clicks"),
            Input("apply-filter-button", "n_clicks")
        ],
        [
            State("auth-store", "data"),
            State("dashboard-table", "data"),
            State("type-filter", "value"),
            State("department-filter", "value"),
            State("warehouse-filter", "value"),
            State("app-state-store", "data")
        ],
        prevent_initial_call=True
    )
    def load_dashboard_data(start_date, end_date, refresh_clicks, filter_clicks, 
                             auth_data, current_data, type_filter, dept_filter, 
                             warehouse_filter, app_state):
        """대시보드 데이터 로드 및 필터링"""
        ctx = callback_context
        if not ctx.triggered:
            raise PreventUpdate
        
        # 인증 확인
        if not is_token_valid(auth_data):
            return no_update, no_update, no_update, no_update
        
        # 액세스 토큰
        access_token = auth_data.get("access_token", "")
        
        # 날짜 확인
        if not start_date or not end_date:
            return no_update, "d-none", "d-block", {
                **app_state, 
                "alert": {
                    "message": "조회 기간을 선택해주세요.", 
                    "color": "warning"
                }
            }
        
        # 이벤트 확인
        trigger_id = ctx.triggered[0]["prop_id"].split(".")[0]
        
        # 로딩 상태 표시
        table_loading_class = "d-block"
        empty_data_class = "d-none"
        
        try:
            # API 호출로 데이터 로드
            response = ApiClient.get_dashboard_list(start_date, end_date, access_token)
            
            if not response.get("success", False):
                # API 오류
                return current_data or [], "d-none", "d-block", {
                    **app_state, 
                    "alert": {
                        "message": response.get("message", "데이터 로드에 실패했습니다."), 
                        "color": "danger"
                    }
                }
            
            # 데이터 추출
            data = response.get("data", {})
            items = data.get("items", [])
            
            # 데이터 없음
            if not items:
                return [], "d-none", "d-block", app_state
            
            # 테이블 표시용 데이터 변환
            formatted_data = prepare_table_data(items)
            
            # 필터 적용 (필터 버튼 클릭 시)
            if trigger_id == "apply-filter-button":
                filters = {
                    "type": type_filter,
                    "department": dept_filter,
                    "warehouse": warehouse_filter
                }
                
                # 앱 상태에 필터 정보 저장
                updated_app_state = {**app_state, "filters": filters}
                
                # 필터링
                filtered_data = filter_table_data(formatted_data, filters)
                
                return filtered_data, "d-none", "d-none" if filtered_data else "d-block", updated_app_state
            
            # 앱 상태에 필터 초기화
            updated_app_state = {**app_state, "filters": {"type": "ALL", "department": "ALL", "warehouse": "ALL"}}
            
            return formatted_data, "d-none", "d-none", updated_app_state
            
        except Exception as e:
            logger.error(f"대시보드 데이터 로드 오류: {str(e)}")
            return current_data or [], "d-none", "d-block", {
                **app_state, 
                "alert": {
                    "message": "데이터 로드 중 오류가 발생했습니다.", 
                    "color": "danger"
                }
            }
    
    @app.callback(
        [
            Output("dashboard-table", "selected_rows"),
            Output("assign-button", "disabled"),
            Output("delete-button", "disabled")
        ],
        [
            Input("dashboard-table", "selected_rows"),
            Input("dashboard-table", "data")
        ],
        [
            State("user-info-store", "data")
        ],
        prevent_initial_call=True
    )
    def update_selection_buttons(selected_rows, table_data, user_info):
        """선택 행에 따른 버튼 활성화 상태 업데이트"""
        # 선택 없음 => 버튼 비활성화
        if not selected_rows or not table_data:
            return selected_rows, True, True
        
        # 데이터 확인
        selected_data = [table_data[i] for i in selected_rows if i < len(table_data)]
        
        # 배차 버튼 활성화 조건: 모든 선택된 행이 WAITING 상태
        waiting_only = all(row.get("status") == "대기" for row in selected_data)
        assign_disabled = not waiting_only or not selected_data
        
        # 삭제 버튼 활성화 조건: 관리자만 + 행 선택됨
        is_admin = is_admin_user(user_info)
        delete_disabled = not is_admin or not selected_data
        
        return selected_rows, assign_disabled, delete_disabled
    
    @app.callback(
        [
            Output("dashboard-table", "data", allow_duplicate=True)
        ],
        [
            Input("order-search-button", "n_clicks")
        ],
        [
            State("order-search-input", "value"),
            State("auth-store", "data"),
            State("app-state-store", "data")
        ],
        prevent_initial_call=True
    )
    def search_by_order_no(n_clicks, order_no, auth_data, app_state):
        """주문번호로 검색"""
        if not n_clicks or not order_no:
            raise PreventUpdate
        
        if not is_token_valid(auth_data):
            raise PreventUpdate
        
        # 액세스 토큰
        access_token = auth_data.get("access_token", "")
        
        try:
            # API 호출로 검색
            response = ApiClient.search_by_order_no(order_no, access_token)
            
            if not response.get("success", False):
                return no_update
            
            # 데이터 추출
            data = response.get("data", {})
            items = data.get("items", [])
            
            # 테이블 표시용 데이터 변환
            formatted_data = prepare_table_data(items)
            
            if not formatted_data:
                app_state["alert"] = {
                    "message": "검색 결과가 없습니다.", 
                    "color": "warning"
                }
            
            return [formatted_data]
            
        except Exception as e:
            logger.error(f"주문번호 검색 오류: {str(e)}")
            return [no_update]
    
    @app.callback(
        [
            Output("detail-modal", "is_open"),
            Output("detail-modal", "children"),
            Output("app-state-store", "data", allow_duplicate=True)
        ],
        [
            Input("dashboard-table", "active_cell"),
            Input("close-detail-modal-button", "n_clicks")
        ],
        [
            State("dashboard-table", "data"),
            State("auth-store", "data"),
            State("app-state-store", "data")
        ],
        prevent_initial_call=True
    )
    def toggle_detail_modal(active_cell, close_clicks, table_data, auth_data, app_state):
        """상세 정보 모달 토글"""
        ctx = callback_context
        if not ctx.triggered:
            raise PreventUpdate
        
        trigger_id = ctx.triggered[0]["prop_id"].split(".")[0]
        
        # 닫기 버튼 클릭 => 모달 닫기
        if trigger_id == "close-detail-modal-button":
            updated_modals = {**app_state.get("modals", {}), "detail": {"is_open": False, "dashboard_id": None}}
            return False, no_update, {**app_state, "modals": updated_modals}
        
        # 테이블 행 클릭 => 모달 열기
        if trigger_id == "dashboard-table" and active_cell:
            row_idx = active_cell["row"]
            
            if not table_data or row_idx >= len(table_data):
                raise PreventUpdate
            
            row_data = table_data[row_idx]
            dashboard_id = row_data.get("dashboard_id")
            
            if not dashboard_id or not is_token_valid(auth_data):
                raise PreventUpdate
            
            # 상세 정보 API 호출
            access_token = auth_data.get("access_token", "")
            response = ApiClient.get_dashboard_detail(dashboard_id, access_token)
            
            if not response.get("success", False):
                return False, no_update, {
                    **app_state, 
                    "alert": {
                        "message": response.get("message", "상세 정보를 불러올 수 없습니다."), 
                        "color": "danger"
                    }
                }
            
            # 상세 데이터 및 락 정보 추출
            data = response.get("data", {})
            is_locked = response.get("is_locked", False)
            lock_info = response.get("lock_info")
            
            # 상세 모달 생성
            detail_modal = create_detail_modal(data, is_locked, lock_info)
            
            # 앱 상태 업데이트
            updated_modals = {**app_state.get("modals", {}), "detail": {"is_open": True, "dashboard_id": dashboard_id}}
            
            return True, detail_modal, {**app_state, "modals": updated_modals}
        
        return no_update, no_update, no_update
    
    @app.callback(
        [
            Output("app-state-store", "data", allow_duplicate=True)
        ],
        [
            Input("save-remark-button", "n_clicks")
        ],
        [
            State("remark-textarea", "value"),
            State("remark-id-input", "value"),
            State("dashboard-id-input", "value"),
            State("auth-store", "data"),
            State("app-state-store", "data")
        ],
        prevent_initial_call=True
    )
    def save_remark(n_clicks, remark_content, remark_id, dashboard_id, auth_data, app_state):
        """메모 저장"""
        if not n_clicks or not remark_id or not dashboard_id:
            raise PreventUpdate
        
        if not is_token_valid(auth_data):
            raise PreventUpdate
        
        # 액세스 토큰
        access_token = auth_data.get("access_token", "")
        
        try:
            # API 호출로 메모 업데이트
            response = ApiClient.update_remark(dashboard_id, remark_id, remark_content, access_token)
            
            if not response.get("success", False):
                return [{
                    **app_state, 
                    "alert": {
                        "message": response.get("message", "메모 저장에 실패했습니다."), 
                        "color": "danger"
                    }
                }]
            
            return [{
                **app_state, 
                "alert": {
                    "message": "메모가 저장되었습니다.", 
                    "color": "success"
                }
            }]
            
        except Exception as e:
            logger.error(f"메모 저장 오류: {str(e)}")
            return [{
                **app_state, 
                "alert": {
                    "message": "메모 저장 중 오류가 발생했습니다.", 
                    "color": "danger"
                }
            }]
    
    @app.callback(
        [
            Output("app-state-store", "data", allow_duplicate=True)
        ],
        [
            Input("status-waiting-button", "n_clicks"),
            Input("status-inprogress-button", "n_clicks"),
            Input("status-complete-button", "n_clicks"),
            Input("status-issue-button", "n_clicks"),
            Input("status-cancel-button", "n_clicks")
        ],
        [
            State("dashboard-id-input", "value"),
            State("auth-store", "data"),
            State("user-info-store", "data"),
            State("app-state-store", "data")
        ],
        prevent_initial_call=True
    )
    def update_status(waiting_clicks, inprogress_clicks, complete_clicks, issue_clicks, 
                      cancel_clicks, dashboard_id, auth_data, user_info, app_state):
        """상태 업데이트"""
        ctx = callback_context
        if not ctx.triggered:
            raise PreventUpdate
        
        if not dashboard_id or not is_token_valid(auth_data):
            raise PreventUpdate
        
        # 어떤 버튼이 클릭되었는지 확인
        trigger_id = ctx.triggered[0]["prop_id"].split(".")[0]
        
        # 상태 매핑
        status_map = {
            "status-waiting-button": "WAITING",
            "status-inprogress-button": "IN_PROGRESS",
            "status-complete-button": "COMPLETE",
            "status-issue-button": "ISSUE",
            "status-cancel-button": "CANCEL"
        }
        
        if trigger_id not in status_map:
            raise PreventUpdate
        
        new_status = status_map[trigger_id]
        
        # 관리자 여부
        is_admin = is_admin_user(user_info)
        
        # 액세스 토큰
        access_token = auth_data.get("access_token", "")
        
        try:
            # 락 획득 API 호출
            lock_response = ApiClient.acquire_lock(dashboard_id, "STATUS", access_token)
            
            if not lock_response.get("success", False):
                return [{
                    **app_state, 
                    "alert": {
                        "message": lock_response.get("message", "상태 변경 권한을 획득할 수 없습니다."), 
                        "color": "warning"
                    }
                }]
            
            # API 호출로 상태 업데이트
            response = ApiClient.update_dashboard_status(dashboard_id, new_status, is_admin, access_token)
            
            # 락 해제 (성공 여부와 무관하게)
            ApiClient.release_lock(dashboard_id, access_token)
            
            if not response.get("success", False):
                return [{
                    **app_state, 
                    "alert": {
                        "message": response.get("message", "상태 변경에 실패했습니다."), 
                        "color": "danger"
                    }
                }]
            
            # 상태 텍스트 맵핑
            status_text_map = {
                "WAITING": "대기",
                "IN_PROGRESS": "진행 중",
                "COMPLETE": "완료",
                "ISSUE": "이슈",
                "CANCEL": "취소"
            }
            
            return [{
                **app_state, 
                "alert": {
                    "message": f"{status_text_map.get(new_status, new_status)} 상태로 변경되었습니다.", 
                    "color": "success"
                }
            }]
            
        except Exception as e:
            logger.error(f"상태 변경 오류: {str(e)}")
            
            # 오류 발생 시에도 락 해제 시도
            try:
                ApiClient.release_lock(dashboard_id, access_token)
            except:
                pass
                
            return [{
                **app_state, 
                "alert": {
                    "message": "상태 변경 중 오류가 발생했습니다.", 
                    "color": "danger"
                }
            }]
    
    @app.callback(
        [
            Output("app-state-store", "data", allow_duplicate=True)
        ],
        [
            Input("save-fields-button", "n_clicks")
        ],
        [
            State("dashboard-id-input", "value"),
            State("eta-input", "value"),
            State("customer-input", "value"),
            State("contact-input", "value"),
            State("postal-code-input", "value"),
            State("address-input", "value"),
            State("auth-store", "data"),
            State("app-state-store", "data")
        ],
        prevent_initial_call=True
    )
    def save_fields(n_clicks, dashboard_id, eta, customer, contact, postal_code, 
                    address, auth_data, app_state):
        """필드 저장"""
        if not n_clicks or not dashboard_id:
            raise PreventUpdate
        
        if not is_token_valid(auth_data):
            raise PreventUpdate
        
        # 필드 유효성 검증
        if not customer:
            return [{
                **app_state, 
                "alert": {
                    "message": "고객명은 필수 항목입니다.", 
                    "color": "warning"
                }
            }]
        
        # 액세스 토큰
        access_token = auth_data.get("access_token", "")
        
        try:
            # 락 획득 API 호출
            lock_response = ApiClient.acquire_lock(dashboard_id, "EDIT", access_token)
            
            if not lock_response.get("success", False):
                return [{
                    **app_state, 
                    "alert": {
                        "message": lock_response.get("message", "필드 편집 권한을 획득할 수 없습니다."), 
                        "color": "warning"
                    }
                }]
            
            # 업데이트 필드 구성
            fields = {}
            
            if eta:
                fields["eta"] = eta
            
            if customer:
                fields["customer"] = customer
            
            if contact is not None:
                fields["contact"] = contact
            
            if postal_code:
                fields["postal_code"] = postal_code
            
            if address:
                fields["address"] = address
            
            # API 호출로 필드 업데이트
            response = ApiClient.update_dashboard_fields(dashboard_id, fields, access_token)
            
            # 락 해제 (성공 여부와 무관하게)
            ApiClient.release_lock(dashboard_id, access_token)
            
            if not response.get("success", False):
                return [{
                    **app_state, 
                    "alert": {
                        "message": response.get("message", "필드 저장에 실패했습니다."), 
                        "color": "danger"
                    }
                }]
            
            return [{
                **app_state, 
                "alert": {
                    "message": "필드가 저장되었습니다.", 
                    "color": "success"
                }
            }]
            
        except Exception as e:
            logger.error(f"필드 저장 오류: {str(e)}")
            
            # 오류 발생 시에도 락 해제 시도
            try:
                ApiClient.release_lock(dashboard_id, access_token)
            except:
                pass
                
            return [{
                **app_state, 
                "alert": {
                    "message": "필드 저장 중 오류가 발생했습니다.", 
                    "color": "danger"
                }
            }]