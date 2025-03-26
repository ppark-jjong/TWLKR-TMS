# teckwah_project/main/dash/components/modals.py
from dash import html, dcc
import dash_bootstrap_components as dbc

def create_detail_modal(dashboard_data=None, is_locked=False, lock_info=None):
    """대시보드 상세 정보 모달 생성"""
    if not dashboard_data:
        dashboard_data = {}
    
    # 상태에 따른 색상 설정
    status_colors = {
        "WAITING": "warning",
        "IN_PROGRESS": "primary",
        "COMPLETE": "success",
        "ISSUE": "danger",
        "CANCEL": "secondary"
    }
    
    # 상태 텍스트 변환
    status_texts = {
        "WAITING": "대기",
        "IN_PROGRESS": "진행 중",
        "COMPLETE": "완료",
        "ISSUE": "이슈",
        "CANCEL": "취소"
    }
    
    # 현재 상태 정보
    current_status = dashboard_data.get("status", "WAITING")
    status_color = status_colors.get(current_status, "secondary")
    status_text = status_texts.get(current_status, "알 수 없음")
    
    # 메모 정보
    remarks = dashboard_data.get("remarks", [])
    remark_content = remarks[0].get("content", "") if remarks else ""
    remark_id = remarks[0].get("remark_id", 0) if remarks else 0
    
    # 락 정보 표시 영역
    lock_display = html.Div(
        [
            dbc.Alert(
                [
                    html.I(className="fas fa-lock me-2"),
                    f"현재 {lock_info.get('locked_by', '다른 사용자')}님이 작업 중입니다. ({lock_info.get('lock_type', '알 수 없음')} 작업)"
                ],
                color="warning",
                className="mb-3"
            )
        ] if is_locked and lock_info else []
    )
    
    # 모달 생성
    modal = dbc.Modal(
        [
            dbc.ModalHeader(
                dbc.ModalTitle(f"주문 상세 정보 - {dashboard_data.get('order_no', '')}")
            ),
            dbc.ModalBody(
                [
                    # 락 정보 표시 영역
                    lock_display,
                    
                    # 상세 정보 표시 탭
                    dbc.Tabs(
                        [
                            # 기본 정보 탭
                            dbc.Tab(
                                [
                                    dbc.Row(
                                        [
                                            # 좌측 컬럼 - 주문 기본 정보
                                            dbc.Col(
                                                [
                                                    dbc.Card(
                                                        [
                                                            dbc.CardHeader("주문 정보"),
                                                            dbc.CardBody(
                                                                [
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("주문번호:"), width=4),
                                                                            dbc.Col(dashboard_data.get("order_no", ""), width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("종류:"), width=4),
                                                                            dbc.Col(
                                                                                "배송" if dashboard_data.get("type") == "DELIVERY" else "회수", 
                                                                                width=8
                                                                            )
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("상태:"), width=4),
                                                                            dbc.Col(
                                                                                dbc.Badge(
                                                                                    status_text,
                                                                                    color=status_color,
                                                                                    className="py-1 px-2"
                                                                                ),
                                                                                width=8
                                                                            )
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("부서:"), width=4),
                                                                            dbc.Col(dashboard_data.get("department", ""), width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("창고:"), width=4),
                                                                            dbc.Col(dashboard_data.get("warehouse", ""), width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("SLA:"), width=4),
                                                                            dbc.Col(dashboard_data.get("sla", ""), width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                ]
                                                            )
                                                        ],
                                                        className="h-100"
                                                    )
                                                ],
                                                md=6,
                                                className="mb-3"
                                            ),
                                            
                                            # 우측 컬럼 - 시간 정보
                                            dbc.Col(
                                                [
                                                    dbc.Card(
                                                        [
                                                            dbc.CardHeader("시간 정보"),
                                                            dbc.CardBody(
                                                                [
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("ETA:"), width=4),
                                                                            dbc.Col(dashboard_data.get("eta", ""), width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("생성시간:"), width=4),
                                                                            dbc.Col(dashboard_data.get("create_time", ""), width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("출발시간:"), width=4),
                                                                            dbc.Col(dashboard_data.get("depart_time", "-"), width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("완료시간:"), width=4),
                                                                            dbc.Col(dashboard_data.get("complete_time", "-"), width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                ]
                                                            )
                                                        ],
                                                        className="h-100"
                                                    )
                                                ],
                                                md=6,
                                                className="mb-3"
                                            )
                                        ]
                                    ),
                                    
                                    dbc.Row(
                                        [
                                            # 좌측 컬럼 - 고객 정보
                                            dbc.Col(
                                                [
                                                    dbc.Card(
                                                        [
                                                            dbc.CardHeader("고객 정보"),
                                                            dbc.CardBody(
                                                                [
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("고객명:"), width=4),
                                                                            dbc.Col(dashboard_data.get("customer", ""), width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("연락처:"), width=4),
                                                                            dbc.Col(dashboard_data.get("contact", "-"), width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("우편번호:"), width=4),
                                                                            dbc.Col(dashboard_data.get("postal_code", ""), width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("지역:"), width=4),
                                                                            dbc.Col(dashboard_data.get("region", ""), width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("주소:"), width=4),
                                                                            dbc.Col(dashboard_data.get("address", ""), width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                ]
                                                            )
                                                        ],
                                                        className="h-100"
                                                    )
                                                ],
                                                md=6,
                                                className="mb-3"
                                            ),
                                            
                                            # 우측 컬럼 - 배송 정보
                                            dbc.Col(
                                                [
                                                    dbc.Card(
                                                        [
                                                            dbc.CardHeader("배송 정보"),
                                                            dbc.CardBody(
                                                                [
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("거리:"), width=4),
                                                                            dbc.Col(f"{dashboard_data.get('distance', 0)} km", width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("소요시간:"), width=4),
                                                                            dbc.Col(f"{dashboard_data.get('duration_time', 0)} 분", width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("기사명:"), width=4),
                                                                            dbc.Col(dashboard_data.get("driver_name", "-"), width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                    dbc.Row(
                                                                        [
                                                                            dbc.Col(html.Strong("기사연락처:"), width=4),
                                                                            dbc.Col(dashboard_data.get("driver_contact", "-"), width=8)
                                                                        ],
                                                                        className="mb-2"
                                                                    ),
                                                                ]
                                                            )
                                                        ],
                                                        className="h-100"
                                                    )
                                                ],
                                                md=6,
                                                className="mb-3"
                                            )
                                        ]
                                    ),
                                    
                                    # 메모 영역
                                    dbc.Card(
                                        [
                                            dbc.CardHeader("메모"),
                                            dbc.CardBody(
                                                [
                                                    dbc.Textarea(
                                                        id="remark-textarea",
                                                        value=remark_content,
                                                        placeholder="메모를 입력하세요",
                                                        style={"height": "120px"},
                                                        className="mb-2",
                                                        disabled=is_locked
                                                    ),
                                                    html.Div(
                                                        [
                                                            dbc.Button(
                                                                "메모 저장",
                                                                id="save-remark-button",
                                                                color="primary",
                                                                size="sm",
                                                                className="float-end",
                                                                disabled=is_locked
                                                            ),
                                                            # 메모 ID를 hidden input으로 저장
                                                            dbc.Input(id="remark-id-input", type="hidden", value=remark_id),
                                                            # 대시보드 ID를 hidden input으로 저장
                                                            dbc.Input(id="dashboard-id-input", type="hidden", value=dashboard_data.get("dashboard_id", 0))
                                                        ]
                                                    )
                                                ]
                                            )
                                        ],
                                        className="mb-3"
                                    ),
                                    
                                    # 상태 변경 버튼 영역
                                    html.Div(
                                        [
                                            html.H6("상태 변경", className="mb-3"),
                                            html.Div(
                                                [
                                                    dbc.Button(
                                                        "대기", id="status-waiting-button", 
                                                        color="warning", className="me-2 mb-2",
                                                        disabled=is_locked or current_status == "WAITING"
                                                    ),
                                                    dbc.Button(
                                                        "진행 중", id="status-inprogress-button", 
                                                        color="primary", className="me-2 mb-2",
                                                        disabled=is_locked or current_status == "IN_PROGRESS"
                                                    ),
                                                    dbc.Button(
                                                        "완료", id="status-complete-button", 
                                                        color="success", className="me-2 mb-2",
                                                        disabled=is_locked or current_status == "COMPLETE"
                                                    ),
                                                    dbc.Button(
                                                        "이슈", id="status-issue-button", 
                                                        color="danger", className="me-2 mb-2",
                                                        disabled=is_locked or current_status == "ISSUE"
                                                    ),
                                                    dbc.Button(
                                                        "취소", id="status-cancel-button", 
                                                        color="secondary", className="me-2 mb-2",
                                                        disabled=is_locked or current_status == "CANCEL"
                                                    )
                                                ],
                                                className="mb-3"
                                            )
                                        ]
                                    )
                                ],
                                label="기본 정보",
                                tab_id="tab-basic-info"
                            ),
                            
                            # 편집 탭
                            dbc.Tab(
                                [
                                    dbc.Form(
                                        [
                                            dbc.Row(
                                                [
                                                    dbc.Col(
                                                        [
                                                            dbc.FormGroup(
                                                                [
                                                                    dbc.Label("ETA", html_for="eta-input"),
                                                                    dbc.Input(
                                                                        type="datetime-local",
                                                                        id="eta-input",
                                                                        value=dashboard_data.get("eta", "").replace("Z", ""),
                                                                        disabled=is_locked
                                                                    )
                                                                ],
                                                                className="mb-3"
                                                            )
                                                        ],
                                                        md=6
                                                    ),
                                                    dbc.Col(
                                                        [
                                                            dbc.FormGroup(
                                                                [
                                                                    dbc.Label("고객명", html_for="customer-input"),
                                                                    dbc.Input(
                                                                        type="text",
                                                                        id="customer-input",
                                                                        value=dashboard_data.get("customer", ""),
                                                                        disabled=is_locked
                                                                    )
                                                                ],
                                                                className="mb-3"
                                                            )
                                                        ],
                                                        md=6
                                                    )
                                                ]
                                            ),
                                            dbc.Row(
                                                [
                                                    dbc.Col(
                                                        [
                                                            dbc.FormGroup(
                                                                [
                                                                    dbc.Label("연락처", html_for="contact-input"),
                                                                    dbc.Input(
                                                                        type="text",
                                                                        id="contact-input",
                                                                        value=dashboard_data.get("contact", ""),
                                                                        disabled=is_locked
                                                                    )
                                                                ],
                                                                className="mb-3"
                                                            )
                                                        ],
                                                        md=6
                                                    ),
                                                    dbc.Col(
                                                        [
                                                            dbc.FormGroup(
                                                                [
                                                                    dbc.Label("우편번호", html_for="postal-code-input"),
                                                                    dbc.Input(
                                                                        type="text",
                                                                        id="postal-code-input",
                                                                        value=dashboard_data.get("postal_code", ""),
                                                                        disabled=is_locked
                                                                    )
                                                                ],
                                                                className="mb-3"
                                                            )
                                                        ],
                                                        md=6
                                                    )
                                                ]
                                            ),
                                            dbc.FormGroup(
                                                [
                                                    dbc.Label("주소", html_for="address-input"),
                                                    dbc.Textarea(
                                                        id="address-input",
                                                        value=dashboard_data.get("address", ""),
                                                        style={"height": "100px"},
                                                        disabled=is_locked
                                                    )
                                                ],
                                                className="mb-3"
                                            ),
                                            html.Div(
                                                [
                                                    dbc.Button(
                                                        "저장", id="save-fields-button", color="primary", 
                                                        className="me-2", disabled=is_locked
                                                    ),
                                                    dbc.Button(
                                                        "취소", id="cancel-edit-button", color="secondary"
                                                    )
                                                ],
                                                className="d-flex justify-content-end"
                                            )
                                        ]
                                    )
                                ],
                                label="정보 편집",
                                tab_id="tab-edit"
                            )
                        ],
                        id="detail-tabs",
                        active_tab="tab-basic-info"
                    )
                ]
            ),
            dbc.ModalFooter(
                dbc.Button("닫기", id="close-detail-modal-button", className="ms-auto")
            ),
        ],
        id="detail-modal",
        size="lg",
        backdrop="static",
    )
    
    return modal

