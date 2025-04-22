"""
FastAPI 메인 애플리케이션
"""

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import sys
import json
import platform
import fastapi
from datetime import datetime, timedelta
import uvicorn
from contextlib import asynccontextmanager

# 임포트 경로 문제 해결을 위한 수정
# 현재 디렉토리를 Python 경로에 추가 (상대 임포트용)
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)
# 부모 디렉토리도 추가 (backend 패키지 임포트용)
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from backend.utils.logger import logger
from backend.config import get_settings
from backend.database import Base, engine, get_db
from backend.middleware.error import ErrorHandlerMiddleware
from backend.utils.lock import release_expired_locks
from backend.routes import (
    auth,
    dashboard,
    handover,
    visualization,
    user,
)
from backend.utils.security import cleanup_expired_sessions, sessions, get_session

# 설정 로드
settings = get_settings()


# Lifespan 컨텍스트 매니저 정의 (on_event 대체)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 애플리케이션 시작 시 실행될 코드 - 핵심 정보만 로깅
    logger.info("=" * 60)
    logger.info("[시스템] 배송 실시간 관제 시스템 API 시작")
    logger.info(f"[시스템] 환경: {'개발' if settings.DEBUG else '운영'} 모드")

    # 세션 정리 작업 예약
    try:
        cleanup_expired_sessions()
    except Exception as e:
        logger.error(f"세션 정리 중 오류 발생: {str(e)}")

    # 만료된 락 정리
    try:
        db = next(get_db())
        expired_locks_count = release_expired_locks(db)
        if expired_locks_count > 0:
            logger.info(f"[시스템] 만료된 락 {expired_locks_count}개 해제 완료")
    except Exception as e:
        logger.error(f"락 정리 중 오류 발생: {str(e)}")

    # 컨텍스트 양보
    yield

    # 애플리케이션 종료 시 실행될 코드
    logger.info("[시스템] 배송 실시간 관제 시스템 API 종료")


# FastAPI 앱 생성
# 디버깅 모드 강제 활성화 (문제 해결 후 원복 필요)
settings.DEBUG = True
logger.info(f"디버깅 모드 상태: {settings.DEBUG}")

app = FastAPI(
    title="배송 실시간 관제 시스템 API",
    description="배송 관리 및 실시간 관제 기능을 제공하는 API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,  # 디버깅 모드일 때만 docs 활성화
    redoc_url="/redoc" if settings.DEBUG else None,  # 디버깅 모드일 때만 redoc 활성화
    lifespan=lifespan,  # lifespan 컨텍스트 매니저 등록
    debug=settings.DEBUG,  # 디버깅 모드 설정
)

# 미들웨어 추가
# app.add_middleware(JSONResponseMiddleware)  # 응답 처리 미들웨어 임시 비활성화 (JSON 응답 표준화)
app.add_middleware(ErrorHandlerMiddleware)  # ErrorHandler를 먼저 두는 것이 좋을 수 있음
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 미들웨어 등록 로깅
logger.info("JSON 응답 표준화 미들웨어 등록 완료 (날짜 형식 변환 및 필드 표준화)")

# 데이터베이스 테이블 생성 (자동 마이그레이션)
if settings.DEBUG:
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("데이터베이스 테이블 자동 생성 완료 (개발 모드)")
    except Exception as e:
        logger.error(f"데이터베이스 테이블 생성 실패: {str(e)}")

