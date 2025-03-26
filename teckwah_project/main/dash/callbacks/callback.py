# teckwah_project/main/dash/callbacks/callback.py
import logging
from dash import Dash

# 콜백 모듈 가져오기

from main.dash.callbacks import auth_callbacks
from main.dash.callbacks import common_callbacks
from main.dash.callbacks import dashboard_callbacks
from main.dash.callbacks import visualization_callbacks
from main.dash.callbacks import download_callbacks

logger = logging.getLogger(__name__)


def register_callbacks(app: Dash):
    """모든 콜백 등록 함수"""
    logger.info("콜백 등록을 시작합니다.")

    # 앱 상태 초기화 콜백이 먼저 등록되도록 공통 콜백 먼저 등록
    logger.info("공통 콜백 등록 시작")
    common_callbacks.register_callbacks(app)
    logger.info("공통 콜백 등록 완료")

    # auth-store와 url.pathname을 사용하는 인증 콜백이 다음으로 등록
    logger.info("인증 콜백 등록 시작")
    auth_callbacks.register_callbacks(app)
    logger.info("인증 콜백 등록 완료")

    # 그 다음 나머지 콜백들 등록
    logger.info("대시보드 콜백 등록 시작")
    dashboard_callbacks.register_callbacks(app)
    logger.info("대시보드 콜백 등록 완료")

    logger.info("시각화 콜백 등록 시작")
    visualization_callbacks.register_callbacks(app)
    logger.info("시각화 콜백 등록 완료")

    logger.info("다운로드 콜백 등록 시작")
    download_callbacks.register_callbacks(app)
    logger.info("다운로드 콜백 등록 완료")

    logger.info("모든 콜백 등록이 완료되었습니다.")
