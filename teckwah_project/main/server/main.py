# teckwah_project/main/server/main.py
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
import time
from typing import Callable

from main.server.api import (
    auth_router,
    dashboard_router,
    visualization_router,
    dashboard_lock_router,
    download_router,
)
from main.server.config.settings import get_settings
from main.server.utils.logger import log_info, log_error, set_request_id
from main.server.utils.datetime_helper import get_kst_now
from main.server.utils.constants import MESSAGES

settings = get_settings()

# 로깅 설정 간소화 - 중복 출력 방지
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)

# 다른 로거 레벨 조정
logging.getLogger("uvicorn").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.ERROR)

logger = logging.getLogger("delivery-system")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
)

# CORS 설정 - 모든 오리진 허용 (개발 환경 기준)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 글로벌 예외 핸들러 통합
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP 예외에 대한 표준 응답 형식 적용"""
    error_detail = exc.detail

    # error_detail이 딕셔너리가 아닌 경우 변환
    if not isinstance(error_detail, dict):
        error_detail = {"success": False, "message": str(error_detail)}

    # success 필드가 없으면 추가
    if "success" not in error_detail:
        error_detail["success"] = False

    # message 필드가 없으면 기본 메시지 추가
    if "message" not in error_detail:
        error_detail["message"] = MESSAGES["ERROR"]["SERVER"]

    return JSONResponse(status_code=exc.status_code, content=error_detail)


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """모든 처리되지 않은 예외에 대한 표준 응답 형식 적용"""
    log_error(exc, f"처리되지 않은 예외: {str(exc)}")

    return JSONResponse(
        status_code=500,
        content={"success": False, "message": MESSAGES["ERROR"]["SERVER"]},
    )


# 요청 처리 시간 로깅 미들웨어
@app.middleware("http")
async def log_requests(request: Request, call_next: Callable) -> Response:
    # 요청별 고유 ID 생성 및 설정
    request_id = set_request_id()
    request.state.request_id = request_id

    # 측정 시작
    start_time = time.time()
    
    # 미들웨어 또는 엔드포인트 호출
    response = await call_next(request)
    
    # 처리 시간 계산
    process_time = time.time() - start_time
    
    # 중요 API 또는 오류 상황에서만 로깅
    if (
        response.status_code >= 400 or 
        "/auth/" in request.url.path or
        process_time > 1.0  # 1초 이상 걸린 요청만 로깅
    ):
        end_time_kst = get_kst_now()
        log_info(f"API 요청: {request.method} {request.url.path} - 상태: {response.status_code} (처리시간: {process_time:.3f}초)")
    
    # 응답 헤더에 처리 시간 추가
    response.headers["X-Process-Time"] = str(process_time)
    response.headers["X-Request-ID"] = request_id
    
    return response


# API 라우터 등록
app.include_router(auth_router.router, prefix="/auth", tags=["인증"])
app.include_router(dashboard_router.router, prefix="/dashboard", tags=["대시보드"])
app.include_router(
    visualization_router.router, prefix="/visualization", tags=["시각화"]
)
app.include_router(dashboard_lock_router.router, prefix="/dashboard", tags=["락 관리"])
app.include_router(download_router.router, prefix="/download", tags=["다운로드"])


@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행되는 이벤트 핸들러"""
    # 환경 설정 로깅
    log_info(f"애플리케이션 시작 - {settings.PROJECT_NAME} (환경: {'개발' if settings.DEBUG else '운영'})")

    # 로그 디렉토리 확인 및 생성
    os.makedirs("logs", exist_ok=True)


@app.on_event("shutdown")
async def shutdown_event():
    """애플리케이션 종료 시 실행되는 이벤트 핸들러"""
    log_info("애플리케이션 종료")