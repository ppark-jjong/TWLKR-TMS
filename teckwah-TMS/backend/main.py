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
    postal_code,
)
from backend.utils.security import cleanup_expired_sessions

# 설정 로드
settings = get_settings()


# Lifespan 컨텍스트 매니저 정의 (on_event 대체)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 애플리케이션 시작 시 실행될 코드
    logger.info("배송 실시간 관제 시스템 API 시작")

    # 세션 정리 작업 예약
    cleanup_expired_sessions()
    
    # 만료된 락 정리
    db = next(get_db())
    expired_locks_count = release_expired_locks(db)
    if expired_locks_count > 0:
        logger.info(f"만료된 락 {expired_locks_count}개 해제 완료")

    # 컨텍스트 양보
    yield

    # 애플리케이션 종료 시 실행될 코드
    logger.info("배송 실시간 관제 시스템 API 종료")


# FastAPI 앱 생성
app = FastAPI(
    title="배송 실시간 관제 시스템 API",
    description="배송 관리 및 실시간 관제 기능을 제공하는 API",
    version="1.0.0",
    docs_url=None if not settings.DEBUG else "/docs",
    redoc_url=None if not settings.DEBUG else "/redoc",
    lifespan=lifespan,  # lifespan 컨텍스트 매니저 등록
)

# 미들웨어 추가
app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터베이스 테이블 생성 (자동 마이그레이션)
# 주의: 개발용으로만 사용하고, 프로덕션에서는 Alembic 등 사용 권장
# Base.metadata.create_all(bind=engine)

# 라우터 등록
app.include_router(auth.router, prefix="/auth", tags=["인증"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["대시보드"])
app.include_router(handover.router, prefix="/handover", tags=["인수인계"])
app.include_router(visualization.router, prefix="/visualization", tags=["시각화"])
app.include_router(user.router, prefix="/users", tags=["사용자 관리"])
app.include_router(postal_code.router, prefix="/postal-codes", tags=["우편번호"])  # 우편번호 API 최소화 (대시보드 연동용으로만 유지)


# 상태 체크 엔드포인트
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
    }


# 기본 경로
@app.get("/api")
async def root():
    return {
        "message": "배송 실시간 관제 시스템 API",
        "docs": "/docs" if settings.DEBUG else None,
    }


# SPA 라우팅을 위한 폴백 미들웨어
@app.middleware("http")
async def spa_middleware(request: Request, call_next):
    response = await call_next(request)
    
    # API 경로가 아니고 404 응답인 경우 index.html로 폴백
    if response.status_code == 404 and not request.url.path.startswith(("/auth", "/dashboard", "/handover", "/visualization", "/users", "/postal-codes", "/health", "/api", "/static")):
        # 프론트엔드 경로 확인
        frontend_path = os.path.join(os.path.dirname(__file__), "../frontend")
        if not os.path.exists(frontend_path):
            frontend_path = "/app/frontend"
        
        index_path = os.path.join(frontend_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
    
    return response


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