def create_assign_modal():
    """배차 모달 생성"""
    return dbc.Modal(
        [
            dbc.ModalHeader(dbc.ModalTitle("배차 처리")),
            dbc.ModalBody(
                [
                    dbc.Form(
                        [
                            dbc.FormGroup(
                                [
                                    dbc.Label("기사명", html_for="driver-name-input"),
                                    dbc.Input(
                                        type="text",
                                        id="driver-name-input",
                                        placeholder="기사명을 입력하세요",
                                        className="mb-3"
                                    )
                                ]
                            ),
                            dbc.FormGroup(
                                [
                                    dbc.Label("연락처", html_for="driver-contact-input"),
                                    dbc.Input(
                                        type="text",
                                        id="driver-contact-input",
                                        placeholder="연락처를 입력하세요",
                                        className="mb-3"
                                    )
                                ]
                            ),
                            html.Div(id="selected-orders-info", className="mb-3")
                        ]
                    )
                ]
            ),
            dbc.ModalFooter(
                [
                    dbc.Button("취소", id="cancel-assign-button", color="secondary", className="me-2"),
                    dbc.Button("배차 완료", id="confirm-assign-button", color="primary")
                ]
            )
        ],
        id="assign-modal",
        backdrop="static"
    )

def create_delete_confirm_modal():
    """삭제 확인 모달 생성"""
    return dbc.Modal(
        [
            dbc.ModalHeader(dbc.ModalTitle("삭제 확인")),
            dbc.ModalBody(
                [
                    html.P("선택한 항목을 삭제하시겠습니까?", className="lead"),
                    html.P("이 작업은 되돌릴 수 없습니다.", className="text-danger"),
                    html.Div(id="delete-orders-info", className="mb-3")
                ]
            ),
            dbc.ModalFooter(
                [
                    dbc.Button("취소", id="cancel-delete-button", color="secondary", className="me-2"),
                    dbc.Button("삭제", id="confirm-delete-button", color="danger")
                ]
            )
        ],
        id="delete-confirm-modal",
        backdrop="static"
    )

