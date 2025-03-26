# teckwah_project/main/dash/layouts/main_layout.py
from dash import html, dcc
import dash_bootstrap_components as dbc
from layouts.login_layout import create_login_layout
from layouts.dashboard_layout import create_dashboard_layout
from layouts.visualization_layout import create_visualization_layout
from layouts.download_layout import create_download_layout
from components.navbar import create_navbar

def create_layout(app):
    """전체 레이아웃 생성"""
    return html.Div([
        # URL 라우팅을 위한 위치 저장소
        dcc.Location(id='url', refresh=False),
        
        # 로그인 상태 저장
        dcc.Store(id='auth-store', storage_type='session'),
        
        # 사용자 정보 저장
        dcc.Store(id='user-info-store', storage_type='session'),
        
        # 대시보드 데이터 저장
        dcc.Store(id='dashboard-data-store', storage_type='memory'),
        
        # 앱 전역 상태 저장
        dcc.Store(id='app-state-store', storage_type='memory'),
        
        # 알림 메시지를 위한 컨테이너
        html.Div(id='alert-container', className='position-fixed top-0 end-0 p-3', style={'zIndex': 1050}),
        
        # 네비게이션 바 (로그인 상태에 따라 표시)
        html.Div(id='navbar-container'),
        
        # 페이지 컨텐츠가 로드될 컨테이너
        html.Div(id='page-content', className='container-fluid py-4')
    ])