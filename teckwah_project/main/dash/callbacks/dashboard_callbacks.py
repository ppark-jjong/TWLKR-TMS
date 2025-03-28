# teckwah_project/main/dash/callbacks/dashboard_callbacks.py
from dash import Dash, Output, Input, State, callback_context, no_update, html
from dash.exceptions import PreventUpdate
import dash_bootstrap_components as dbc
import logging
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from main.dash.api.api_client import ApiClient
from main.dash.utils.auth_helper import is_token_valid, is_admin_user, get_user_id
from main.dash.utils.format_helper import (
    prepare_table_data,
    filter_table_data,
    format_status,
    format_type,
    format_warehouse,
    validate_required,
    validate_date_format,
    validate_datetime_format,
    validate_phone,
)
from main.dash.utils.state_manager import (
    update_app_state,
    create_alert_data,
    get_modal_state,
    set_modal_state,
    get_filter_state,
    should_reload_data,
    clear_reload_flag
)
from main.dash.components.modals import (
    create_detail_modal,
    create_assign_modal,
    create_delete_confirm_modal,
)

logger = logging.getLogger(__name__)

def register_data_callbacks(app: Dash):
    """대시보드 데이터 관련 콜백 등록"""

    # 페이지 로드 시 오늘 날짜 설정 및 데이터 자동 조회
    @app.callback(
        [
            Output("date-picker-range", "start_date"),
            Output("date-picker-range", "end_date"),
            Output("reload-data-trigger", "data"),
        ],
        [Input("url", "pathname")],
        [State("auth-store", "data")],
        prevent_initial_call=True,
    )
    def set_default_date_and_load_data(pathname, auth_data):
        """대시보드 페이지 로드 시 오늘 날짜로 설정하고 데이터 자동 조회"""
        # 대시보드 페이지로 이동한 경우에만 실행
        if pathname != "/dashboard":
            raise PreventUpdate
            
        # 인증 확인
        if not is_token_valid(auth_data):
            raise PreventUpdate
            
        # 오늘 날짜 설정
        today = datetime.now().date().isoformat()
        
        # 데이터 로드 트리거 증가
        trigger_value = {"timestamp": time.time()}
        
        logger.info(f"대시보드 페이지 로드: 오늘 날짜({today})로 데이터 자동 조회 설정")
        
        return today, today, trigger_value

    # 데이터 로드 콜백 - 날짜 변경, 필터, 트리거 모두 처리하는 단일 콜백
    @app.callback(
        [
            Output("dashboard-table", "data"),
            Output("table-loading-container", "className"),
            Output("empty-data-container", "className"),
            Output("app-state-store", "data", allow_duplicate=True),
        ],
        [
            Input("refresh-data-button", "n_clicks"),
            Input("apply-filter-button", "n_clicks"),
            Input("reload-data-trigger", "data"),
            Input("date-picker-range", "start_date"),
            Input("date-picker-range", "end_date"),
            Input("order-search-button", "n_clicks"),
            Input("order-search-input", "n_submit"),
        ],
        [
            State("auth-store", "data"),
            State("dashboard-table", "data"),
            State("type-filter", "value"),
            State("department-filter", "value"),
            State("warehouse-filter", "value"),
            State("order-search-input", "value"),
            State("app-state-store", "data"),
        ],
        prevent_initial_call=True,
    )
    def load_dashboard_data(
        refresh_clicks,
        filter_clicks,
        reload_trigger,
        start_date,
        end_date,
        search_clicks,
        search_submit,
        auth_data,
        current_data,
        type_filter,
        dept_filter,
        warehouse_filter,
        order_no,
        app_state,
    ):
        """통합 대시보드 데이터 로드 - 단일 콜백으로 모든 로드/필터/검색 처리"""
        ctx = callback_context
        if not ctx.triggered:
            raise PreventUpdate

        # 인증 확인
        if not is_token_valid(auth_data):
            return no_update, no_update, no_update, no_update

        # 액세스 토큰
        access_token = auth_data.get("access_token", "")

        # 이벤트 확인 (트리거 식별)
        trigger_id = ctx.triggered[0]["prop_id"].split(".")[0]
        logger.info(f"데이터 로드 트리거: {trigger_id}")

        # 로딩 상태 표시
        table_loading_class = "d-block"
        empty_data_class = "d-none"
        
        # 주문번호 검색 처리 (order-search-button 또는 order-search-input 트리거)
        if (trigger_id in ["order-search-button", "order-search-input"] and 
            (search_clicks or search_submit) and order_no):
            try:
                # API 호출로 검색
                response = ApiClient.search_by_order_no(order_no, access_token)

                if not response.get("success", False):
                    # 검색 실패 알림
                    alert = create_alert_data(
                        response.get("message", "검색 결과가 없습니다."), 
                        "warning"
                    )
                    updated_app_state = update_app_state(app_state, {"alert": alert})
                    return current_data or [], "d-none", "d-block", updated_app_state

                # 데이터 추출
                data = response.get("data", {})
                items = data.get("items", [])

                # 테이블 표시용 데이터 변환
                formatted_data = prepare_table_data(items)

                # 검색 결과 없음 처리
                if not formatted_data:
                    alert = create_alert_data("검색 결과가 없습니다.", "warning")
                    updated_app_state = update_app_state(app_state, {"alert": alert})
                    return [], "d-none", "d-block", updated_app_state

                # 검색 성공 알림
                alert = create_alert_data(f"'{order_no}' 검색 결과입니다.", "success")
                updated_app_state = update_app_state(app_state, {"alert": alert})
                return formatted_data, "d-none", "d-none", updated_app_state

            except Exception as e:
                logger.error(f"주문번호 검색 오류: {str(e)}")
                alert = create_alert_data("검색 중 오류가 발생했습니다.", "danger")
                updated_app_state = update_app_state(app_state, {"alert": alert})
                return current_data or [], "d-none", "d-block", updated_app_state

        # 날짜 확인 (검색이 아닌 경우)
        if not start_date or not end_date:
            alert = create_alert_data("조회 기간을 선택해주세요.", "warning")
            updated_app_state = update_app_state(app_state, {"alert": alert})
            return no_update, "d-none", "d-block", updated_app_state

        try:
            # 필터 적용 처리
            if trigger_id == "apply-filter-button":
                filters = {
                    "type": type_filter,
                    "department": dept_filter,
                    "warehouse": warehouse_filter,
                }
                
                # 필터 변경시 전체 데이터 재로드하지 않고 현재 데이터 필터링
                if current_data:
                    filtered_data = filter_table_data(current_data, filters)
                    
                    # 앱 상태에 필터 정보 저장
                    updated_app_state = update_app_state(app_state, {"filters": filters})
                    
                    # 필터 적용 알림
                    alert = create_alert_data("필터가 적용되었습니다.", "info")
                    updated_app_state = update_app_state(updated_app_state, {"alert": alert})
                    
                    return (
                        filtered_data,
                        "d-none",
                        "d-none" if filtered_data else "d-block",
                        updated_app_state,
                    )
                
                # 데이터가 없는 경우 전체 데이터 로드 후 필터 적용
                
            # 데이터 로드 (검색/필터 처리 이외의 모든 경우)
            # API 호출로 데이터 로드
            response = ApiClient.get_dashboard_list(start_date, end_date, access_token)

            if not response.get("success", False):
                # API 오류
                alert = create_alert_data(
                    response.get("message", "데이터 로드에 실패했습니다."),
                    "danger"
                )
                updated_app_state = update_app_state(app_state, {"alert": alert})
                return current_data or [], "d-none", "d-block", updated_app_state

            # 데이터 추출
            data = response.get("data", {})
            items = data.get("items", [])

            # 데이터 없음
            if not items:
                return [], "d-none", "d-block", app_state

            # 테이블 표시용 데이터 변환
            formatted_data = prepare_table_data(items)

            # 필터 적용 버튼 클릭으로 데이터 로드된 경우 필터링 적용
            if trigger_id == "apply-filter-button":
                filters = {
                    "type": type_filter,
                    "department": dept_filter,
                    "warehouse": warehouse_filter,
                }

                # 앱 상태에 필터 정보 저장
                updated_app_state = update_app_state(app_state, {"filters": filters})

                # 필터링
                filtered_data = filter_table_data(formatted_data, filters)

                return (
                    filtered_data,
                    "d-none",
                    "d-none" if filtered_data else "d-block",
                    updated_app_state,
                )

            # 필터 정보가 이미 있으면 자동 적용
            if app_state and "filters" in app_state:
                filters = app_state["filters"]
                if filters and any(filters[key] != "ALL" for key in filters):
                    filtered_data = filter_table_data(formatted_data, filters)
                    return (
                        filtered_data,
                        "d-none",
                        "d-none" if filtered_data else "d-block",
                        app_state,
                    )

            # 앱 상태에 필터 초기화 (있을 경우만 처리)
            if app_state and "filters" in app_state:
                updated_app_state = update_app_state(app_state, {
                    "filters": {"type": "ALL", "department": "ALL", "warehouse": "ALL"},
                    "reload_data": False  # 로드 플래그 초기화
                })
                return formatted_data, "d-none", "d-none", updated_app_state

            # 기본 상태 - 필터 없이 전체 데이터 표시
            return formatted_data, "d-none", "d-none", clear_reload_flag(app_state)

        except Exception as e:
            logger.error(f"대시보드 데이터 로드 오류: {str(e)}")
            alert = create_alert_data("데이터 로드 중 오류가 발생했습니다.", "danger")
            updated_app_state = update_app_state(app_state, {"alert": alert})
            return current_data or [], "d-none", "d-block", updated_app_state

