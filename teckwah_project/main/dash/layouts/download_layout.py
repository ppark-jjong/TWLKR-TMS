# teckwah_project/main/dash/layouts/download_layout.py
from dash import html, dcc
import dash_bootstrap_components as dbc
import datetime

def create_download_layout():
    """다운로드 페이지 레이아웃 생성 (관리자 전용)"""
    today = datetime.date.today()
    default_start_date = (today - datetime.timedelta(days=7)).strftime('%Y-%m-%d')
    default_end_date = today.strftime('%Y-%m-%d')
    
    return dbc.Container([
        # 헤더 영역 - 개선된 UI
        dbc.Row([
            dbc.Col([
                html.H2("데이터 다운로드", className="mb-3 mt-3 text-primary"),
                html.P("배송 데이터를 Excel 형식으로 다운로드합니다. (관리자 전용 기능)", className="text-muted")
            ])
        ], className="mb-4 pb-2 border-bottom"),
        
        # 관리자 권한 확인 영역 - 더 눈에 띄게 표시
        html.Div(id="admin-check-container", className="mb-4"),
        
        # 날짜 선택 및 다운로드 영역 - 모던한 UI
        dbc.Row([
            dbc.Col([
                dbc.Card([
                    dbc.CardHeader([
                        html.H5("다운로드 설정", className="mb-0 fw-bold"),
                    ], className="bg-light"),
                    dbc.CardBody([
                        dbc.Row([
                            # 날짜 범위 선택기 - 개선된 UI
                            dbc.Col([
                                dbc.Label("조회 기간", className="fw-bold"),
                                dcc.DatePickerRange(
                                    id='download-date-picker-range',
                                    start_date=default_start_date,
                                    end_date=default_end_date,
                                    display_format='YYYY-MM-DD',
                                    className="w-100 mb-3 shadow-sm"
                                ),
                                # 다운로드 가능 기간 안내 - 더 눈에 띄는 스타일
                                dbc.Alert(
                                    html.Div(id="download-date-range-info", className="mb-0"),
                                    color="info",
                                    className="mb-3 py-2 small"
                                )
                            ], md=8),
                            
                            # 다운로드 버튼 영역 - 개선된 UI
                            dbc.Col([
                                html.Div([
                                    dbc.Button(
                                        [
                                            html.I(className="fas fa-file-excel me-2"),
                                            "Excel 다운로드"
                                        ],
                                        id="download-excel-button",
                                        color="success",
                                        className="w-100 shadow-sm",
                                        size="lg"
                                    ),
                                    html.Div(
                                        "다운로드를 시작하려면 클릭하세요",
                                        className="text-muted small text-center mt-2"
                                    ),
                                    # 다운로드 컴포넌트
                                    dcc.Download(id="download-excel")
                                ], className="d-flex flex-column justify-content-center h-100")
                            ], md=4)
                        ])
                    ])
                ], className="shadow")
            ], md=10, lg=8, className="mx-auto")
        ]),
        
        # 유의사항 섹션 추가
        dbc.Row([
            dbc.Col([
                dbc.Card([
                    dbc.CardHeader([
                        html.H6("다운로드 유의사항", className="mb-0"),
                    ], className="bg-light"),
                    dbc.CardBody([
                        html.Ul([
                            html.Li("최대 3개월 이내의 데이터만 다운로드할 수 있습니다."),
                            html.Li("대용량 데이터의 경우 다운로드에 시간이 걸릴 수 있습니다."),
                            html.Li("생성된 Excel 파일에는 조회 기간 내의 모든 배송 데이터가 포함됩니다."),
                            html.Li("필요한 경우 여러 번 나누어 다운로드해 주세요."),
                        ], className="mb-0 small")
                    ])
                ], className="shadow-sm mt-4 border-warning border-left border-3")
            ], md=10, lg=8, className="mx-auto")
        ]),
        
        # 로딩 상태 표시 - 향상된 스타일
        dbc.Spinner(
            id="download-loading-spinner",
            color="primary",
            type="border",
            fullscreen=False,
            spinner_style={
                "position": "fixed",
                "top": "50%",
                "left": "50%",
                "transform": "translate(-50%, -50%)",
                "width": "5rem",
                "height": "5rem",
                "z-index": "1050"
            },
            style={"display": "none"}
        )
    ], fluid=True)