# backend/main.py 수정
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import logging

from app.api import (
    auth_router,
    dashboard_router,
    visualization_router,
    dashboard_remark_router,
)
from app.config.settings import get_settings
from app.utils.logger import log_info

settings = get_settings()

# 로깅 설정
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/app.log')
    ]
)

logger = logging.getLogger("delivery-system")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
)

# 정적 파일 서빙 설정
app.mount("/static", StaticFiles(directory="static"), name="static")

# API 라우터 등록
app.include_router(auth_router.router, prefix="/auth", tags=["인증"])
app.include_router(dashboard_router.router, prefix="/dashboard", tags=["대시보드"])
app.include_router(
    visualization_router.router, prefix="/visualization", tags=["시각화"]
)
app.include_router(dashboard_remark_router.router, prefix="/dashboard", tags=["메모"])


@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행되는 이벤트 핸들러"""
    # 환경 설정 로깅
    log_info("애플리케이션 시작", {
        "project_name": settings.PROJECT_NAME,
        "database": f"{settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{settings.MYSQL_DATABASE}",
        "api_port": settings.API_PORT,
        "debug_mode": settings.DEBUG,
        "lock_timeout": f"{settings.LOCK_TIMEOUT_SECONDS}초",
        "lock_cleanup_interval": f"{settings.LOCK_CLEANUP_INTERVAL_MINUTES}분"
    })
    
    # 로그 디렉토리 확인 및 생성
    os.makedirs("logs", exist_ok=True)
    
    logger.info(f"서버 시작: {settings.PROJECT_NAME}")


# SPA 라우팅 처리
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # 정적 파일 요청 처리
    static_file = os.path.join("static", full_path)
    if os.path.isfile(static_file):
        return FileResponse(static_file)

    # 나머지는 index.html로 라우팅
    return FileResponse("static/index.html")