# 라우터 등록 - 프론트엔드와 동일한 엔드포인트로 설정
app.include_router(auth.router, prefix="/auth", tags=["인증"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["대시보드"])
app.include_router(handover.router, prefix="/handover", tags=["인수인계"])
app.include_router(visualization.router, prefix="/visualization", tags=["시각화"])
app.include_router(user.router, prefix="/users", tags=["사용자 관리"])

# API 라우터 목록 로깅
routes = sorted(
    [
        f"{route.methods} {route.path}"
        for route in app.routes
        if hasattr(route, "methods")
    ]
)
logger.info(f"등록된 API 엔드포인트: 총 {len(routes)}개")
for route in routes[:20]:  # 처음 20개만 로그
    logger.info(f"  - {route}")
if len(routes) > 20:
    logger.info(f"  + {len(routes) - 20}개 추가 엔드포인트...")


# 상태 체크 엔드포인트
@app.get("/health")
async def health_check():
    """
    API 서버 헬스 체크
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "env": "development" if settings.DEBUG else "production",
        "sessions": len(sessions),
    }


# --- 정적 파일 경로 설정 및 마운트 ---
STATIC_FILES_DIR = os.path.join(
    os.path.dirname(__file__), "../frontend/build"
)  # build 디렉토리 기준
if not os.path.exists(STATIC_FILES_DIR):
    # 로컬 개발 환경 경로 (frontend 디렉토리가 build를 포함한다고 가정)
    STATIC_FILES_DIR = os.path.join(os.path.dirname(__file__), "../frontend")
    if not os.path.exists(os.path.join(STATIC_FILES_DIR, "static")):
        # Docker 환경 경로
        STATIC_FILES_DIR = "/app/frontend"

# /static 경로에 대해 StaticFiles 마운트 (미들웨어보다 먼저)
if os.path.exists(os.path.join(STATIC_FILES_DIR, "static")):
    logger.info(f"정적 파일 서빙 경로 설정: {os.path.join(STATIC_FILES_DIR, 'static')}")
    app.mount(
        "/static",
        StaticFiles(directory=os.path.join(STATIC_FILES_DIR, "static")),
        name="static",
    )
else:
    logger.warning(
        f"정적 파일 디렉토리('/static')를 찾을 수 없습니다: {STATIC_FILES_DIR}"
    )

INDEX_HTML_PATH = os.path.join(STATIC_FILES_DIR, "index.html")
if not os.path.exists(INDEX_HTML_PATH):
    logger.warning(f"index.html 파일을 찾을 수 없습니다: {INDEX_HTML_PATH}")

# --- 미들웨어 추가 ---
# ErrorHandlerMiddleware, JSONResponseMiddleware, CORSMiddleware 순서는 중요할 수 있음
app.add_middleware(ErrorHandlerMiddleware)
# app.add_middleware(JSONResponseMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- SPA 및 인증 리다이렉션 미들웨어 ---
@app.middleware("http")
async def spa_redirect_middleware(request: Request, call_next):
    import uuid

    request_id = str(uuid.uuid4())[:8]
    path = request.url.path
    log_level = (
        logger.debug if path.startswith(("/static", "/favicon.ico")) else logger.info
    )

    log_level(f"요청 시작 [ID: {request_id}]: {request.method} {path}")

    # 1. API 경로 확인
    api_prefixes = [
        "/auth",
        "/dashboard",
        "/handover",
        "/visualization",
        "/users",
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
    ]
    is_api_path = any(path.startswith(prefix) for prefix in api_prefixes)
    if is_api_path:
        log_level(f"API 요청 처리 [ID: {request_id}]: {path}")
        # API 경로는 FastAPI 라우터 및 의존성 검사(401 등)에 맡김
        response = await call_next(request)
        log_level(
            f"API 응답 [ID: {request_id}]: {request.method} {path} - {response.status_code}"
        )
        return response

    # 2. 정적 파일 경로 확인 (이미 /static으로 마운트됨, FastAPI가 처리)
    if path.startswith("/static"):
        log_level(f"정적 파일 요청 처리 위임 [ID: {request_id}]: {path}")
        # StaticFiles 마운트가 처리하도록 위임
        response = await call_next(request)
        # StaticFiles가 파일을 못찾으면 404 반환, 여기서는 추가 처리 없음
        log_level(
            f"정적 파일 응답 [ID: {request_id}]: {request.method} {path} - {response.status_code}"
        )
        return response

    # 3. 인증 예외 경로 확인 (로그인 페이지 등)
    auth_exempt_paths = [
        "/login",
        "/favicon.ico",
        "/logo.png",
    ]  # 기타 필요한 정적 파일 추가
    is_auth_exempt = path in auth_exempt_paths
    if is_auth_exempt:
        log_level(f"인증 예외 경로 처리 [ID: {request_id}]: {path}")
        # 로그인 페이지 또는 기타 예외 경로는 그대로 처리 (SPA 폴백 또는 StaticFiles)
        response = await call_next(request)
        # 여기서 404가 발생하면 index.html 서빙 시도
        if response.status_code == 404 and os.path.exists(INDEX_HTML_PATH):
            log_level(
                f"인증 예외 경로 404, SPA 폴백 [ID: {request_id}]: {path} -> index.html"
            )
            return FileResponse(INDEX_HTML_PATH)
        log_level(
            f"인증 예외 경로 응답 [ID: {request_id}]: {request.method} {path} - {response.status_code}"
        )
        return response

    # 4. 그 외 모든 경로는 인증 확인 후 SPA 처리 또는 로그인 리다이렉션
    session_id = request.cookies.get("session_id")
    session = get_session(session_id) if session_id else None

    if not session:
        logger.info(
            f"인증 필요, 로그인 리다이렉션 [ID: {request_id}]: {path} -> /login"
        )
        return Response(status_code=307, headers={"Location": "/login"})
    else:
        log_level(
            f"인증 완료, SPA 진입 [ID: {request_id}]: {path} (사용자: {session['user_id']})"
        )
        # 인증된 사용자는 index.html 반환
        if os.path.exists(INDEX_HTML_PATH):
            return FileResponse(INDEX_HTML_PATH)
        else:
            logger.error(
                f"SPA 처리 실패 [ID: {request_id}]: index.html 찾을 수 없음 - {INDEX_HTML_PATH}"
            )
            return Response(content="Frontend build not found.", status_code=500)


# 서버 실행 (직접 실행 시)
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)
