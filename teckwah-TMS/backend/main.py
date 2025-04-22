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
from backend.middleware.response import JSONResponseMiddleware

app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(JSONResponseMiddleware)  # 응답 처리 미들웨어 추가 (JSON 응답 표준화)
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


# SPA 라우팅을 위한 폴백 미들웨어
@app.middleware("http")
async def spa_middleware(request: Request, call_next):
    import uuid

    request_id = str(uuid.uuid4())[:8]
    path = request.url.path

    # 로그 레벨 조정 - 자주 요청되는 리소스는 DEBUG 레벨로 낮춤
    is_common_resource = path.endswith((".js", ".css", ".png", ".jpg", ".ico", ".svg"))
    log_level = logger.debug if is_common_resource else logger.info

    # 요청 시작 로그
    log_level(f"요청 시작 [ID: {request_id}]: {request.method} {path}")

    # API 요청 처리 - 모든 라우트 명시적 매핑
    api_routes = [
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

    # 인증 예외 경로 (로그인 페이지, 인증 API 등)
    auth_exempt_routes = [
        "/login",
        "/auth/login",
        "/logo.png",
        "/favicon.ico",
        "/assets",
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
    ]

    # API 요청인지 확인
    is_api_request = False
    for route in api_routes:
        if path == route or path.startswith(f"{route}/"):
            is_api_request = True
            break

    # 정적 파일 요청인지 확인
    is_static_request = path.startswith("/assets/") or any(
        path.endswith(ext) for ext in [".js", ".css", ".png", ".jpg", ".svg", ".ico"]
    )

    # 인증 예외 경로인지 확인
    is_auth_exempt = is_static_request
    for exempt_route in auth_exempt_routes:
        if path == exempt_route or path.startswith(f"{exempt_route}/"):
            is_auth_exempt = True
            break

    # 인증이 필요한 API 요청 확인
    if is_api_request and not is_auth_exempt and not path.startswith("/auth/login"):
        # 세션 쿠키 확인
        session_id = request.cookies.get("session_id")

        # 쿠키가 없거나 유효하지 않은 경우 401 응답
        if not session_id:
            logger.warning(f"인증되지 않은 API 접근 (쿠키 없음): {path}")
            return Response(
                content=json.dumps(
                    {
                        "success": False,
                        "message": "인증이 필요합니다. 로그인 후 다시 시도해주세요.",
                        "error_code": "UNAUTHORIZED",
                    }
                ),
                status_code=401,
                media_type="application/json",
            )

        # 세션 유효성 확인
        session = get_session(session_id)
        if not session:
            logger.warning(
                f"인증되지 않은 API 접근 (세션 만료): {path}, 세션ID: {session_id[:8]}"
            )
            return Response(
                content=json.dumps(
                    {
                        "success": False,
                        "message": "세션이 만료되었습니다. 다시 로그인해주세요.",
                        "error_code": "SESSION_EXPIRED",
                    }
                ),
                status_code=401,
                media_type="application/json",
            )

        log_level(
            f"인증 성공: 사용자={session['user_id']}, 권한={session['user_role']}"
        )

    # API 요청 처리
    if is_api_request:
        try:
            response = await call_next(request)
            log_level(f"API 응답: {request.method} {path} - {response.status_code}")
            return response
        except Exception as e:
            logger.error(f"API 요청 처리 중 오류: {str(e)}, 경로={path}")
            import traceback

            logger.error(f"상세 오류: {traceback.format_exc()}")
            return Response(
                content=json.dumps(
                    {
                        "success": False,
                        "message": "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
                        "error_code": "INTERNAL_ERROR",
                    }
                ),
                status_code=500,
                media_type="application/json",
            )

    # 정적 파일 요청 처리
    if is_static_request:
        try:
            response = await call_next(request)
            log_level(f"정적 파일 응답: {path} - {response.status_code}")
            return response
        except Exception as e:
            logger.error(f"정적 파일 처리 중 오류: {str(e)}, 경로={path}")
            return Response(status_code=404)

    # 인증 체크 (프론트엔드 페이지 접근 시)
    if not is_auth_exempt and not path == "/login":
        # 세션 쿠키 확인
        session_id = request.cookies.get("session_id")

        # 쿠키가 없거나 유효하지 않은 경우 로그인 페이지로 리다이렉션
        if not session_id or not get_session(session_id):
            logger.warning(f"인증되지 않은 페이지 접근, 로그인으로 리다이렉션: {path}")
            return Response(
                content="Redirecting to login...",
                status_code=302,
                headers={"Location": "/login"},
            )

    # 일반 요청 처리
    try:
        response = await call_next(request)
        log_level(f"페이지 응답: {path} - {response.status_code}")

        # 404인 경우 SPA 라우팅을 위해 index.html로 폴백
        if response.status_code == 404:
            logger.info(f"404 응답 감지, SPA 폴백 시도: {path}")

            # 프론트엔드 경로 확인
            frontend_path = os.path.join(os.path.dirname(__file__), "../frontend")
            if not os.path.exists(frontend_path):
                frontend_path = "/app/frontend"

            index_path = os.path.join(frontend_path, "index.html")
            if os.path.exists(index_path):
                logger.info(f"SPA 폴백 성공: {path} -> index.html")
                return FileResponse(index_path)
            else:
                logger.warning(
                    f"SPA 폴백 실패: index.html을 찾을 수 없음 ({index_path})"
                )

        return response
    except Exception as e:
        logger.error(f"요청 처리 중 오류: {str(e)}, 경로={path}")
        import traceback

        logger.error(f"상세 오류: {traceback.format_exc()}")
        return Response(
            content="서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            status_code=500,
        )


# 프론트엔드 정적 파일 서빙 (Docker 통합 배포용)
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend")
if not os.path.exists(frontend_path):
    # Docker 환경에서의 경로 확인
    frontend_path = "/app/frontend"

if os.path.exists(frontend_path):
    logger.info(f"프론트엔드 정적 파일 서빙 활성화: {frontend_path}")
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
else:
    logger.warning(f"프론트엔드 정적 파일 경로를 찾을 수 없습니다: {frontend_path}")

# 서버 실행 (직접 실행 시)
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)
