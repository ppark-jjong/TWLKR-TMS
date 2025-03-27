# main/dash/dash_main.py
import dash
from dash import html, dcc
import dash_bootstrap_components as dbc
from flask import Flask
import os
import logging
from main.server.config.settings import get_settings

# 설정 모듈에서 설정 가져오기
settings = get_settings()

# 로깅 설정
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# API URL 로깅
logger.info(f"백엔드 API URL 설정: {settings.API_BASE_URL}")

# Flask 서버 생성
server = Flask(__name__)

# 오류 핸들러 설정
@server.errorhandler(500)
def handle_500(e):
    logger.error(f"서버 오류 발생: {str(e)}")
    return "서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.", 500

def create_app(server):
    """Dash 앱 초기화 - 1920x1080 해상도 최적화"""
    # 외부 스타일시트
    external_stylesheets = [
        dbc.themes.BOOTSTRAP,
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css",
        "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap",
    ]
    
    # Dash 앱 생성 - 간소화된 버전
    app = dash.Dash(
        __name__,
        server=server,
        external_stylesheets=external_stylesheets,
        suppress_callback_exceptions=True,
        title="배송 관제 시스템",
        update_title="로딩 중...",
        meta_tags=[
            {"name": "viewport", "content": "width=device-width, initial-scale=1"},
            {"name": "description", "content": "배송 주문 관리 및 배차 처리를 위한 실시간 관제 시스템"},
        ],
    )
    
    # 레이아웃 및 콜백 설정
    from main.dash.layouts.main_layout import create_main_layout
    from main.dash.callbacks import register_all_callbacks
    
    app.layout = create_main_layout()
    register_all_callbacks(app)
    
    logger.info("Dash 앱이 초기화되었습니다.")
    return app

# 시작 메시지
logger.info("Dash 애플리케이션이 시작되었습니다.")
logger.info(f"포트: {settings.DASH_PORT}")
logger.info(f"디버그 모드: {settings.DEBUG}")

# 앱 생성
app = create_app(server)

# 서버 실행
if __name__ == "__main__":
    port = settings.DASH_PORT
    debug = settings.DEBUG
    app.run_server(host="0.0.0.0", port=port, debug=debug)
else:
    # Supervisord에서 실행 시
    port = settings.DASH_PORT
    debug = False  # 프로덕션에서는 디버그 모드 비활성화
    app.run_server(host="0.0.0.0", port=port, debug=debug)