def register_interaction_callbacks(app: Dash):
    """대시보드 상호작용 관련 콜백 등록"""

    # 선택 행에 따른 버튼 활성화 상태 업데이트
    @app.callback(
        [
            Output("dashboard-table", "selected_rows"),
            Output("assign-button", "disabled"),
            Output("delete-button", "disabled"),
        ],
        [Input("dashboard-table", "selected_rows"), Input("dashboard-table", "data")],
        [State("user-info-store", "data")],
        prevent_initial_call=True,
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

    # 상세 정보 모달 토글 콜백
    @app.callback(
        [
            Output("detail-modal", "is_open"),
            Output("detail-modal", "children"),
            Output("app-state-store", "data", allow_duplicate=True),
        ],
        [
            Input("dashboard-table", "active_cell"),
            Input("close-detail-modal-button", "n_clicks"),
        ],
        [
            State("dashboard-table", "data"),
            State("auth-store", "data"),
            State("app-state-store", "data"),
            State("url", "pathname"),
        ],
        prevent_initial_call=True,
    )
    def toggle_detail_modal(
        active_cell, close_clicks, table_data, auth_data, app_state, pathname
    ):
        """상세 정보 모달 토글 - 조회만 가능하도록 락 없이 구현"""
        # 현재 경로가 대시보드가 아니면 실행하지 않음
        if pathname != "/dashboard":
            raise PreventUpdate
        
        ctx = callback_context
        if not ctx.triggered:
            raise PreventUpdate

        trigger_id = ctx.triggered[0]["prop_id"].split(".")[0]

        # 닫기 버튼 클릭 => 모달 닫기
        if trigger_id == "close-detail-modal-button" and close_clicks:
            updated_app_state = set_modal_state(app_state, "detail", False)
            return False, no_update, updated_app_state

        # 테이블 행 클릭 => 모달 열기
        if trigger_id == "dashboard-table" and active_cell:
            row_idx = active_cell["row"]

            if not table_data or row_idx >= len(table_data):
                raise PreventUpdate

            row_data = table_data[row_idx]
            dashboard_id = row_data.get("dashboard_id")

            if not dashboard_id or not is_token_valid(auth_data):
                raise PreventUpdate

            # 상세 정보 API 호출 - 락이 걸려있어도 조회는 가능하게 수정
            access_token = auth_data.get("access_token", "")
            response = ApiClient.get_dashboard_detail(dashboard_id, access_token)

            if not response.get("success", False):
                alert = create_alert_data(
                    response.get("message", "상세 정보를 불러올 수 없습니다."),
                    "danger"
                )
                updated_app_state = update_app_state(app_state, {"alert": alert})
                return False, no_update, updated_app_state

            # 상세 데이터 및 락 정보 추출
            data = response.get("data", {})
            
            # 락 정보 확인 (조회는 가능하지만 사용자에게 정보 제공)
            is_locked = response.get("is_locked", False)
            lock_info = response.get("lock_info", {})
            
            # 상세 모달 생성
            detail_modal = create_detail_modal(data, is_locked, lock_info)

            # 앱 상태 업데이트
            updated_app_state = set_modal_state(
                app_state, 
                "detail", 
                True, 
                {"dashboard_id": dashboard_id}
            )

            return True, detail_modal, updated_app_state
        
        return no_update, no_update, no_update

    # 상태 변경 콜백
    @app.callback(
        [Output("app-state-store", "data", allow_duplicate=True)],
        [
            Input("status-waiting-button", "n_clicks"),
            Input("status-inprogress-button", "n_clicks"),
            Input("status-complete-button", "n_clicks"),
            Input("status-issue-button", "n_clicks"),
            Input("status-cancel-button", "n_clicks"),
        ],
        [
            State("dashboard-id-input", "value"),
            State("auth-store", "data"),
            State("user-info-store", "data"),
            State("app-state-store", "data"),
        ],
        prevent_initial_call=True,
    )
    def update_status(
        waiting_clicks,
        inprogress_clicks,
        complete_clicks,
        issue_clicks,
        cancel_clicks,
        dashboard_id,
        auth_data,
        user_info,
        app_state,
    ):
        """상태 업데이트 - 버튼 클릭 시부터 비관적 락 적용"""
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
            "status-cancel-button": "CANCEL",
        }

        if trigger_id not in status_map:
            raise PreventUpdate

        new_status = status_map[trigger_id]

        # 관리자 여부
        is_admin = is_admin_user(user_info)

        # 액세스 토큰
        access_token = auth_data.get("access_token", "")

        try:
            # 락 획득 API 호출 - 버튼 클릭 시점부터 트랜잭션 시작
            lock_response = ApiClient.acquire_lock(dashboard_id, "STATUS", access_token)

            if not lock_response.get("success", False):
                alert = create_alert_data(
                    lock_response.get("message", "상태 변경 권한을 획득할 수 없습니다. 다른 사용자가 작업 중입니다."),
                    "warning"
                )
                return [update_app_state(app_state, {"alert": alert})]

            # API 호출로 상태 업데이트
            response = ApiClient.update_dashboard_status(
                dashboard_id, new_status, is_admin, access_token
            )

            # 락 해제 (성공 여부와 무관하게)
            ApiClient.release_lock(dashboard_id, access_token)

            if not response.get("success", False):
                alert = create_alert_data(
                    response.get("message", "상태 변경에 실패했습니다."), 
                    "danger"
                )
                return [update_app_state(app_state, {"alert": alert})]

            # 상태 텍스트 맵핑
            status_text_map = {
                "WAITING": "대기",
                "IN_PROGRESS": "진행 중",
                "COMPLETE": "완료",
                "ISSUE": "이슈",
                "CANCEL": "취소",
            }

            alert = create_alert_data(
                f"{status_text_map.get(new_status, new_status)} 상태로 변경되었습니다.",
                "success"
            )
            return [update_app_state(app_state, {
                "alert": alert,
                "reload_data": True  # 데이터 리로드 플래그 추가
            })]

        except Exception as e:
            logger.error(f"상태 변경 오류: {str(e)}")

            # 오류 발생 시에도 락 해제 시도
            try:
                ApiClient.release_lock(dashboard_id, access_token)
            except:
                pass

            alert = create_alert_data("상태 변경 중 오류가 발생했습니다.", "danger")
            return [update_app_state(app_state, {"alert": alert})]

    # 배차 모달 토글 콜백
    @app.callback(
        [
            Output("assign-modal", "is_open"),
            Output("assign-modal", "children"),
            Output("app-state-store", "data", allow_duplicate=True),
        ],
        [Input("assign-button", "n_clicks"), Input("close-assign-modal-button", "n_clicks")],
        [
            State("dashboard-table", "selected_rows"),
            State("dashboard-table", "data"),
            State("assign-modal", "is_open"),
            State("app-state-store", "data"),
        ],
        prevent_initial_call=True,
    )
    def toggle_assign_modal(
        assign_clicks, close_clicks, selected_rows, table_data, is_open, app_state
    ):
        """배차 모달 토글"""
        ctx = callback_context
        if not ctx.triggered:
            raise PreventUpdate

        trigger_id = ctx.triggered[0]["prop_id"].split(".")[0]

        # 닫기 버튼 클릭
        if trigger_id == "close-assign-modal-button":
            updated_app_state = set_modal_state(app_state, "assign", False)
            return False, no_update, updated_app_state

        # 배차 버튼 클릭
        if trigger_id == "assign-button":
            if not selected_rows or not table_data:
                raise PreventUpdate

            # 선택된 행 데이터 추출
            selected_data = [table_data[i] for i in selected_rows if i < len(table_data)]
            if not selected_data:
                raise PreventUpdate

            # 모든 선택된 행이 '대기' 상태인지 확인
            if not all(row.get("status") == "대기" for row in selected_data):
                alert = create_alert_data("대기 상태의 주문만 배차할 수 있습니다.", "warning")
                updated_app_state = update_app_state(app_state, {"alert": alert})
                return False, no_update, updated_app_state

            # 선택된 ID 목록
            dashboard_ids = [row.get("dashboard_id") for row in selected_data]

            # 모달 내용 생성
            assign_modal = create_assign_modal()

            # 앱 상태 업데이트
            updated_app_state = set_modal_state(
                app_state, "assign", True, {"dashboard_ids": dashboard_ids}
            )

            return True, assign_modal, updated_app_state

        return no_update, no_update, no_update

    # 배차 실행 콜백
    @app.callback(
        [Output("app-state-store", "data", allow_duplicate=True)],
        [Input("confirm-assign-button", "n_clicks")],
        [
            State("driver-name-input", "value"),
            State("driver-contact-input", "value"),
            State("app-state-store", "data"),
            State("auth-store", "data"),
        ],
        prevent_initial_call=True,
    )
    def perform_assign(n_clicks, driver_name, driver_contact, app_state, auth_data):
        """배차 실행 - 버튼 클릭 시부터 비관적 락 적용"""
        if not n_clicks:
            raise PreventUpdate

        # 배차 정보 확인
        if not driver_name:
            alert = create_alert_data("기사명을 입력해주세요.", "warning")
            return [update_app_state(app_state, {"alert": alert})]

        # 인증 확인
        if not is_token_valid(auth_data):
            alert = create_alert_data("로그인이 필요합니다.", "warning")
            return [update_app_state(app_state, {"alert": alert})]

        # 대시보드 ID 목록 추출
        modals = app_state.get("modals", {})
        assign_data = modals.get("assign", {})
        dashboard_ids = assign_data.get("dashboard_ids", [])

        if not dashboard_ids:
            alert = create_alert_data("배차할 항목이 없습니다.", "warning")
            return [update_app_state(app_state, {"alert": alert})]

        # 액세스 토큰
        access_token = auth_data.get("access_token", "")

        try:
            # 각 대시보드에 대해 락 획득 후 처리
            for dashboard_id in dashboard_ids:
                # 락 획득 시도
                lock_response = ApiClient.acquire_lock(dashboard_id, "ASSIGN", access_token)
                if not lock_response.get("success", False):
                    alert = create_alert_data(
                        lock_response.get("message", f"배차 권한을 획득할 수 없습니다. 다른 사용자가 항목 ID:{dashboard_id}에 대해 작업 중입니다."),
                        "warning"
                    )
                    return [update_app_state(app_state, {"alert": alert})]
                
                # 성공적으로 락 획득 후 해제 (API 호출 전)
                ApiClient.release_lock(dashboard_id, access_token)
            
            # 모든 항목에 대해 락 획득이 가능한 경우만 배차 진행
            response = ApiClient.assign_driver(
                dashboard_ids, driver_name, driver_contact, access_token
            )

            if not response.get("success", False):
                alert = create_alert_data(
                    response.get("message", "배차에 실패했습니다."), 
                    "danger"
                )
                return [update_app_state(app_state, {"alert": alert})]

            # 모달 닫기 및 결과 표시
            updated_app_state = set_modal_state(app_state, "assign", False)
            alert = create_alert_data(
                f"{len(dashboard_ids)}건의 배차가 완료되었습니다.",
                "success"
            )
            
            # 알림 추가 및 데이터 리로드 플래그 설정
            updated_app_state = update_app_state(updated_app_state, {
                "alert": alert,
                "reload_data": True
            })

            return [updated_app_state]

        except Exception as e:
            logger.error(f"배차 처리 오류: {str(e)}")
            alert = create_alert_data("배차 중 오류가 발생했습니다.", "danger")
            return [update_app_state(app_state, {"alert": alert})]

    # 삭제 확인 모달 토글 콜백
    @app.callback(
        [
            Output("delete-confirm-modal", "is_open"),
            Output("delete-confirm-modal", "children"),
            Output("app-state-store", "data", allow_duplicate=True),
        ],
        [Input("delete-button", "n_clicks"), Input("close-delete-modal-button", "n_clicks")],
        [
            State("dashboard-table", "selected_rows"),
            State("dashboard-table", "data"),
            State("delete-confirm-modal", "is_open"),
            State("app-state-store", "data"),
            State("user-info-store", "data"),
        ],
        prevent_initial_call=True,
    )
    def toggle_delete_modal(
        delete_clicks, close_clicks, selected_rows, table_data, is_open, app_state, user_info
    ):
        """삭제 확인 모달 토글"""
        ctx = callback_context
        if not ctx.triggered:
            raise PreventUpdate

        trigger_id = ctx.triggered[0]["prop_id"].split(".")[0]

        # 닫기 버튼 클릭
        if trigger_id == "close-delete-modal-button":
            updated_app_state = set_modal_state(app_state, "delete", False)
            return False, no_update, updated_app_state

        # 삭제 버튼 클릭
        if trigger_id == "delete-button":
            if not selected_rows or not table_data:
                raise PreventUpdate

            # 관리자 권한 확인
            if not is_admin_user(user_info):
                alert = create_alert_data("삭제 권한이 없습니다.", "danger")
                updated_app_state = update_app_state(app_state, {"alert": alert})
                return False, no_update, updated_app_state

            # 선택된 행 데이터 추출
            selected_data = [table_data[i] for i in selected_rows if i < len(table_data)]
            if not selected_data:
                raise PreventUpdate

            # 선택된 ID 목록
            dashboard_ids = [row.get("dashboard_id") for row in selected_data]

            # 모달 내용 생성
            delete_modal = create_delete_confirm_modal()

            # 앱 상태 업데이트
            updated_app_state = set_modal_state(
                app_state, "delete", True, {"dashboard_ids": dashboard_ids}
            )

            return True, delete_modal, updated_app_state

        return no_update, no_update, no_update

    # 삭제 실행 콜백
    @app.callback(
        [Output("app-state-store", "data", allow_duplicate=True)],
        [Input("confirm-delete-button", "n_clicks")],
        [
            State("app-state-store", "data"),
            State("auth-store", "data"),
            State("user-info-store", "data"),
        ],
        prevent_initial_call=True,
    )
    def perform_delete(n_clicks, app_state, auth_data, user_info):
        """삭제 실행"""
        if not n_clicks:
            raise PreventUpdate

        # 관리자 권한 확인
        if not is_admin_user(user_info):
            alert = create_alert_data("삭제 권한이 없습니다.", "danger")
            return [update_app_state(app_state, {"alert": alert})]

        # 인증 확인
        if not is_token_valid(auth_data):
            alert = create_alert_data("로그인이 필요합니다.", "warning")
            return [update_app_state(app_state, {"alert": alert})]

        # 대시보드 ID 목록 추출
        modals = app_state.get("modals", {})
        delete_data = modals.get("delete", {})
        dashboard_ids = delete_data.get("dashboard_ids", [])

        if not dashboard_ids:
            alert = create_alert_data("삭제할 항목이 없습니다.", "warning")
            return [update_app_state(app_state, {"alert": alert})]

        # 액세스 토큰
        access_token = auth_data.get("access_token", "")

        try:
            # API 호출로 삭제 처리
            response = ApiClient.delete_dashboards(dashboard_ids, access_token)

            if not response.get("success", False):
                alert = create_alert_data(
                    response.get("message", "삭제에 실패했습니다."),
                    "danger"
                )
                return [update_app_state(app_state, {"alert": alert})]

            # 모달 닫기 및 결과 표시
            updated_app_state = set_modal_state(app_state, "delete", False)
            alert = create_alert_data(
                f"{len(dashboard_ids)}건의 항목이 삭제되었습니다.",
                "success"
            )
            
            # 알림 추가 및 데이터 리로드 플래그 설정
            updated_app_state = update_app_state(updated_app_state, {
                "alert": alert,
                "reload_data": True
            })

            return [updated_app_state]

        except Exception as e:
            logger.error(f"삭제 처리 오류: {str(e)}")
            alert = create_alert_data("삭제 중 오류가 발생했습니다.", "danger")
            return [update_app_state(app_state, {"alert": alert})]

    # 중앙 집중식 데이터 리로드 트리거 콜백
    @app.callback(
        Output("reload-data-trigger", "data", allow_duplicate=True),
        [Input("app-state-store", "data")],
        [State("reload-data-trigger", "data")],
        prevent_initial_call=True,
    )
    def trigger_data_reload_on_state_change(app_state, current_trigger):
        """앱 상태 변경 시 필요한 경우 데이터 리로드 트리거"""
        if should_reload_data(app_state):
            logger.info("앱 상태의 reload_data 플래그로 인한 데이터 리로드")
            return {"timestamp": time.time()}
        
        # 그 외의 경우 트리거 유지
        return current_trigger or {"timestamp": time.time() - 100}