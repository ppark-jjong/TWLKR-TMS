# backend/main.py (기존 코드에 추가)
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
import time
from typing import Callable

from app.api import (
    auth_router,
    dashboard_router,
    visualization_router,
    dashboard_remark_router,
    dashboard_lock_router,
    download_router,
)
from app.config.settings import get_settings
from app.utils.logger import log_info, log_error
from app.repositories.dashboard_lock_repository import DashboardLockRepository
from app.config.database import get_db, SessionLocal
import uuid

settings = get_settings()

# 로깅 설정
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("logs/app.log")],
)

logger = logging.getLogger("delivery-system")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 글로벌 예외 핸들러 추가
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
        error_detail["message"] = "요청을 처리할 수 없습니다"
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_detail
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """모든 처리되지 않은 예외에 대한 표준 응답 형식 적용"""
    log_error(exc, f"처리되지 않은 예외: {str(exc)}")
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "서버 내부 오류가 발생했습니다"
        }
    )

# 요청 처리 시간 로깅 미들웨어
@app.middleware("http")
async def log_requests(request: Request, call_next: Callable) -> Response:
    # 요청별 고유 ID 생성
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    # 요청 시작 시간
    start_time = time.time()

    # 요청 경로 및 메서드 로깅
    log_info(
        f"요청 시작: {request.method} {request.url.path}",
        {
            "request_id": request_id,
            "client": request.client.host if request.client else "unknown",
        },
    )

    try:
        # 다음 미들웨어 또는 엔드포인트 호출
        response = await call_next(request)

        # 처리 시간 계산 및 로깅
        process_time = time.time() - start_time
        log_info(
            f"요청 완료: {request.method} {request.url.path}",
            {
                "request_id": request_id,
                "status_code": response.status_code,
                "process_time_ms": round(process_time * 1000, 2),
            },
        )

        # 응답 헤더에 처리 시간 추가 (선택사항)
        response.headers["X-Process-Time"] = str(process_time)

        return response
    except Exception as e:
        # 예외 발생 시 로깅
        process_time = time.time() - start_time
        log_error(
            e,
            f"요청 처리 오류: {request.method} {request.url.path}",
            {
                "request_id": request_id,
                "process_time_ms": round(process_time * 1000, 2),
            },
        )
        raise


# 정적 파일 서빙 설정
app.mount("/static", StaticFiles(directory="static"), name="static")

# API 라우터 등록
app.include_router(auth_router.router, prefix="/auth", tags=["인증"])
app.include_router(dashboard_router.router, prefix="/dashboard", tags=["대시보드"])
app.include_router(
    visualization_router.router, prefix="/visualization", tags=["시각화"]
)
app.include_router(dashboard_remark_router.router, prefix="/dashboard", tags=["메모"])
app.include_router(dashboard_lock_router.router, prefix="/dashboard", tags=["락 관리"])
# 다운로드 라우터 등록
app.include_router(download_router.router, prefix="/download", tags=["다운로드"])


@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행되는 이벤트 핸들러"""
    # 환경 설정 로깅
    log_info(
        "애플리케이션 시작",
        {
            "project_name": settings.PROJECT_NAME,
            "database": f"{settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{settings.MYSQL_DATABASE}",
            "api_port": settings.API_PORT,
            "debug_mode": settings.DEBUG,
            "lock_timeout": f"{settings.LOCK_TIMEOUT_SECONDS}초",
            "lock_cleanup_interval": f"{settings.LOCK_CLEANUP_INTERVAL_MINUTES}분",
        },
    )

    # 로그 디렉토리 확인 및 생성
    os.makedirs("logs", exist_ok=True)

    # 만료된 락 정리
    try:
        db = SessionLocal()
        lock_repository = DashboardLockRepository(db)
        cleaned_count = lock_repository.cleanup_expired_locks()
        log_info(f"만료된 락 정리: {cleaned_count}건")
        db.commit()
    except Exception as e:
        log_error(e, "만료된 락 정리 실패")
    finally:
        db.close()

    logger.info(f"서버 시작: {settings.PROJECT_NAME}")


@app.on_event("shutdown")
async def shutdown_event():
    """애플리케이션 종료 시 실행되는 이벤트 핸들러"""
    log_info("애플리케이션 종료")


# SPA 라우팅 처리
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # 정적 파일 요청 처리
    static_file = os.path.join("static", full_path)
    if os.path.isfile(static_file):
        return FileResponse(static_file)

    # 나머지는 index.html로 라우팅
    return FileResponse("static/index.html")