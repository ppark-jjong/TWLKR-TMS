# teckwah_project/server/main.py
import asyncio
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from datetime import datetime
from contextlib import asynccontextmanager

from server.config.settings import get_settings
from server.config.database import get_db, SessionLocal
from server.utils.logger import set_request_id, log_info

# API 라우터 가져오기
from server.api.auth_router import router as auth_router
from server.api.dashboard_router import router as dashboard_router
from server.api.download_router import router as download_router
from server.api.handover_router import router as handover_router  # 인수인계 라우터 추가

settings = get_settings()

# Lifespan 이벤트 핸들러 정의 (FastAPI 0.109.0+)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시 실행할 코드
    log_info("애플리케이션이 시작되었습니다")
    yield
    # 종료 시 실행할 코드
    log_info("애플리케이션이 종료되었습니다")

# FastAPI 애플리케이션 생성 (lifespan 이벤트 핸들러 적용)
app = FastAPI(
    title="배송 실시간 관제 시스템",
    description="배송 주문을 실시간으로 관리하는 API",
    version="1.0.0",

    lifespan=lifespan
)

# CORS 설정
origins = settings.CORS_ORIGINS
log_info(f"CORS 허용 출처: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)


# 요청 ID 미들웨어
@app.middleware("http")
async def request_middleware(request: Request, call_next):
    # 요청 ID 생성 및 설정
    request_id = set_request_id()
    request.state.request_id = request_id

    # 요청 처리 및 응답 반환
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id

    return response


# 라우터 등록
app.include_router(auth_router, prefix="/auth", tags=["인증"])
app.include_router(dashboard_router, prefix="", tags=["대시보드"])
app.include_router(download_router, prefix="/download", tags=["다운로드"])
app.include_router(handover_router, tags=["인수인계"])  # 인수인계 라우터 추가 (prefix는 라우터에 정의됨)

# 정적 파일 서비스 설정 - 빌드 파일이 있는 루트 디렉토리를 먼저 마운트
app.mount("/", StaticFiles(directory="/app/server/static", html=True), name="root")
# 기존 /static 경로도 유지하여 하위 경로 호환성 보장
app.mount("/static", StaticFiles(directory="/app/server/static"), name="static")

# 헬스체크 엔드포인트
@app.get("/health", tags=["시스템"])
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# 애플리케이션이 실행 중일 때만 실행
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "server.main:app", host="0.0.0.0", port=settings.API_PORT, reload=settings.DEBUG
    )
