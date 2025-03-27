# teckwah_project/main/dash/layouts/visualization_layout.py
from dash import html, dcc
import dash_bootstrap_components as dbc
import datetime


def create_visualization_layout():
    """시각화 페이지 레이아웃 생성 - 1920x1080 해상도 최적화"""
    today = datetime.date.today()
    default_start_date = (today - datetime.timedelta(days=7)).strftime("%Y-%m-%d")
    default_end_date = today.strftime("%Y-%m-%d")

    return dbc.Container(
        [
            # 헤더 영역 - 더 눈에 띄게 개선
            dbc.Row(
                [
                    dbc.Col(
                        [
                            html.H2("배송 데이터 시각화", className="mb-3 mt-3"),
                            html.P(
                                "배송 현황 및 시간대별 접수량 데이터를 시각화합니다.",
                                className="text-muted",
                            ),
                        ],
                        md=8,
                    ),
                    # 차트 타입 선택 및 날짜 필터 - 더 직관적인 UI로 개선
                    dbc.Col(
                        [
                            dbc.Row(
                                [
                                    # 차트 타입 선택기 - 1920x1080에 맞게 크기 조정
                                    dbc.Col(
                                        [
                                            dbc.Label("차트 타입", className="fw-bold"),
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
                                                className="shadow-sm",
                                            ),
                                        ],
                                        md=6,
                                    ),
                                    # 날짜 범위 선택기 - 1920x1080에 맞게 크기 조정
                                    dbc.Col(
                                        [
                                            dbc.Label("조회 기간", className="fw-bold"),
                                            dcc.DatePickerRange(
                                                id="viz-date-picker-range",
                                                start_date=default_start_date,
                                                end_date=default_end_date,
                                                display_format="YYYY-MM-DD",
                                                className="w-100 shadow-sm",
                                            ),
                                        ],
                                        md=6,
                                    ),
                                ],
                                className="mt-3"
                            ),
                            # 새로고침 버튼 - 더 시각적으로 눈에 띄게 개선
                            dbc.Button(
                                [html.I(className="fas fa-sync-alt me-2"), "새로고침"],
                                id="viz-refresh-button",
                                color="primary",
                                className="mt-3 float-end shadow-sm",
                                size="md",
                            ),
                        ],
                        md=4,
                    ),
                ],
                className="mb-4 pb-2 border-bottom",
            ),
            
            # 로딩 스피너 - 시각적 피드백 강화
            dbc.Spinner(
                id="viz-loading-spinner",
                color="primary",
                type="grow",
                fullscreen=False,
                style={"display": "none", "position": "fixed", "top": "50%", "left": "50%"},
            ),
            
            # 시각화 컨텐츠 영역 - 1920x1080에 최적화된 크기로 조정
            html.Div(
                [
                    # 배송 현황 차트 컨테이너 - 더 선명한 시각적 표현
                    html.Div(
                        id="delivery-status-container",
                        children=[
                            dbc.Row(
                                [
                                    # 주요 통계 카드 - 시각성 향상
                                    dbc.Col(
                                        [
                                            dbc.Card(
                                                [
                                                    dbc.CardBody(
                                                        [
                                                            html.H5(
                                                                "총 배송 건수",
                                                                className="card-title text-center fw-bold",
                                                            ),
                                                            html.H2(
                                                                "0",
                                                                id="total-delivery-count",
                                                                className="text-center mb-0 fw-bold text-primary",
                                                            ),
                                                        ]
                                                    )
                                                ],
                                                className="mb-4 shadow-sm border-primary border-top border-3",
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
                                                                className="card-title text-center fw-bold",
                                                            ),
                                                            html.H2(
                                                                "0",
                                                                id="waiting-delivery-count",
                                                                className="text-center mb-0 fw-bold text-warning",
                                                            ),
                                                        ]
                                                    )
                                                ],
                                                className="mb-4 shadow-sm border-warning border-top border-3",
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
                                                                className="card-title text-center fw-bold",
                                                            ),
                                                            html.H2(
                                                                "0",
                                                                id="completed-delivery-count",
                                                                className="text-center mb-0 fw-bold text-success",
                                                            ),
                                                        ]
                                                    )
                                                ],
                                                className="mb-4 shadow-sm border-success border-top border-3",
                                            )
                                        ],
                                        md=4,
                                    ),
                                ]
                            ),
                            dbc.Row(
                                [
                                    # 배송 상태 파이 차트 - 고해상도에 최적화된 크기로 조정
                                    dbc.Col(
                                        [
                                            dbc.Card(
                                                [
                                                    dbc.CardHeader(
                                                        html.H5("배송 상태별 비율", className="fw-bold mb-0"),
                                                        className="bg-light"
                                                    ),
                                                    dbc.CardBody(
                                                        [
                                                            dcc.Graph(
                                                                id="delivery-status-pie-chart",
                                                                style={
                                                                    "height": "500px"
                                                                },
                                                                config={
                                                                    "displayModeBar": True,
                                                                    "showTips": True,
                                                                    "responsive": True,
                                                                },
                                                            )
                                                        ]
                                                    ),
                                                ],
                                                className="shadow-sm h-100",
                                            )
                                        ],
                                        md=6,
                                    ),
                                    # 부서별 배송 상태 바 차트 - 고해상도에 최적화된 크기로 조정
                                    dbc.Col(
                                        [
                                            dbc.Card(
                                                [
                                                    dbc.CardHeader(
                                                        html.H5("부서별 배송 상태", className="fw-bold mb-0"),
                                                        className="bg-light"
                                                    ),
                                                    dbc.CardBody(
                                                        [
                                                            dcc.Graph(
                                                                id="department-status-bar-chart",
                                                                style={
                                                                    "height": "500px"
                                                                },
                                                                config={
                                                                    "displayModeBar": True,
                                                                    "showTips": True,
                                                                    "responsive": True,
                                                                },
                                                            )
                                                        ]
                                                    ),
                                                ],
                                                className="shadow-sm h-100",
                                            )
                                        ],
                                        md=6,
                                    ),
                                ],
                                className="g-4 mb-4"
                            ),
                        ],
                        className="mb-4",
                    ),
                    # 시간대별 접수량 차트 컨테이너
                    html.Div(
                        id="hourly-orders-container",
                        children=[
                            dbc.Row(
                                [
                                    # 주요 통계 카드 - 시각성 향상
                                    dbc.Col(
                                        [
                                            dbc.Card(
                                                [
                                                    dbc.CardBody(
                                                        [
                                                            html.H5(
                                                                "총 접수 건수",
                                                                className="card-title text-center fw-bold",
                                                            ),
                                                            html.H2(
                                                                "0",
                                                                id="total-orders-count",
                                                                className="text-center mb-0 fw-bold text-primary",
                                                            ),
                                                        ]
                                                    )
                                                ],
                                                className="mb-4 shadow-sm border-primary border-top border-3",
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
                                                                className="card-title text-center fw-bold",
                                                            ),
                                                            html.H2(
                                                                "0",
                                                                id="avg-orders-count",
                                                                className="text-center mb-0 fw-bold text-info",
                                                            ),
                                                        ]
                                                    )
                                                ],
                                                className="mb-4 shadow-sm border-info border-top border-3",
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
                                                                className="card-title text-center fw-bold",
                                                            ),
                                                            html.H2(
                                                                "00:00",
                                                                id="peak-hour",
                                                                className="text-center mb-0 fw-bold text-danger",
                                                            ),
                                                        ]
                                                    )
                                                ],
                                                className="mb-4 shadow-sm border-danger border-top border-3",
                                            )
                                        ],
                                        md=4,
                                    ),
                                ]
                            ),
                            dbc.Row(
                                [
                                    # 시간대별 접수량 라인 차트 - 고해상도에 최적화된 크기로 조정
                                    dbc.Col(
                                        [
                                            dbc.Card(
                                                [
                                                    dbc.CardHeader(
                                                        html.H5("시간대별 접수량", className="fw-bold mb-0"),
                                                        className="bg-light"
                                                    ),
                                                    dbc.CardBody(
                                                        [
                                                            dcc.Graph(
                                                                id="hourly-orders-line-chart",
                                                                style={
                                                                    "height": "500px"
                                                                },
                                                                config={
                                                                    "displayModeBar": True,
                                                                    "showTips": True,
                                                                    "responsive": True,
                                                                },
                                                            )
                                                        ]
                                                    ),
                                                ],
                                                className="shadow-sm h-100",
                                            )
                                        ],
                                        md=6,
                                    ),
                                    # 부서별 시간대 접수량 히트맵 - 고해상도에 최적화된 크기로 조정
                                    dbc.Col(
                                        [
                                            dbc.Card(
                                                [
                                                    dbc.CardHeader(
                                                        html.H5("부서별 시간대 접수량", className="fw-bold mb-0"),
                                                        className="bg-light"
                                                    ),
                                                    dbc.CardBody(
                                                        [
                                                            dcc.Graph(
                                                                id="department-hourly-heatmap",
                                                                style={
                                                                    "height": "500px"
                                                                },
                                                                config={
                                                                    "displayModeBar": True,
                                                                    "showTips": True,
                                                                    "responsive": True,
                                                                },
                                                            )
                                                        ]
                                                    ),
                                                ],
                                                className="shadow-sm h-100",
                                            )
                                        ],
                                        md=6,
                                    ),
                                ],
                                className="g-4 mb-4"
                            ),
                        ],
                        className="mb-4 d-none",
                    ),
                ]
            ),
        ],
        fluid=True,
    )
