# teckwah_project/main/dash/layouts/dashboard_layout.py
from dash import html, dcc, dash_table
import dash_bootstrap_components as dbc
import datetime


def create_dashboard_layout():
    """대시보드/배차 페이지 레이아웃 생성 - 1920x1080 해상도 최적화"""
    today = datetime.date.today()
    default_start_date = (today - datetime.timedelta(days=7)).strftime("%Y-%m-%d")
    default_end_date = today.strftime("%Y-%m-%d")

    return dbc.Container(
        [
            # 스토어 컴포넌트
            dcc.Store(id="app-state-store", storage_type="session"),
            dcc.Store(id="auth-store", storage_type="session"),
            dcc.Store(id="user-info-store", storage_type="session"),
            dcc.Store(id="reload-data-trigger", data={"time": datetime.datetime.now().timestamp()}),
            
            # 헤더 영역 - 1920x1080에 최적화된 크기와 간격
            dbc.Row(
                [
                    dbc.Col(
                        [
                            html.H2("배송 관제 대시보드", className="mb-3 mt-3"),
                            html.P(
                                "배송 주문 관리 및 배차 처리를 위한 대시보드입니다.",
                                className="text-muted",
                            ),
                        ],
                        lg=6,
                    ),
                    # 날짜 필터 및 검색 영역
                    dbc.Col(
                        [
                            dbc.Row(
                                [
                                    # 날짜 선택기 (ETA 기준 필터링)
                                    dbc.Col(
                                        [
                                            dbc.Label(
                                                "조회 기간 (ETA 기준)", className="fw-bold"
                                            ),
                                            html.Div(
                                                [
                                                    dcc.DatePickerRange(
                                                        id="date-picker-range",
                                                        start_date=default_start_date,
                                                        end_date=default_end_date,
                                                        display_format="YYYY-MM-DD",
                                                        className="w-100 shadow-sm",
                                                    )
                                                ],
                                                className="d-flex",
                                            ),
                                        ],
                                        md=6,
                                    ),
                                    # 주문번호 검색 필드
                                    dbc.Col(
                                        [
                                            dbc.Label(
                                                "주문번호 검색", className="fw-bold"
                                            ),
                                            dbc.InputGroup(
                                                [
                                                    dbc.Input(
                                                        id="order-search-input",
                                                        placeholder="주문번호 입력",
                                                        className="shadow-sm",
                                                    ),
                                                    dbc.InputGroupAddon(
                                                        dbc.Button(
                                                            [html.I(className="fas fa-search me-1"), "검색"],
                                                            id="order-search-button",
                                                            color="primary",
                                                            className="shadow-sm",
                                                        ),
                                                        addon_type="append",
                                                    ),
                                                ]
                                            ),
                                        ],
                                        md=6,
                                    ),
                                ],
                                className="mb-3 mt-3",
                            )
                        ],
                        lg=6,
                    ),
                ],
                className="mb-3 pb-2 border-bottom",
            ),
            
            # 액션 버튼 영역 - 더 눈에 띄는 디자인
            dbc.Row(
                [
                    dbc.Col(
                        [
                            dbc.ButtonGroup(
                                [
                                    dbc.Button(
                                        [html.I(className="fas fa-plus-circle me-1"), "신규 등록"],
                                        id="new-dashboard-button",
                                        color="success",
                                        className="me-2 shadow-sm",
                                        size="md",
                                    ),
                                    dbc.Button(
                                        [html.I(className="fas fa-truck me-1"), "배차"],
                                        id="assign-button",
                                        color="primary",
                                        className="me-2 shadow-sm",
                                        size="md",
                                    ),
                                    dbc.Button(
                                        [html.I(className="fas fa-trash-alt me-1"), "삭제"],
                                        id="delete-button",
                                        color="danger",
                                        className="me-2 shadow-sm",
                                        size="md",
                                        disabled=True,
                                    ),
                                    dbc.Button(
                                        [html.I(className="fas fa-sync-alt me-1"), "새로고침"],
                                        id="refresh-button",
                                        color="secondary",
                                        className="shadow-sm",
                                        size="md",
                                    ),
                                ]
                            )
                        ]
                    )
                ],
                className="mb-3",
            ),
            
            # 필터 영역 - 개선된 디자인
            dbc.Row(
                [
                    dbc.Col(
                        [
                            dbc.Card(
                                [
                                    dbc.CardBody(
                                        [
                                            dbc.Row(
                                                [
                                                    # 종류 필터
                                                    dbc.Col(
                                                        [
                                                            dbc.Label("종류", className="fw-bold"),
                                                            dcc.Dropdown(
                                                                id="type-filter",
                                                                options=[
                                                                    {
                                                                        "label": "전체",
                                                                        "value": "ALL",
                                                                    },
                                                                    {
                                                                        "label": "배송",
                                                                        "value": "DELIVERY",
                                                                    },
                                                                    {
                                                                        "label": "회수",
                                                                        "value": "RETURN",
                                                                    },
                                                                ],
                                                                value="ALL",
                                                                clearable=False,
                                                                className="shadow-sm",
                                                            ),
                                                        ],
                                                        md=4,
                                                    ),
                                                    # 부서 필터
                                                    dbc.Col(
                                                        [
                                                            dbc.Label("부서", className="fw-bold"),
                                                            dcc.Dropdown(
                                                                id="department-filter",
                                                                options=[
                                                                    {
                                                                        "label": "전체",
                                                                        "value": "ALL",
                                                                    },
                                                                    {
                                                                        "label": "CS",
                                                                        "value": "CS",
                                                                    },
                                                                    {
                                                                        "label": "HES",
                                                                        "value": "HES",
                                                                    },
                                                                    {
                                                                        "label": "LENOVO",
                                                                        "value": "LENOVO",
                                                                    },
                                                                ],
                                                                value="ALL",
                                                                clearable=False,
                                                                className="shadow-sm",
                                                            ),
                                                        ],
                                                        md=4,
                                                    ),
                                                    # 창고 필터
                                                    dbc.Col(
                                                        [
                                                            dbc.Label("출발 허브", className="fw-bold"),
                                                            dcc.Dropdown(
                                                                id="warehouse-filter",
                                                                options=[
                                                                    {
                                                                        "label": "전체",
                                                                        "value": "ALL",
                                                                    },
                                                                    {
                                                                        "label": "서울",
                                                                        "value": "SEOUL",
                                                                    },
                                                                    {
                                                                        "label": "부산",
                                                                        "value": "BUSAN",
                                                                    },
                                                                    {
                                                                        "label": "광주",
                                                                        "value": "GWANGJU",
                                                                    },
                                                                    {
                                                                        "label": "대전",
                                                                        "value": "DAEJEON",
                                                                    },
                                                                ],
                                                                value="ALL",
                                                                clearable=False,
                                                                className="shadow-sm",
                                                            ),
                                                        ],
                                                        md=3,
                                                    ),
                                                    # 필터 적용 버튼
                                                    dbc.Col(
                                                        [
                                                            html.Div(
                                                                dbc.Button(
                                                                    [html.I(className="fas fa-filter me-1"), "필터 적용"],
                                                                    id="apply-filter-button",
                                                                    color="primary",
                                                                    outline=True,
                                                                    className="mt-4 w-100 shadow-sm",
                                                                ),
                                                            )
                                                        ],
                                                        md=1,
                                                    ),
                                                ],
                                            ),
                                        ]
                                    ),
                                ],
                                className="mb-4 shadow-sm",
                            )
                        ]
                    )
                ]
            ),
            
            # 테이블 영역 - 시각적으로 개선된 디자인
            dbc.Row(
                [
                    dbc.Col(
                        [
                            # 로딩 표시
                            html.Div(
                                dbc.Spinner(color="primary", type="grow"),
                                id="table-loading-container",
                                className="d-none text-center my-5",
                            ),
                            
                            # 데이터 없음 표시
                            html.Div(
                                [
                                    html.Div(
                                        [
                                            html.I(className="fas fa-search fa-3x text-muted mb-3"),
                                            html.H5("데이터가 없습니다", className="text-muted"),
                                            html.P(
                                                "조회 기간을 변경하거나 필터를 조정해보세요.",
                                                className="small text-muted",
                                            ),
                                        ],
                                        className="text-center py-5"
                                    )
                                ],
                                id="empty-data-container",
                                className="d-none border rounded my-3 py-5",
                            ),
                            
                            # 대시보드 테이블 - 1920x1080에 최적화된 크기
                            dash_table.DataTable(
                                id="dashboard-table",
                                columns=[
                                    {"name": "", "id": "checkbox", "selectable": True},
                                    {"name": "주문번호", "id": "order_no"},
                                    {"name": "종류", "id": "type"},
                                    {"name": "상태", "id": "status"},
                                    {"name": "부서", "id": "department"},
                                    {"name": "창고", "id": "warehouse"},
                                    {"name": "ETA", "id": "eta"},
                                    {"name": "고객명", "id": "customer"},
                                    {"name": "지역", "id": "region"},
                                    {"name": "기사명", "id": "driver_name"},
                                ],
                                data=[],
                                style_table={
                                    "overflowX": "auto",
                                    "height": "calc(100vh - 380px)",  # 적절한 높이 설정 (1080p 화면에 맞춤)
                                    "minHeight": "550px",
                                },
                                style_cell={
                                    "fontSize": "14px",
                                    "fontFamily": "Noto Sans KR, sans-serif",
                                    "padding": "12px",
                                },
                                style_header={
                                    "backgroundColor": "#f8f9fa",
                                    "fontWeight": "bold",
                                    "textAlign": "center",
                                    "fontSize": "14px",
                                    "padding": "12px 8px",
                                    "height": "54px",
                                },
                                style_data_conditional=[
                                    {
                                        "if": {"row_index": "odd"},
                                        "backgroundColor": "rgb(248, 249, 250)",
                                    },
                                    {
                                        "if": {"filter_query": '{status} = "WAITING"'},
                                        "backgroundColor": "#ffebee",  # 연한 빨강
                                    },
                                    {
                                        "if": {
                                            "filter_query": '{status} = "IN_PROGRESS"'
                                        },
                                        "backgroundColor": "#fff8e1",  # 연한 노랑
                                    },
                                    {
                                        "if": {"filter_query": '{status} = "COMPLETE"'},
                                        "backgroundColor": "#e8f5e9",  # 연한 초록
                                    },
                                    {
                                        "if": {"filter_query": '{status} = "ISSUE"'},
                                        "backgroundColor": "#ede7f6",  # 연한 보라
                                    },
                                    {
                                        "if": {"filter_query": '{status} = "CANCEL"'},
                                        "backgroundColor": "#eceff1",  # 연한 회색
                                    },
                                ],
                                row_selectable="multi",
                                selected_rows=[],
                                page_action="none",
                                filter_action="none",
                                sort_action="native",
                                sort_mode="multi",
                            ),
                            # 로딩 상태 및 빈 데이터 표시
                            html.Div(
                                id="table-loading-container",
                                className="text-center py-5 d-none",
                                children=[
                                    dbc.Spinner(color="primary", type="grow"),
                                    html.P(
                                        "데이터를 불러오는 중입니다...",
                                        className="mt-3",
                                    ),
                                ],
                            ),
                            html.Div(
                                id="empty-data-container",
                                className="text-center py-5 d-none",
                                children=[
                                    html.I(
                                        className="fas fa-inbox fa-3x text-muted mb-3"
                                    ),
                                    html.P(
                                        "표시할 데이터가 없습니다.",
                                        className="text-muted",
                                    ),
                                ],
                            ),
                        ]
                    )
                ]
            ),
            # 모달 컴포넌트들 (컴포넌트로 분리하는 것이 좋음)
            html.Div(id="modals-container"),
        ],
        fluid=True,
    )


# 모달 내에서 사용할 필드 유효성 검증 피드백 컴포넌트 추가
def create_field_feedback_ui(field_id, className=""):
    """폼 필드 피드백 UI 컴포넌트 생성"""
    return html.Div(id=f"{field_id}-feedback", className=className)
