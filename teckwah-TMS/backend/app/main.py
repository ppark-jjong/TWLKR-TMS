"""
FastAPI 메인 애플리케이션
"""
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.utils.logger import logger
import os
from datetime import datetime, timedelta
import uvicorn

from app.config import get_settings
from app.database import Base, engine
from app.middleware.error import ErrorHandlerMiddleware
from app.routes import auth, dashboard, handover, visualization, user, postal_code
from app.utils.security import cleanup_expired_sessions

# 설정 로드
settings = get_settings()

# 로거는 이미 utils/logger.py에서 초기화됨

# FastAPI 앱 생성
app = FastAPI(
    title="배송 실시간 관제 시스템 API",
    description="배송 관리 및 실시간 관제 기능을 제공하는 API",
    version="1.0.0",
    docs_url=None if not settings.DEBUG else "/docs",
    redoc_url=None if not settings.DEBUG else "/redoc",
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

# 주기적인 세션 정리 작업 (백그라운드 태스크)
@app.on_event("startup")
async def startup_event():
    # 로그 디렉토리 생성
    import os
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
    os.makedirs(log_dir, exist_ok=True)
    
    # 애플리케이션 시작 로그
    logger.info("배송 실시간 관제 시스템 API 시작")
    
    # 세션 정리 작업 예약
    # Note: 실제 프로덕션에서는 APScheduler 같은 도구 사용 권장
    cleanup_expired_sessions()

# 종료 처리
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("배송 실시간 관제 시스템 API 종료")

# 라우터 등록
app.include_router(auth.router, prefix="/auth", tags=["인증"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["대시보드"])
app.include_router(handover.router, prefix="/handover", tags=["인수인계"])
app.include_router(visualization.router, prefix="/visualization", tags=["시각화"])
app.include_router(user.router, prefix="/users", tags=["사용자 관리"])
app.include_router(postal_code.router, prefix="/postal-codes", tags=["우편번호"])

# 상태 체크 엔드포인트
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

# 기본 경로
@app.get("/")
async def root():
    return {
        "message": "배송 실시간 관제 시스템 API",
        "docs": "/docs" if settings.DEBUG else None
    }

# 프론트엔드 정적 파일 서빙 (Docker 통합 배포용)
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "../frontend/build")
if os.path.exists(frontend_path):
    logger.info(f"프론트엔드 정적 파일 서빙 활성화: {frontend_path}")
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
else:
    logger.warning(f"프론트엔드 정적 파일 경로를 찾을 수 없습니다: {frontend_path}")

# 서버 실행 (직접 실행 시)
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG
    )
