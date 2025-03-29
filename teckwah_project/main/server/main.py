# teckwah_project/main/server/main.py
import asyncio
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from main.server.config.settings import get_settings
from main.server.config.database import get_db, SessionLocal
from main.server.utils.logger import set_request_id, log_info
from main.server.models.dashboard_lock_model import DashboardLock

# API 라우터 가져오기
from main.server.api.auth_router import router as auth_router
from main.server.api.dashboard_router import router as dashboard_router
from main.server.api.dashboard_simple_router import router as dashboard_simple_router
from main.server.api.dashboard_lock_router import router as dashboard_lock_router
from main.server.api.visualization_router import router as visualization_router
from main.server.api.download_router import router as download_router

settings = get_settings()

# FastAPI 애플리케이션 생성
app = FastAPI(
    title="배송 실시간 관제 시스템",
    description="배송 주문을 실시간으로 관리하는 API",
    version="1.0.0",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 환경에서는 구체적인 출처로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
app.include_router(auth_router, prefix="/api/auth", tags=["인증"])
app.include_router(dashboard_router, prefix="/api", tags=["대시보드"])
app.include_router(dashboard_simple_router, prefix="/api", tags=["대시보드 (간소화)"])
app.include_router(dashboard_lock_router, prefix="/api/dashboard", tags=["대시보드 락"])
app.include_router(visualization_router, prefix="/api/visualization", tags=["시각화"])
app.include_router(download_router, prefix="/api/download", tags=["다운로드"])


# 헬스체크 엔드포인트
@app.get("/api/health", tags=["시스템"])
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# 백그라운드 작업 - 만료된 락 정리
async def cleanup_expired_locks():
    while True:
        try:
            db = SessionLocal()
            try:
                # 현재 시간 기준 만료된 락 정리
                now = datetime.now()
                result = (
                    db.query(DashboardLock)
                    .filter(DashboardLock.expires_at < now)
                    .delete(synchronize_session=False)
                )

                if result > 0:
                    log_info(f"만료된 락 정리 완료: {result}건")

                db.commit()
            except Exception as e:
                db.rollback()
                log_info(f"락 정리 중 오류 발생: {str(e)}")
            finally:
                db.close()
        except Exception as e:
            log_info(f"락 정리 작업 자체 오류: {str(e)}")

        # 설정된 간격으로 대기
        await asyncio.sleep(settings.LOCK_CLEANUP_INTERVAL_MINUTES * 60)


# 시작 이벤트 핸들러
@app.on_event("startup")
async def startup_event():
    # 백그라운드 작업 시작
    asyncio.create_task(cleanup_expired_locks())
    log_info("애플리케이션이 시작되었습니다")


# 애플리케이션이 실행 중일 때만 실행
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app", host="0.0.0.0", port=settings.API_PORT, reload=settings.DEBUG
    )
