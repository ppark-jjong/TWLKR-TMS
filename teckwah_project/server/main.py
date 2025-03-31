# teckwah_project/server/main.py
import asyncio
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from datetime import datetime

from server.config.settings import get_settings
from server.config.database import get_db, SessionLocal
from server.utils.logger import set_request_id, log_info
from server.models.dashboard_lock_model import DashboardLock

# 라우터 가져오기
from server.api.auth_router import router as auth_router
from server.domains.dashboard_router import router as dashboard_router
from server.api.handover_router import router as handover_router  # 인수인계 라우터

settings = get_settings()

# FastAPI 애플리케이션 생성
app = FastAPI(
    title="배송 실시간 관제 시스템",
    description="배송 주문을 실시간으로 관리하는 API",
    version="1.0.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
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
app.include_router(auth_router, prefix="/auth", tags=["인증"])
app.include_router(dashboard_router, prefix="/api", tags=["대시보드"])  # 도메인 기반 라우터 사용
app.include_router(handover_router, tags=["인수인계"])  # 인수인계 라우터 추가 (prefix는 라우터에 정의됨)

# 정적 파일 서빙 - 중요: 이 부분은 SPA 라우팅 처리보다 먼저 와야 함
app.mount("/static", StaticFiles(directory="/app/server/static"), name="static")

# SPA 라우트 처리 (클라이언트 라우팅 지원)
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    # API 요청은 처리하지 않음
    if full_path.startswith("api/") or full_path == "api":
        return {"detail": "Not Found"}
    
    # 그 외 모든 경로는 index.html로 라우팅 (SPA 클라이언트 라우팅)
    # 참고: static 파일은 위의 mount에서 처리되므로 여기서 별도 처리 필요 없음
    return FileResponse("/app/server/static/index.html")

# 헬스체크 엔드포인트
@app.get("/health", tags=["시스템"])
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
