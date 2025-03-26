# teckwah_project/main/dash/dash_main.py
import dash
from dash import html, dcc
import dash_bootstrap_components as dbc
from flask import Flask
import os

# Flask 서버 생성
server = Flask(__name__)

# Dash 앱 생성
app = dash.Dash(
    __name__,
    server=server,
    suppress_callback_exceptions=True,
    external_stylesheets=[dbc.themes.BOOTSTRAP],
    title="배송 실시간 관제 시스템",
    meta_tags=[{"name": "viewport", "content": "width=device-width, initial-scale=1"}],
)

# 레이아웃 및 콜백 가져오기
from main.dash.layouts.main_layout import create_layout
from main.dash.callbacks.callback import register_callbacks

# 앱 레이아웃 설정
app.layout = create_layout(app)

# 콜백 등록
register_callbacks(app)

# 시작 메시지
print("Dash 애플리케이션이 시작되었습니다.")
print(f"포트: {os.environ.get('DASH_PORT', 3000)}")
print(f"디버그 모드: {os.environ.get('DEBUG', 'True').lower() == 'true'}")

# 개발 환경에서 실행 시
if __name__ == "__main__":
    port = int(os.environ.get("DASH_PORT", 3000))
    debug = os.environ.get("DEBUG", "True").lower() == "true"
    app.run_server(host="0.0.0.0", port=port, debug=debug)