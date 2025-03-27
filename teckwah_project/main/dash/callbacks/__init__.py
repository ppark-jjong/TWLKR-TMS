from dash import Dash
import time
import logging

# 각 모듈의 콜백 등록 함수 가져오기
from main.dash.callbacks.auth_callbacks import register_callbacks as register_auth_callbacks
from main.dash.callbacks.dashboard_callbacks import register_callbacks as register_dashboard_callbacks
from main.dash.callbacks.common_callbacks import register_callbacks as register_common_callbacks
from main.dash.callbacks.visualization_callbacks import register_callbacks as register_visualization_callbacks
from main.dash.callbacks.download_callbacks import register_callbacks as register_download_callbacks

logger = logging.getLogger(__name__)

def register_all_callbacks(app: Dash):
    """모든 콜백 등록 - 중앙 집중식 등록"""
    start_time = time.time()
    
    try:
        # 공통 콜백 등록
        register_common_callbacks(app)
        logger.info("공통 콜백이 등록되었습니다.")

        # 인증 콜백 등록
        register_auth_callbacks(app)
        logger.info("인증 콜백이 등록되었습니다.")

        # 대시보드 콜백 등록
        register_dashboard_callbacks(app)
        logger.info("대시보드 콜백이 등록되었습니다.")

        # 시각화 콜백 등록
        register_visualization_callbacks(app)
        logger.info("시각화 콜백이 등록되었습니다.")

        # 다운로드 콜백 등록
        register_download_callbacks(app)
        logger.info("다운로드 콜백이 등록되었습니다.")
        
        elapsed_time = time.time() - start_time
        logger.info(f"모든 콜백이 성공적으로 등록되었습니다 (소요 시간: {elapsed_time:.2f}초)")
    except Exception as e:
        logger.error(f"콜백 등록 중 오류 발생: {str(e)}")
        raise
