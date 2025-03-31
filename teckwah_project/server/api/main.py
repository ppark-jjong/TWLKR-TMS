from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
import os
import time

from server.api.auth_router import router as auth_router
from server.api.dashboard_router import router as dashboard_router
from server.api.dashboard_lock_router import router as dashboard_lock_router
from server.api.download_router import router as download_router
from server.api.handover_router import router as handover_router
from server.api.user_router import router as user_router

from server.utils.common import build_error_response
from server.utils.logger import log_error, log_request, setup_logger
from server.utils.error import CustomException
from server.config.database import Base, engine
from server.config.settings import get_settings

# 로거 초기화
setup_logger()

# 설정 가져오기
settings = get_settings()

# 데이터베이스 테이블 생성
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="배송 관제 시스템 API",
    description="배송 주문 관리 및 모니터링을 위한 API",
    version="1.0.0",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경에서는 모든 출처 허용 (배포 시 변경 필요)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 미들웨어: 요청 로깅
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # 요청 로깅
    await log_request(request)
    
    # 응답 처리
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response
    except Exception as e:
        # 예외 처리 및 로깅
        log_error(e, "요청 처리 중 예외 발생")
        
        if isinstance(e, CustomException):
            return JSONResponse(
                status_code=e.status_code,
                content=build_error_response(e.detail, e.error_code),
            )
        
        # 기타 예외
        return JSONResponse(
            status_code=500,
            content=build_error_response("서버 내부 오류가 발생했습니다", "INTERNAL_ERROR"),
        )

# 라우터 등록
app.include_router(auth_router, prefix="/auth", tags=["인증"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["대시보드"])
app.include_router(dashboard_lock_router, prefix="/dashboard-lock", tags=["락 관리"])
app.include_router(download_router, prefix="/download", tags=["다운로드"])
app.include_router(handover_router, prefix="/handover", tags=["인수인계"])
app.include_router(user_router, prefix="/user", tags=["사용자 관리"])

# 정적 파일 제공 설정
static_dir = "/app/server/static"
if os.path.exists(static_dir):
    # /static 경로로 정적 파일 서빙
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    
    # SPA 라우트 처리 (클라이언트 라우팅 지원)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # API 경로는 처리하지 않음
        if full_path.startswith(("auth/", "dashboard/", "dashboard-lock/", "download/", "handover/", "user/", "health")):
            raise HTTPException(status_code=404, detail="Not Found")
        
        # 정적 파일 제공
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        else:
            log_error(None, f"index.html not found at {index_path}")
            return JSONResponse(
                status_code=404, 
                content={"detail": "Frontend not built"}
            )
else:
    log_error(None, f"Static directory not found at {static_dir}")

# 헬스 체크 엔드포인트
@app.get("/health", tags=["시스템"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}

# CORS 프리플라이트 요청 처리
@app.options("/{full_path:path}")
async def options_handler():
    return {}

# 개발 서버 구성
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="0.0.0.0", port=8000, reload=True) 