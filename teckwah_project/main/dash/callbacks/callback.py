# teckwah_project/main/dash/callbacks/callback.py
import logging
from dash import Dash

# 콜백 모듈 가져오기
import auth_callbacks
import common_callbacks
import dashboard_callbacks
import visualization_callbacks
import download_callbacks

logger = logging.getLogger(__name__)

def register_callbacks(app: Dash):
    """모든 콜백 등록 함수"""
    logger.info("콜백 등록을 시작합니다.")
    
    # 공통 콜백 등록 - 라우팅, 알림 등
    common_callbacks.register_callbacks(app)
    logger.info("공통 콜백 등록 완료")
    
    # 인증 콜백 등록 - 로그인, 로그아웃 등
    auth_callbacks.register_callbacks(app)
    logger.info("인증 콜백 등록 완료")
    
    # 대시보드 콜백 등록 - 목록, 상세정보, 상태 변경 등
    dashboard_callbacks.register_callbacks(app)
    logger.info("대시보드 콜백 등록 완료")
    
    # 시각화 콜백 등록 - 차트 데이터 로드, 표시 등
    visualization_callbacks.register_callbacks(app)
    logger.info("시각화 콜백 등록 완료")
    
    # 다운로드 콜백 등록 - Excel 다운로드 등
    download_callbacks.register_callbacks(app)
    logger.info("다운로드 콜백 등록 완료")
    
    logger.info("모든 콜백 등록이 완료되었습니다.")