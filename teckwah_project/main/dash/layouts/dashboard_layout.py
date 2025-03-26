# teckwah_project/main/dash/layouts/dashboard_layout.py
from dash import html, dcc, dash_table
import dash_bootstrap_components as dbc
import datetime


def create_dashboard_layout():
    """대시보드/배차 페이지 레이아웃 생성"""
    today = datetime.date.today()
    default_start_date = (today - datetime.timedelta(days=7)).strftime("%Y-%m-%d")
    default_end_date = today.strftime("%Y-%m-%d")

    return dbc.Container(
        [
            # 헤더 영역
            dbc.Row(
                [
                    dbc.Col(
                        [
                            html.H2("배송 관제 대시보드", className="mb-3"),
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
                                                "조회 기간 (ETA 기준)", className="mr-2"
                                            ),
                                            html.Div(
                                                [
                                                    dcc.DatePickerRange(
                                                        id="date-picker-range",
                                                        start_date=default_start_date,
                                                        end_date=default_end_date,
                                                        display_format="YYYY-MM-DD",
                                                        className="w-100",
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
                                                "주문번호 검색", className="mr-2"
                                            ),
                                            dbc.InputGroup(
                                                [
                                                    dbc.Input(
                                                        id="order-search-input",
                                                        placeholder="주문번호 입력",
                                                    ),
                                                    dbc.InputGroupAddon(
                                                        dbc.Button(
                                                            "검색",
                                                            id="order-search-button",
                                                            color="primary",
                                                        ),
                                                        addon_type="append",
                                                    ),
                                                ]
                                            ),
                                        ],
                                        md=6,
                                    ),
                                ],
                                className="mb-3",
                            )
                        ],
                        lg=6,
                    ),
                ],
                className="mb-4",
            ),
            # 액션 버튼 영역
            dbc.Row(
                [
                    dbc.Col(
                        [
                            dbc.ButtonGroup(
                                [
                                    dbc.Button(
                                        "신규 등록",
                                        id="new-dashboard-button",
                                        color="success",
                                        className="mr-2",
                                    ),
                                    dbc.Button(
                                        "배차",
                                        id="assign-button",
                                        color="primary",
                                        className="mr-2",
                                    ),
                                    dbc.Button(
                                        "삭제",
                                        id="delete-button",
                                        color="danger",
                                        className="mr-2",
                                        disabled=True,
                                    ),
                                    dbc.Button(
                                        "새로고침",
                                        id="refresh-button",
                                        color="secondary",
                                    ),
                                ]
                            )
                        ]
                    )
                ],
                className="mb-3",
            ),
            # 필터 영역
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
                                                            dbc.Label("종류"),
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
                                                            ),
                                                        ],
                                                        md=3,
                                                    ),
                                                    # 부서 필터
                                                    dbc.Col(
                                                        [
                                                            dbc.Label("부서"),
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
                                                            ),
                                                        ],
                                                        md=3,
                                                    ),
                                                    # 창고 필터
                                                    dbc.Col(
                                                        [
                                                            dbc.Label("출발 허브"),
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
                                                            ),
                                                        ],
                                                        md=3,
                                                    ),
                                                    # 필터 버튼
                                                    dbc.Col(
                                                        [
                                                            html.Div(
                                                                [
                                                                    dbc.Button(
                                                                        "필터 적용",
                                                                        id="apply-filter-button",
                                                                        color="primary",
                                                                        className="mr-2",
                                                                    ),
                                                                    dbc.Button(
                                                                        "초기화",
                                                                        id="reset-filter-button",
                                                                        color="secondary",
                                                                    ),
                                                                ],
                                                                className="d-flex align-items-end h-100",
                                                            )
                                                        ],
                                                        md=3,
                                                    ),
                                                ]
                                            )
                                        ]
                                    )
                                ]
                            )
                        ]
                    )
                ],
                className="mb-4",
            ),
            # 테이블 영역
            dbc.Row(
                [
                    dbc.Col(
                        [
                            dash_table.DataTable(
                                id="dashboard-table",
                                columns=[
                                    {
                                        "name": "",
                                        "id": "select",
                                        "selectable": True,
                                        "presentation": "checkbox",
                                    },
                                    {"name": "No.", "id": "dashboard_id"},
                                    {"name": "주문번호", "id": "order_no"},
                                    {"name": "종류", "id": "type"},
                                    {"name": "상태", "id": "status"},
                                    {"name": "부서", "id": "department"},
                                    {"name": "창고", "id": "warehouse"},
                                    {"name": "ETA", "id": "eta"},
                                    {"name": "생성시간", "id": "create_time"},
                                    {"name": "고객명", "id": "customer"},
                                    {"name": "지역", "id": "region"},
                                    {"name": "배송담당자", "id": "driver_name"},
                                ],
                                page_size=50,
                                style_table={"overflowX": "auto"},
                                style_cell={
                                    "textAlign": "left",
                                    "padding": "10px",
                                    "whiteSpace": "normal",
                                    "height": "auto",
                                },
                                style_header={
                                    "backgroundColor": "white",
                                    "fontWeight": "bold",
                                    "textAlign": "center",
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
