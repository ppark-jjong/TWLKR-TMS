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
from main.dash.utils.callback_helpers import (
    create_alert_data,
    create_user_friendly_error,
    create_validation_feedback,
    create_field_feedback,
    validate_form_data,
)
from main.dash.components.modals import (
    create_detail_modal,
    create_assign_modal,
    create_delete_confirm_modal,
)

logger = logging.getLogger(__name__)


def register_callbacks(app: Dash):
    """대시보드 관련 콜백 등록"""

    # 데이터 로드 콜백 개선 - 명시적 액션 기반으로 수정
    @app.callback(
        [
            Output("dashboard-table", "data", allow_duplicate=True),
            Output("table-loading-container", "className", allow_duplicate=True),
            Output("empty-data-container", "className", allow_duplicate=True),
            Output("app-state-store", "data", allow_duplicate=True),
        ],
        [
            Input("refresh-button", "n_clicks"),
            Input("apply-filter-button", "n_clicks"),
            Input("reload-data-trigger", "data"),  # 중앙 집중식 데이터 갱신 트리거 추가
        ],
        [
            State("date-picker-range", "start_date"),
            State("date-picker-range", "end_date"),
            State("auth-store", "data"),
            State("dashboard-table", "data"),
            State("type-filter", "value"),
            State("department-filter", "value"),
            State("warehouse-filter", "value"),
            State("app-state-store", "data"),
        ],
        prevent_initial_call=True,
    )
    def load_dashboard_data(
        refresh_clicks,
        filter_clicks,
        reload_trigger,  # 새 입력 파라미터 추가
        start_date,
        end_date,
        auth_data,
        current_data,
        type_filter,
        dept_filter,
        warehouse_filter,
        app_state,
    ):
        """대시보드 데이터 로드 및 필터링 (명시적 액션 기반)"""
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
            return (
                no_update,
                "d-none",
                "d-block",
                {
                    **app_state,
                    "alert": {
                        "message": "조회 기간을 선택해주세요.",
                        "color": "warning",
                    },
                },
            )

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
                return (
                    current_data or [],
                    "d-none",
                    "d-block",
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
                    "warehouse": warehouse_filter,
                }

                # 앱 상태에 필터 정보 저장
                updated_app_state = {**app_state, "filters": filters}

                # 필터링
                filtered_data = filter_table_data(formatted_data, filters)

                return (
                    filtered_data,
                    "d-none",
                    "d-none" if filtered_data else "d-block",
                    updated_app_state,
                )

            # 필터 정보가 이미 있으면 적용
            if app_state and "filters" in app_state:
                filters = app_state["filters"]
                if filters and filters != {"type": "ALL", "department": "ALL", "warehouse": "ALL"}:
                    filtered_data = filter_table_data(formatted_data, filters)
                    return (
                        filtered_data,
                        "d-none",
                        "d-none" if filtered_data else "d-block",
                        app_state,
                    )

            # 앱 상태에 필터 초기화
            updated_app_state = {
                **app_state,
                "filters": {"type": "ALL", "department": "ALL", "warehouse": "ALL"},
            }

            return formatted_data, "d-none", "d-none", updated_app_state

        except Exception as e:
            logger.error(f"대시보드 데이터 로드 오류: {str(e)}")
            return (
                current_data or [],
                "d-none",
                "d-block",
                {
                    **app_state,
                    "alert": {
                        "message": "데이터 로드 중 오류가 발생했습니다.",
                        "color": "danger",
                    },
                },
            )

    @app.callback(
        [
            Output("dashboard-table", "selected_rows", allow_duplicate=True),
            Output("assign-button", "disabled", allow_duplicate=True),
            Output("delete-button", "disabled", allow_duplicate=True),
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

    @app.callback(
        [Output("dashboard-table", "data", allow_duplicate=True)],
        [Input("order-search-button", "n_clicks")],
        [
            State("order-search-input", "value"),
            State("auth-store", "data"),
            State("app-state-store", "data"),
        ],
        prevent_initial_call=True,
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
                    "color": "warning",
                }

            return [formatted_data]

        except Exception as e:
            logger.error(f"주문번호 검색 오류: {str(e)}")
            return [no_update]

    @app.callback(
        [
            Output("detail-modal", "is_open", allow_duplicate=True),
            Output("detail-modal", "children", allow_duplicate=True),
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
        ],
        prevent_initial_call=True,
    )
    def toggle_detail_modal(
        active_cell, close_clicks, table_data, auth_data, app_state
    ):
        """상세 정보 모달 토글"""
        ctx = callback_context
        if not ctx.triggered:
            raise PreventUpdate

        trigger_id = ctx.triggered[0]["prop_id"].split(".")[0]

        # 닫기 버튼 클릭 => 모달 닫기
        if trigger_id == "close-detail-modal-button":
            updated_modals = {
                **app_state.get("modals", {}),
                "detail": {"is_open": False, "dashboard_id": None},
            }
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
                return (
                    False,
                    no_update,
                    {
                        **app_state,
                        "alert": {
                            "message": response.get(
                                "message", "상세 정보를 불러올 수 없습니다."
                            ),
                            "color": "danger",
                        },
                    },
                )

            # 상세 데이터 및 락 정보 추출
            data = response.get("data", {})
            is_locked = response.get("is_locked", False)
            lock_info = response.get("lock_info")

            # 상세 모달 생성
            detail_modal = create_detail_modal(data, is_locked, lock_info)

            # 앱 상태 업데이트
            updated_modals = {
                **app_state.get("modals", {}),
                "detail": {"is_open": True, "dashboard_id": dashboard_id},
            }

            return True, detail_modal, {**app_state, "modals": updated_modals}

        return no_update, no_update, no_update

    @app.callback(
        [Output("app-state-store", "data", allow_duplicate=True)],
        [Input("save-fields-button", "n_clicks")],
        [
            State("dashboard-id-input", "value"),
            State("eta-input", "value"),
            State("customer-input", "value"),
            State("contact-input", "value"),
            State("postal-code-input", "value"),
            State("address-input", "value"),
            State("remark-textarea", "value"),
            State("auth-store", "data"),
            State("user-info-store", "data"),
            State("app-state-store", "data"),
        ],
        prevent_initial_call=True,
    )
    def update_dashboard_integrated(
        n_clicks,
        dashboard_id,
        eta,
        customer,
        contact,
        postal_code,
        address,
        remark_content,
        auth_data,
        user_info,
        app_state,
    ):
        """대시보드 통합 업데이트 (필드 + 메모) - 관리자 전용"""
        if not n_clicks or not dashboard_id:
            raise PreventUpdate

        # 관리자 권한 확인
        if not is_admin_user(user_info):
            return [{
                **app_state,
                "alert": create_alert_data("관리자만 대시보드를 수정할 수 있습니다.", "danger"),
            }]

        # 필수 필드 확인
        if not eta or not customer or not postal_code or not address:
            return [{
                **app_state,
                "alert": create_alert_data("필수 필드를 입력해주세요.", "warning"),
            }]

        # 인증 확인
        access_token = auth_data.get("access_token")
        if not is_token_valid(auth_data):
            return [{
                **app_state,
                "alert": create_alert_data("로그인이 필요합니다.", "warning"),
            }]

        # 날짜 형식 검증
        try:
            eta_datetime = datetime.fromisoformat(eta)
        except:
            return [{
                **app_state,
                "alert": create_alert_data("ETA의 날짜 형식이 올바르지 않습니다.", "warning"),
            }]

        # 업데이트 데이터 준비
        update_data = {
            "eta": eta,
            "customer": customer,
            "contact": contact,
            "postal_code": postal_code,
            "address": address,
        }
        
        # 메모가 있는 경우 추가
        if remark_content is not None:  # 빈 문자열도 포함
            update_data["remark_content"] = remark_content

        try:
            # 락 획득 시도
            lock_response = ApiClient.acquire_lock(dashboard_id, "UPDATE", access_token)
            if not lock_response.get("success", False):
                return [{
                    **app_state,
                    "alert": create_alert_data(
                        lock_response.get("message", "대시보드를 수정할 수 없습니다."),
                        "warning"
                    ),
                }]
            
            # 통합 업데이트 API 호출
            response = ApiClient.update_dashboard(
                dashboard_id, update_data, access_token
            )
            
            # 락 해제 (성공 여부와 무관하게)
            ApiClient.release_lock(dashboard_id, access_token)

            if response.get("success", False):
                return [{
                    **app_state,
                    "alert": create_alert_data("대시보드가 성공적으로 업데이트되었습니다.", "success"),
                    "modals": {
                        **app_state.get("modals", {}),
                        "detail": False,  # 모달 닫기
                    },
                    "reload_data": True,  # 데이터 리로드 플래그
                }]
            else:
                # 에러 메시지 처리
                error_msg = create_user_friendly_error(response)
                return [{
                    **app_state,
                    "alert": create_alert_data(error_msg, "danger"),
                }]

        except Exception as e:
            logger.error(f"대시보드 통합 업데이트 오류: {str(e)}")
            
            # 예외 발생 시에도 락 해제 시도
            try:
                ApiClient.release_lock(dashboard_id, access_token)
            except:
                pass
            
            return [{
                **app_state,
                "alert": create_alert_data("대시보드 업데이트 중 오류가 발생했습니다.", "danger"),
            }]

    # 중앙 집중식 데이터 리로드 트리거 콜백 추가
    @app.callback(
        Output("reload-data-trigger", "data"),
        [
            Input("detail-modal", "is_open"),
            Input("assign-modal", "is_open"),
            Input("delete-confirm-modal", "is_open")
        ],
        [
            State("reload-data-trigger", "data"),
            State("app-state-store", "data")
        ],
    )
    def trigger_data_reload(detail_open, assign_open, delete_open, current_trigger, app_state):
        """모달이 닫힐 때 데이터 리로드 트리거"""
        ctx = callback_context
        if not ctx.triggered:
            raise PreventUpdate
        
        trigger_id = ctx.triggered[0]["prop_id"].split(".")[0]
        prop_value = ctx.triggered[0]["value"]
        
        # 모달이 닫힐 때만 리로드
        if trigger_id == "detail-modal" and not prop_value:
            # 모달이 닫히면서 데이터를 리로드
            return {"time": time.time()}
        
        if trigger_id == "assign-modal" and not prop_value:
            # 배차 모달이 닫히면서 데이터를 리로드
            return {"time": time.time()}
        
        if trigger_id == "delete-confirm-modal" and not prop_value:
            # 삭제 확인 모달이 닫히면서 데이터를 리로드
            return {"time": time.time()}
        
        # 그 외 경우는 리로드 트리거 유지
        return current_trigger or {"time": time.time() - 100}

    # 상태 업데이트 콜백
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
            # 락 획득 API 호출
            lock_response = ApiClient.acquire_lock(dashboard_id, "STATUS", access_token)

            if not lock_response.get("success", False):
                return [
                    {
                        **app_state,
                        "alert": {
                            "message": lock_response.get(
                                "message", "상태 변경 권한을 획득할 수 없습니다."
                            ),
                            "color": "warning",
                        },
                    }
                ]

            # API 호출로 상태 업데이트
            response = ApiClient.update_dashboard_status(
                dashboard_id, new_status, is_admin, access_token
            )

            # 락 해제 (성공 여부와 무관하게)
            ApiClient.release_lock(dashboard_id, access_token)

            if not response.get("success", False):
                return [
                    {
                        **app_state,
                        "alert": {
                            "message": response.get(
                                "message", "상태 변경에 실패했습니다."
                            ),
                            "color": "danger",
                        },
                    }
                ]

            # 상태 텍스트 맵핑
            status_text_map = {
                "WAITING": "대기",
                "IN_PROGRESS": "진행 중",
                "COMPLETE": "완료",
                "ISSUE": "이슈",
                "CANCEL": "취소",
            }

            return [
                {
                    **app_state,
                    "alert": {
                        "message": f"{status_text_map.get(new_status, new_status)} 상태로 변경되었습니다.",
                        "color": "success",
                    },
                    "reload_data": True,  # 데이터 리로드 플래그 추가
                }
            ]

        except Exception as e:
            logger.error(f"상태 변경 오류: {str(e)}")

            # 오류 발생 시에도 락 해제 시도
            try:
                ApiClient.release_lock(dashboard_id, access_token)
            except:
                pass

            return [
                {
                    **app_state,
                    "alert": {
                        "message": "상태 변경 중 오류가 발생했습니다.",
                        "color": "danger",
                    },
                }
            ]

    # 필드 유효성 검증 콜백 통합 - 명시적 검증 버튼에 의해서만 동작
    @app.callback(
        [
            Output("eta-input", "valid", allow_duplicate=True),
            Output("eta-input", "invalid", allow_duplicate=True),
            Output("eta-feedback", "children", allow_duplicate=True),
            Output("customer-input", "valid", allow_duplicate=True),
            Output("customer-input", "invalid", allow_duplicate=True),
            Output("customer-feedback", "children", allow_duplicate=True),
            Output("contact-input", "valid", allow_duplicate=True),
            Output("contact-input", "invalid", allow_duplicate=True),
            Output("contact-feedback", "children", allow_duplicate=True),
            Output("postal-code-input", "valid", allow_duplicate=True),
            Output("postal-code-input", "invalid", allow_duplicate=True),
            Output("postal-code-feedback", "children", allow_duplicate=True),
            Output("address-input", "valid", allow_duplicate=True),
            Output("address-input", "invalid", allow_duplicate=True),
            Output("address-feedback", "children", allow_duplicate=True),
            Output("save-fields-button", "disabled", allow_duplicate=True),
        ],
        [Input("validate-fields-button", "n_clicks")],
        [
            State("eta-input", "value"),
            State("customer-input", "value"),
            State("contact-input", "value"),
            State("postal-code-input", "value"),
            State("address-input", "value"),
        ],
        prevent_initial_call=True,
    )
    def validate_fields(
        validate_clicks, eta, customer, contact, postal_code, address
    ):
        """필드 유효성 검증 (통합된 명시적 검증)"""
        if not validate_clicks:
            raise PreventUpdate

        # 유효성 검증 결과 초기화
        results = []
        all_valid = True

        # ETA 검증
        eta_valid, eta_message = validate_datetime_format(eta)
        if not eta_valid:
            results.extend([False, True, eta_message])
            all_valid = False
        else:
            results.extend([True, False, ""])

        # 고객명 검증
        customer_valid, customer_message = validate_required(customer)
        if not customer_valid:
            results.extend([False, True, customer_message])
            all_valid = False
        else:
            results.extend([True, False, ""])

        # 연락처 검증
        contact_valid, contact_message = validate_phone(contact)
        if not contact_valid:
            results.extend([False, True, contact_message])
            all_valid = False
        else:
            results.extend([True, False, ""])

        # 우편번호 검증
        postal_valid = True
        postal_message = ""
        if postal_code and not postal_code.isdigit():
            postal_valid = False
            postal_message = "숫자만 입력 가능합니다."
            all_valid = False
        results.extend([postal_valid, not postal_valid, postal_message])

        # 주소 검증
        address_valid, address_message = validate_required(address)
        if not address_valid:
            results.extend([False, True, address_message])
            all_valid = False
        else:
            results.extend([True, False, ""])

        # 저장 버튼 활성화 여부
        results.append(not all_valid)

        return results

    # app_state의 reload_data 플래그를 리로드 트리거와 연결하는 콜백 추가
    @app.callback(
        Output("reload-data-trigger", "data", allow_duplicate=True),
        [Input("app-state-store", "data")],
        [State("reload-data-trigger", "data")],
        prevent_initial_call=True,
    )
    def refresh_data_on_app_state_change(app_state, current_trigger):
        """앱 상태 변경 시 데이터 리로드"""
        if app_state and app_state.get("reload_data", False):
            # reload_data 플래그가 True이면 트리거 업데이트
            return {"time": time.time()}
        
        # 그 외의 경우 트리거 유지
        return current_trigger or {"time": time.time() - 100}

    # 배차 모달 토글 콜백
    @app.callback(
        [
            Output("assign-modal", "is_open", allow_duplicate=True),
            Output("assign-modal", "children", allow_duplicate=True),
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
            updated_modals = {
                **app_state.get("modals", {}),
                "assign": {"is_open": False, "dashboard_ids": []},
            }
            return False, no_update, {**app_state, "modals": updated_modals}

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
                return (
                    False,
                    no_update,
                    {
                        **app_state,
                        "alert": {
                            "message": "대기 상태의 주문만 배차할 수 있습니다.",
                            "color": "warning",
                        },
                    },
                )

            # 선택된 ID 목록
            dashboard_ids = [row.get("dashboard_id") for row in selected_data]

            # 모달 내용 생성
            assign_modal = create_assign_modal()

            # 앱 상태 업데이트
            updated_modals = {
                **app_state.get("modals", {}),
                "assign": {"is_open": True, "dashboard_ids": dashboard_ids},
            }

            return True, assign_modal, {**app_state, "modals": updated_modals}

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
        """배차 실행"""
        if not n_clicks:
            raise PreventUpdate

        # 배차 정보 확인
        if not driver_name:
            return [
                {
                    **app_state,
                    "alert": {"message": "기사명을 입력해주세요.", "color": "warning"},
                }
            ]

        # 인증 확인
        if not is_token_valid(auth_data):
            return [
                {
                    **app_state,
                    "alert": {"message": "로그인이 필요합니다.", "color": "warning"},
                }
            ]

        # 대시보드 ID 목록 추출
        modals = app_state.get("modals", {})
        assign_data = modals.get("assign", {})
        dashboard_ids = assign_data.get("dashboard_ids", [])

        if not dashboard_ids:
            return [
                {
                    **app_state,
                    "alert": {"message": "배차할 항목이 없습니다.", "color": "warning"},
                }
            ]

        # 액세스 토큰
        access_token = auth_data.get("access_token", "")

        try:
            # API 호출로 배차 처리
            response = ApiClient.assign_driver(
                dashboard_ids, driver_name, driver_contact, access_token
            )

            if not response.get("success", False):
                return [
                    {
                        **app_state,
                        "alert": {
                            "message": response.get("message", "배차에 실패했습니다."),
                            "color": "danger",
                        },
                    }
                ]

            # 모달 닫기 및 결과 표시
            updated_modals = {
                **app_state.get("modals", {}),
                "assign": {"is_open": False, "dashboard_ids": []},
            }

            return [
                {
                    **app_state,
                    "alert": {
                        "message": f"{len(dashboard_ids)}건의 배차가 완료되었습니다.",
                        "color": "success",
                    },
                    "modals": updated_modals,
                    "reload_data": True,  # 데이터 리로드 플래그
                }
            ]

        except Exception as e:
            logger.error(f"배차 처리 오류: {str(e)}")
            return [
                {
                    **app_state,
                    "alert": {"message": "배차 중 오류가 발생했습니다.", "color": "danger"},
                }
            ]

    # 삭제 확인 모달 토글 콜백
    @app.callback(
        [
            Output("delete-confirm-modal", "is_open", allow_duplicate=True),
            Output("delete-confirm-modal", "children", allow_duplicate=True),
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
            updated_modals = {
                **app_state.get("modals", {}),
                "delete": {"is_open": False, "dashboard_ids": []},
            }
            return False, no_update, {**app_state, "modals": updated_modals}

        # 삭제 버튼 클릭
        if trigger_id == "delete-button":
            if not selected_rows or not table_data:
                raise PreventUpdate

            # 관리자 권한 확인
            if not is_admin_user(user_info):
                return (
                    False,
                    no_update,
                    {
                        **app_state,
                        "alert": {
                            "message": "삭제 권한이 없습니다.",
                            "color": "danger",
                        },
                    },
                )

            # 선택된 행 데이터 추출
            selected_data = [table_data[i] for i in selected_rows if i < len(table_data)]
            if not selected_data:
                raise PreventUpdate

            # 선택된 ID 목록
            dashboard_ids = [row.get("dashboard_id") for row in selected_data]

            # 모달 내용 생성
            delete_modal = create_delete_confirm_modal()

            # 앱 상태 업데이트
            updated_modals = {
                **app_state.get("modals", {}),
                "delete": {"is_open": True, "dashboard_ids": dashboard_ids},
            }

            return True, delete_modal, {**app_state, "modals": updated_modals}

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
            return [
                {
                    **app_state,
                    "alert": {"message": "삭제 권한이 없습니다.", "color": "danger"},
                }
            ]

        # 인증 확인
        if not is_token_valid(auth_data):
            return [
                {
                    **app_state,
                    "alert": {"message": "로그인이 필요합니다.", "color": "warning"},
                }
            ]

        # 대시보드 ID 목록 추출
        modals = app_state.get("modals", {})
        delete_data = modals.get("delete", {})
        dashboard_ids = delete_data.get("dashboard_ids", [])

        if not dashboard_ids:
            return [
                {
                    **app_state,
                    "alert": {"message": "삭제할 항목이 없습니다.", "color": "warning"},
                }
            ]

        # 액세스 토큰
        access_token = auth_data.get("access_token", "")

        try:
            # API 호출로 삭제 처리
            response = ApiClient.delete_dashboards(dashboard_ids, access_token)

            if not response.get("success", False):
                return [
                    {
                        **app_state,
                        "alert": {
                            "message": response.get("message", "삭제에 실패했습니다."),
                            "color": "danger",
                        },
                    }
                ]

            # 모달 닫기 및 결과 표시
            updated_modals = {
                **app_state.get("modals", {}),
                "delete": {"is_open": False, "dashboard_ids": []},
            }

            return [
                {
                    **app_state,
                    "alert": {
                        "message": f"{len(dashboard_ids)}건의 항목이 삭제되었습니다.",
                        "color": "success",
                    },
                    "modals": updated_modals,
                    "reload_data": True,  # 데이터 리로드 플래그
                }
            ]

        except Exception as e:
            logger.error(f"삭제 처리 오류: {str(e)}")
            return [
                {
                    **app_state,
                    "alert": {"message": "삭제 중 오류가 발생했습니다.", "color": "danger"},
                }
            ]