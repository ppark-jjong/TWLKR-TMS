# teckwah_project/main/dash/layouts/visualization_layout.py
from dash import html, dcc
import dash_bootstrap_components as dbc
import datetime


def create_visualization_layout():
    """시각화 페이지 레이아웃 생성"""
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
                            html.H2("배송 데이터 시각화", className="mb-3"),
                            html.P(
                                "배송 현황 및 시간대별 접수량 데이터를 시각화합니다.",
                                className="text-muted",
                            ),
                        ],
                        md=8,
                    ),
                    # 차트 타입 선택 및 날짜 필터
                    dbc.Col(
                        [
                            dbc.Row(
                                [
                                    # 차트 타입 선택기
                                    dbc.Col(
                                        [
                                            dbc.Label("차트 타입"),
                                            dcc.Dropdown(
                                                id="chart-type-selector",
                                                options=[
                                                    {
                                                        "label": "배송 현황",
                                                        "value": "delivery_status",
                                                    },
                                                    {
                                                        "label": "시간대별 접수량",
                                                        "value": "hourly_orders",
                                                    },
                                                ],
                                                value="delivery_status",
                                                clearable=False,
                                            ),
                                        ],
                                        md=6,
                                    ),
                                    # 날짜 범위 선택기
                                    dbc.Col(
                                        [
                                            dbc.Label("조회 기간"),
                                            dcc.DatePickerRange(
                                                id="viz-date-picker-range",
                                                start_date=default_start_date,
                                                end_date=default_end_date,
                                                display_format="YYYY-MM-DD",
                                                className="w-100",
                                            ),
                                        ],
                                        md=6,
                                    ),
                                ]
                            ),
                            # 새로고침 버튼
                            dbc.Button(
                                "새로고침",
                                id="viz-refresh-button",
                                color="secondary",
                                className="mt-3 float-end",
                            ),
                        ],
                        md=4,
                    ),
                ],
                className="mb-4",
            ),
            # 시각화 컨텐츠 영역
            html.Div(
                [
                    # 배송 현황 차트 컨테이너
                    html.Div(
                        id="delivery-status-container",
                        children=[
                            dbc.Row(
                                [
                                    # 주요 통계 카드
                                    dbc.Col(
                                        [
                                            dbc.Card(
                                                [
                                                    dbc.CardBody(
                                                        [
                                                            html.H5(
                                                                "총 배송 건수",
                                                                className="card-title text-center",
                                                            ),
                                                            html.H2(
                                                                "0",
                                                                id="total-delivery-count",
                                                                className="text-center mb-0",
                                                            ),
                                                        ]
                                                    )
                                                ],
                                                className="mb-4 shadow-sm",
                                            )
                                        ],
                                        md=4,
                                    ),
                                    dbc.Col(
                                        [
                                            dbc.Card(
                                                [
                                                    dbc.CardBody(
                                                        [
                                                            html.H5(
                                                                "대기 중 건수",
                                                                className="card-title text-center",
                                                            ),
                                                            html.H2(
                                                                "0",
                                                                id="waiting-delivery-count",
                                                                className="text-center mb-0 text-warning",
                                                            ),
                                                        ]
                                                    )
                                                ],
                                                className="mb-4 shadow-sm",
                                            )
                                        ],
                                        md=4,
                                    ),
                                    dbc.Col(
                                        [
                                            dbc.Card(
                                                [
                                                    dbc.CardBody(
                                                        [
                                                            html.H5(
                                                                "완료 건수",
                                                                className="card-title text-center",
                                                            ),
                                                            html.H2(
                                                                "0",
                                                                id="completed-delivery-count",
                                                                className="text-center mb-0 text-success",
                                                            ),
                                                        ]
                                                    )
                                                ],
                                                className="mb-4 shadow-sm",
                                            )
                                        ],
                                        md=4,
                                    ),
                                ]
                            ),
                            dbc.Row(
                                [
                                    # 배송 상태 파이 차트
                                    dbc.Col(
                                        [
                                            dbc.Card(
                                                [
                                                    dbc.CardHeader("배송 상태별 비율"),
                                                    dbc.CardBody(
                                                        [
                                                            dcc.Graph(
                                                                id="delivery-status-pie-chart",
                                                                style={
                                                                    "height": "400px"
                                                                },
                                                                config={
                                                                    "displayModeBar": False,
                                                                    "showTips": False,
                                                                },
                                                            )
                                                        ]
                                                    ),
                                                ],
                                                className="shadow-sm",
                                            )
                                        ],
                                        md=6,
                                    ),
                                    # 부서별 배송 상태 바 차트
                                    dbc.Col(
                                        [
                                            dbc.Card(
                                                [
                                                    dbc.CardHeader("부서별 배송 상태"),
                                                    dbc.CardBody(
                                                        [
                                                            dcc.Graph(
                                                                id="department-status-bar-chart",
                                                                style={
                                                                    "height": "400px"
                                                                },
                                                                config={
                                                                    "displayModeBar": False,
                                                                    "showTips": False,
                                                                },
                                                            )
                                                        ]
                                                    ),
                                                ],
                                                className="shadow-sm",
                                            )
                                        ],
                                        md=6,
                                    ),
                                ]
                            ),
                        ],
                    ),
                    # 시간대별 접수량 차트 컨테이너
                    html.Div(
                        id="hourly-orders-container",
                        className="d-none",
                        children=[
                            dbc.Row(
                                [
                                    # 주요 통계 카드
                                    dbc.Col(
                                        [
                                            dbc.Card(
                                                [
                                                    dbc.CardBody(
                                                        [
                                                            html.H5(
                                                                "총 접수 건수",
                                                                className="card-title text-center",
                                                            ),
                                                            html.H2(
                                                                "0",
                                                                id="total-orders-count",
                                                                className="text-center mb-0",
                                                            ),
                                                        ]
                                                    )
                                                ],
                                                className="mb-4 shadow-sm",
                                            )
                                        ],
                                        md=4,
                                    ),
                                    dbc.Col(
                                        [
                                            dbc.Card(
                                                [
                                                    dbc.CardBody(
                                                        [
                                                            html.H5(
                                                                "일평균 접수 건수",
                                                                className="card-title text-center",
                                                            ),
                                                            html.H2(
                                                                "0",
                                                                id="avg-orders-count",
                                                                className="text-center mb-0 text-primary",
                                                            ),
                                                        ]
                                                    )
                                                ],
                                                className="mb-4 shadow-sm",
                                            )
                                        ],
                                        md=4,
                                    ),
                                    dbc.Col(
                                        [
                                            dbc.Card(
                                                [
                                                    dbc.CardBody(
                                                        [
                                                            html.H5(
                                                                "피크 시간대",
                                                                className="card-title text-center",
                                                            ),
                                                            html.H2(
                                                                "--",
                                                                id="peak-hour",
                                                                className="text-center mb-0 text-danger",
                                                            ),
                                                        ]
                                                    )
                                                ],
                                                className="mb-4 shadow-sm",
                                            )
                                        ],
                                        md=4,
                                    ),
                                ]
                            ),
                            dbc.Row(
                                [
                                    # 시간대별 접수량 라인 차트
                                    dbc.Col(
                                        [
                                            dbc.Card(
                                                [
                                                    dbc.CardHeader("시간대별 접수량"),
                                                    dbc.CardBody(
                                                        [
                                                            dcc.Graph(
                                                                id="hourly-orders-line-chart",
                                                                style={
                                                                    "height": "400px"
                                                                },
                                                                config={
                                                                    "displayModeBar": False,
                                                                    "showTips": False,
                                                                },
                                                            )
                                                        ]
                                                    ),
                                                ],
                                                className="shadow-sm",
                                            )
                                        ],
                                        md=12,
                                    )
                                ],
                                className="mb-4",
                            ),
                            dbc.Row(
                                [
                                    # 부서별 시간대 접수량 히트맵
                                    dbc.Col(
                                        [
                                            dbc.Card(
                                                [
                                                    dbc.CardHeader(
                                                        "부서별 시간대 접수량"
                                                    ),
                                                    dbc.CardBody(
                                                        [
                                                            dcc.Graph(
                                                                id="department-hourly-heatmap",
                                                                style={
                                                                    "height": "400px"
                                                                },
                                                                config={
                                                                    "displayModeBar": False,
                                                                    "showTips": False,
                                                                },
                                                            )
                                                        ]
                                                    ),
                                                ],
                                                className="shadow-sm",
                                            )
                                        ],
                                        md=12,
                                    )
                                ]
                            ),
                        ],
                    ),
                ]
            ),
            # 로딩 상태 표시
            dbc.Spinner(
                id="viz-loading-spinner",
                color="primary",
                type="border",
                spinner_style={
                    "position": "absolute",
                    "top": "50%",
                    "left": "50%",
                    "transform": "translate(-50%, -50%)",
                    "width": "3rem",
                    "height": "3rem",
                },
            ),
        ],
        fluid=True,
    )