def create_new_dashboard_modal():
    """새 대시보드 생성 모달"""
    return dbc.Modal(
        [
            dbc.ModalHeader(dbc.ModalTitle("신규 배송 등록")),
            dbc.ModalBody(
                [
                    dbc.Form(
                        [
                            dbc.Row(
                                [
                                    dbc.Col(
                                        [
                                            dbc.FormGroup(
                                                [
                                                    dbc.Label("주문번호", html_for="new-order-no-input"),
                                                    dbc.Input(
                                                        type="text",
                                                        id="new-order-no-input",
                                                        placeholder="주문번호를 입력하세요",
                                                        className="mb-3"
                                                    )
                                                ]
                                            )
                                        ],
                                        md=6
                                    ),
                                    dbc.Col(
                                        [
                                            dbc.FormGroup(
                                                [
                                                    dbc.Label("종류", html_for="new-type-input"),
                                                    dcc.Dropdown(
                                                        id="new-type-input",
                                                        options=[
                                                            {"label": "배송", "value": "DELIVERY"},
                                                            {"label": "회수", "value": "RETURN"}
                                                        ],
                                                        value="DELIVERY",
                                                        clearable=False,
                                                        className="mb-3"
                                                    )
                                                ]
                                            )
                                        ],
                                        md=6
                                    )
                                ]
                            ),
                            dbc.Row(
                                [
                                    dbc.Col(
                                        [
                                            dbc.FormGroup(
                                                [
                                                    dbc.Label("창고", html_for="new-warehouse-input"),
                                                    dcc.Dropdown(
                                                        id="new-warehouse-input",
                                                        options=[
                                                            {"label": "서울", "value": "SEOUL"},
                                                            {"label": "부산", "value": "BUSAN"},
                                                            {"label": "광주", "value": "GWANGJU"},
                                                            {"label": "대전", "value": "DAEJEON"}
                                                        ],
                                                        value="SEOUL",
                                                        clearable=False,
                                                        className="mb-3"
                                                    )
                                                ]
                                            )
                                        ],
                                        md=6
                                    ),
                                    dbc.Col(
                                        [
                                            dbc.FormGroup(
                                                [
                                                    dbc.Label("SLA", html_for="new-sla-input"),
                                                    dbc.Input(
                                                        type="text",
                                                        id="new-sla-input",
                                                        placeholder="SLA 정보를 입력하세요",
                                                        value="당일배송",
                                                        className="mb-3"
                                                    )
                                                ]
                                            )
                                        ],
                                        md=6
                                    )
                                ]
                            ),
                            dbc.FormGroup(
                                [
                                    dbc.Label("ETA", html_for="new-eta-input"),
                                    dbc.Input(
                                        type="datetime-local",
                                        id="new-eta-input",
                                        className="mb-3"
                                    )
                                ]
                            ),
                            dbc.Row(
                                [
                                    dbc.Col(
                                        [
                                            dbc.FormGroup(
                                                [
                                                    dbc.Label("고객명", html_for="new-customer-input"),
                                                    dbc.Input(
                                                        type="text",
                                                        id="new-customer-input",
                                                        placeholder="고객명을 입력하세요",
                                                        className="mb-3"
                                                    )
                                                ]
                                            )
                                        ],
                                        md=6
                                    ),
                                    dbc.Col(
                                        [
                                            dbc.FormGroup(
                                                [
                                                    dbc.Label("연락처", html_for="new-contact-input"),
                                                    dbc.Input(
                                                        type="text",
                                                        id="new-contact-input",
                                                        placeholder="연락처를 입력하세요",
                                                        className="mb-3"
                                                    )
                                                ]
                                            )
                                        ],
                                        md=6
                                    )
                                ]
                            ),
                            dbc.FormGroup(
                                [
                                    dbc.Label("우편번호", html_for="new-postal-code-input"),
                                    dbc.Input(
                                        type="text",
                                        id="new-postal-code-input",
                                        placeholder="우편번호를 입력하세요",
                                        className="mb-3"
                                    )
                                ]
                            ),
                            dbc.FormGroup(
                                [
                                    dbc.Label("주소", html_for="new-address-input"),
                                    dbc.Textarea(
                                        id="new-address-input",
                                        placeholder="주소를 입력하세요",
                                        style={"height": "100px"},
                                        className="mb-3"
                                    )
                                ]
                            )
                        ]
                    )
                ]
            ),
            dbc.ModalFooter(
                [
                    dbc.Button("취소", id="cancel-new-dashboard-button", color="secondary", className="me-2"),
                    dbc.Button("등록", id="confirm-new-dashboard-button", color="success")
                ]
            )
        ],
        id="new-dashboard-modal",
        size="lg",
        backdrop="static"
    )