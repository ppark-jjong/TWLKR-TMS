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

def register_all_callbacks(app: Dash):
    """모든 콜백 등록 함수"""
    logger.info("콜백 등록을 시작합니다.")
    
    # 앱 상태 초기화 콜백을 먼저 등록
    logger.info("공통 콜백 등록 시작")
    common_callbacks.register_app_state_callbacks(app)
    logger.info("공통 콜백 중 앱 상태 초기화 완료")
    
    # 레이아웃 및 페이지 라우팅 콜백 등록
    common_callbacks.register_layout_callbacks(app)
    logger.info("공통 콜백 중 레이아웃 관련 콜백 등록 완료")
    
    # 알림 및 모달 콜백 등록
    common_callbacks.register_ui_callbacks(app)
    logger.info("공통 콜백 중 UI 관련 콜백 등록 완료")
    
    # 인증 관련 콜백 등록 (auth-store와 url.pathname을 사용)
    logger.info("인증 콜백 등록 시작")
    auth_callbacks.register_auth_callbacks(app)
    logger.info("인증 콜백 등록 완료")
    
    # 대시보드 데이터 관련 콜백 등록
    logger.info("대시보드 콜백 등록 시작")
    dashboard_callbacks.register_data_callbacks(app)
    logger.info("대시보드 데이터 콜백 등록 완료")
    
    # 대시보드 상호작용 관련 콜백 등록
    dashboard_callbacks.register_interaction_callbacks(app)
    logger.info("대시보드 상호작용 콜백 등록 완료")
    
    # 시각화 관련 콜백 등록
    logger.info("시각화 콜백 등록 시작")
    visualization_callbacks.register_callbacks(app)
    logger.info("시각화 콜백 등록 완료")
    
    # 다운로드 관련 콜백 등록
    logger.info("다운로드 콜백 등록 시작")
    download_callbacks.register_callbacks(app)
    logger.info("다운로드 콜백 등록 완료")
    
    logger.info("모든 콜백 등록이 완료되었습니다.")

def register_callbacks(app: Dash):
    """이전 버전 호환성을 위한 래퍼 함수"""
    return register_all_callbacks(app)