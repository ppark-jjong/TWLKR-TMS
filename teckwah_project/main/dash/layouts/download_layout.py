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
        # 헤더 영역
        dbc.Row([
            dbc.Col([
                html.H2("데이터 다운로드", className="mb-3"),
                html.P("배송 데이터를 Excel 형식으로 다운로드합니다. (관리자 전용 기능)", className="text-muted")
            ])
        ], className="mb-4"),
        
        # 날짜 선택 및 다운로드 영역
        dbc.Row([
            dbc.Col([
                dbc.Card([
                    dbc.CardHeader("다운로드 설정"),
                    dbc.CardBody([
                        dbc.Row([
                            # 날짜 범위 선택기
                            dbc.Col([
                                dbc.Label("조회 기간"),
                                dcc.DatePickerRange(
                                    id='download-date-picker-range',
                                    start_date=default_start_date,
                                    end_date=default_end_date,
                                    display_format='YYYY-MM-DD',
                                    className="w-100 mb-3"
                                ),
                                html.Div(id="download-date-range-info", className="text-muted small mb-3")
                            ], md=8),
                            
                            # 다운로드 버튼
                            dbc.Col([
                                html.Div([
                                    dbc.Button("Excel 다운로드", id="download-excel-button", color="primary", className="w-100"),
                                    dcc.Download(id="download-excel")
                                ], className="d-flex align-items-end h-100")
                            ], md=4)
                        ])
                    ])
                ], className="shadow-sm")
            ], md=8, className="mx-auto")
        ]),
        
        # 관리자 권한 확인 영역
        html.Div(id="admin-check-container", className="mt-5 text-center"),
        
        # 로딩 상태 표시
        dbc.Spinner(id="download-loading-spinner", color="primary", type="border", spinner_style={"position": "absolute", "top": "50%", "left": "50%", "transform": "translate(-50%, -50%)", "width": "3rem", "height": "3rem"})
    ], fluid=True)