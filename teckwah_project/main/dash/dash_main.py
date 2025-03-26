# teckwah_project/main/dash/dash_main.py
import dash
from dash import html, dcc
import dash_bootstrap_components as dbc
from flask import Flask
import os
import logging
import requests
import socket
import json
from main.dash.api.api_client import BASE_URL

# 로깅 설정
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# 백엔드 API 연결 진단
def diagnose_api_connection():
    """백엔드 API 서버 연결 진단 - 자세한 진단 정보 제공"""
    logger.info(f"백엔드 API 진단 시작 - 대상 URL: {BASE_URL}")

    # 1. DNS 확인
    try:
        # URL에서 호스트명 추출
        from urllib.parse import urlparse

        parsed_url = urlparse(BASE_URL)
        hostname = parsed_url.hostname
        port = parsed_url.port or (443 if parsed_url.scheme == "https" else 80)

        logger.info(f"호스트명 확인: {hostname}:{port}")

        # localhost나 IP 주소인 경우 DNS 확인 건너뛰기
        if hostname not in ("localhost", "127.0.0.1") and not hostname.startswith(
            "192.168."
        ):
            socket.gethostbyname(hostname)
            logger.info(f"DNS 확인 성공: {hostname}")
    except socket.gaierror:
        logger.error(f"DNS 확인 실패: {hostname} - 호스트명을 확인할 수 없습니다")
        return False
    except Exception as e:
        logger.error(f"URL 파싱 중 오류: {str(e)}")
        return False

    # 2. 소켓 연결 테스트 (포트 열려있는지 확인)
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)  # 2초 타임아웃
        sock.connect((hostname, port))
        sock.close()
        logger.info(f"소켓 연결 성공: {hostname}:{port}")
    except (socket.timeout, ConnectionRefusedError):
        logger.error(
            f"소켓 연결 실패: {hostname}:{port} - 서버가 실행 중이 아니거나 방화벽이 차단 중인 것 같습니다"
        )
        return False
    except Exception as e:
        logger.error(f"소켓 연결 테스트 중 오류: {str(e)}")
        return False

    # 3. API 헬스 체크
    try:
        logger.info(f"API 헬스 체크 요청: {BASE_URL}/health")
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        logger.info(f"API 응답 코드: {response.status_code}")

        if response.status_code == 200:
            try:
                health_data = response.json()
                logger.info(f"API 헬스 체크 성공: {json.dumps(health_data, indent=2)}")
                return True
            except json.JSONDecodeError:
                logger.warning(
                    f"API 응답이 유효한 JSON이 아닙니다: {response.text[:100]}"
                )
                # 응답은 왔지만 JSON이 아닌 경우, API는 동작 중으로 간주
                return True
        else:
            logger.error(f"API 헬스 체크 실패: 상태 코드 {response.status_code}")
            logger.error(f"응답 내용: {response.text[:200]}")
            return False
    except requests.ConnectionError:
        logger.error(
            f"API 연결 실패: {BASE_URL} - 서버가 실행 중이지 않거나 잘못된 URL입니다"
        )
        return False
    except requests.Timeout:
        logger.error(f"API 요청 타임아웃: {BASE_URL}")
        return False
    except Exception as e:
        logger.error(f"API 헬스 체크 중 예상치 못한 오류: {str(e)}")
        return False


# 백엔드 API 연결 확인
api_connected = diagnose_api_connection()
if not api_connected:
    logger.warning("백엔드 API 연결 없이 시작합니다. 일부 기능이 제한될 수 있습니다.")
    logger.warning(f"API 서버 URL 확인: {BASE_URL}")
    logger.warning(
        "API 서버가 실행 중인지, 환경 변수 API_BASE_URL이 올바르게 설정되었는지 확인하세요."
    )
else:
    logger.info("백엔드 API 연결 성공!")

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
    title="배송 실시간 관제 시스템",
    meta_tags=[{"name": "viewport", "content": "width=device-width, initial-scale=1"}],
    # 오른쪽 하단 내비게이션 버튼 숨기기
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
logger.info(f"포트: {os.environ.get('DASH_PORT', 3000)}")
logger.info(f"디버그 모드: {os.environ.get('DEBUG', 'True').lower() == 'true'}")
logger.info(f"API 서버 URL: {BASE_URL}")

# 개발 환경에서 실행 시
if __name__ == "__main__":
    port = int(os.environ.get("DASH_PORT", 3000))
    debug = os.environ.get("DEBUG", "True").lower() == "true"
    app.run_server(host="0.0.0.0", port=port, debug=debug)
