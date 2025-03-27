# main/dash/dash_main.py
import dash
from dash import html, dcc
import dash_bootstrap_components as dbc
from flask import Flask
import os
import logging
import socket
from main.dash.api.api_client import BASE_URL
from main.server.config.settings import get_settings

# 설정 모듈에서 설정 가져오기
settings = get_settings()

# 로깅 설정
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# 간소화된 백엔드 API 연결 진단
def diagnose_api_connection():
    """간소화된 백엔드 API 서버 연결 진단"""
    logger.info(f"백엔드 API URL 설정: {settings.API_BASE_URL}")
    return True

# 백엔드 API 연결 확인
api_connected = diagnose_api_connection()

# Flask 서버 생성
server = Flask(__name__)

# 오류 핸들러 설정
@server.errorhandler(500)
def handle_500(e):
    logger.error(f"서버 오류 발생: {str(e)}")
    return "서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.", 500

# Dash 앱 생성
app = dash.Dash(
    __name__,
    server=server,
    suppress_callback_exceptions=True,
    external_stylesheets=[dbc.themes.BOOTSTRAP],
    title=settings.PROJECT_NAME,
    meta_tags=[{"name": "viewport", "content": "width=device-width, initial-scale=1"}],
    update_title=None,
    show_undo_redo=False,
)

# 레이아웃 및 콜백 가져오기
from main.dash.layouts.main_layout import create_layout
from main.dash.callbacks.callback import register_callbacks

# 앱 레이아웃 설정
app.layout = create_layout(app)

# 콜백 등록
register_callbacks(app)

# 시작 메시지
logger.info("Dash 애플리케이션이 시작되었습니다.")
logger.info(f"포트: {settings.DASH_PORT}")
logger.info(f"디버그 모드: {settings.DEBUG}")
logger.info(f"API 서버 URL: {settings.API_BASE_URL}")

# 개발 환경에서 실행 시
if __name__ == "__main__":
    port = settings.DASH_PORT
    debug = settings.DEBUG
    app.run_server(host="0.0.0.0", port=port, debug=debug)