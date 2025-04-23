"""
배송 실시간 관제 시스템 메인 애플리케이션
"""

import os
import logging
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse
from contextlib import asynccontextmanager
import time

# 유틸리티 및 설정
from backend.utils.config import get_settings
from backend.utils.logger import logger
from backend.utils.database import get_db, test_db_connection

# 라우터 임포트
from backend.routes.auth_route import router as auth_router
from backend.routes.dashboard_route import router as dashboard_router
from backend.routes.handover_route import router as handover_router
from backend.routes.user_route import router as user_router
from backend.routes.visualization_route import router as visualization_router

# 설정 로드
settings = get_settings()

# lifespan 이벤트 핸들러 (FastAPI 최신 방식)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 애플리케이션 시작 시 실행되는 코드
    logger.info("애플리케이션 시작 중...")
    
    # 데이터베이스 연결 테스트
    if test_db_connection():
        logger.info("데이터베이스 연결 확인 완료")
    else:
        logger.error("데이터베이스 연결 실패")
        # 디버그 모드가 아니라면 서버를 종료
        if not settings.DEBUG:
            logger.critical("데이터베이스 연결 실패로 서버를 종료합니다.")
            # 비동기 컨텍스트에서 프로세스를 종료하는 것은 권장되지 않으므로
            # 예외를 발생시켜 서버 시작을 중단합니다.
            raise Exception("데이터베이스 연결 실패")
    
    logger.info(f"서버가 시작되었습니다: http://localhost:{settings.PORT}")
    if settings.DEBUG:
        logger.info(f"API 문서: http://localhost:{settings.PORT}/docs")
    
    yield
    
    # 애플리케이션 종료 시 실행되는 코드
    logger.info("애플리케이션 종료 중...")
    # 필요한 정리 작업 수행
    
    logger.info("애플리케이션이 정상적으로 종료되었습니다.")

# FastAPI 앱 생성
app = FastAPI(
    title="TWLRK-TMS",
    description="배송 실시간 관제 시스템 API",
    version="1.0.0",
    docs_url=None if not settings.DEBUG else "/docs",
    redoc_url=None if not settings.DEBUG else "/redoc",
    lifespan=lifespan,
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 세션 미들웨어 설정
app.add_middleware(
    SessionMiddleware, 
    secret_key=settings.SESSION_SECRET,
    max_age=settings.SESSION_EXPIRE_HOURS * 3600,  # 시간을 초로 변환
)

# 요청 시간 로깅 미들웨어
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    요청 처리 시간을 로깅하는 미들웨어
    """
    start_time = time.time()
    
    # 요청 정보 로깅
    logger.info(
        f"요청 시작: {request.method} {request.url.path}"
    )
    
    response = await call_next(request)
    
    # 처리 시간 계산 및 로깅
    process_time = (time.time() - start_time) * 1000
    logger.info(
        f"요청 완료: {request.method} {request.url.path} - "
        f"처리 시간: {process_time:.2f}ms - 상태 코드: {response.status_code}"
    )
    
    return response

# 공통 에러 핸들러
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    표준 HTTP 예외를 일관된 응답 형식으로 변환
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "error_code": f"HTTP_{exc.status_code}"
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    모든 예외를 일관된 응답 형식으로 변환
    """
    logger.error(f"처리되지 않은 예외: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "서버 내부 오류가 발생했습니다.",
            "error_code": "INTERNAL_SERVER_ERROR"
        },
    )

# 헬스 체크 엔드포인트
@app.get("/health")
async def health_check():
    """
    서버 상태 확인용 헬스 체크 엔드포인트
    """
    return {"status": "ok", "timestamp": time.time()}

# 기본 경로 리다이렉션
@app.get("/")
async def redirect_to_frontend():
    """
    루트 경로를 프론트엔드 인덱스로 리다이렉션
    """
    return RedirectResponse(url="/index.html")

# 라우터 등록 - 각 라우터에 prefix 추가하여 충돌 방지
app.include_router(auth_router, prefix="/auth", tags=["인증"])
app.include_router(dashboard_router, prefix="/order", tags=["대시보드"])
app.include_router(handover_router, prefix="/handover", tags=["인수인계"])
app.include_router(user_router, prefix="/user", tags=["사용자 관리"])
app.include_router(visualization_router, prefix="/viz", tags=["시각화"])

# 프론트엔드 정적 파일 서빙 설정
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
    logger.info(f"프론트엔드 정적 파일 마운트 경로: {frontend_path}")
else:
    logger.warning(f"프론트엔드 경로를 찾을 수 없습니다: {frontend_path}")

# 직접 실행 시 서버 시작
if __name__ == "__main__":
    logger.info(f"서버를 시작합니다. 포트: {settings.PORT}, 디버그 모드: {settings.DEBUG}")
    # Uvicorn으로 서버 실행
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning",
    )
