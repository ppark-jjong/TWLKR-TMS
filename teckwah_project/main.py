import asyncio
import uvicorn
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
import os
import traceback
from datetime import datetime, timedelta
from typing import Dict, Any, List

from main.server.config.database import get_db, init_db
from main.server.api import (
    auth_router,
    dashboard_router,
    dashboard_simple_router,
    dashboard_lock_router,
    visualization_router,
    download_router,
)
from main.server.utils.datetime import get_kst_now
from main.server.utils.logger import setup_logger, log_info, log_error
from main.server.utils.error import error_handler

# 앱 초기화
app = FastAPI(
    title="Teckwah 배송 실시간 관제 시스템",
    description="배송 실시간 관제 시스템 API",
    version="1.0.0",
)

# 로그 설정
setup_logger()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 배포 시 접근 가능한 도메인만 허용하도록 변경 필요
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(auth_router.router, prefix="/api/auth", tags=["인증"])
app.include_router(dashboard_router.router, prefix="/api", tags=["대시보드"])
app.include_router(
    dashboard_simple_router.router, prefix="/api", tags=["대시보드 간소화"]
)
app.include_router(dashboard_lock_router.router, prefix="/api", tags=["대시보드 락"])
app.include_router(visualization_router.router, prefix="/api", tags=["시각화"])
app.include_router(download_router.router, prefix="/api", tags=["데이터 다운로드"])

# 정적 파일 서빙 설정
static_dir = os.path.join(os.path.dirname(__file__), "main", "client", "build")
if os.path.isdir(static_dir):
    app.mount(
        "/static",
        StaticFiles(directory=os.path.join(static_dir, "static")),
        name="static",
    )


# 기본 경로(/) 및 모든 클라이언트 측 라우팅 경로에 대해 리액트 앱 제공
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    index_file = os.path.join(static_dir, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file)
    return {"message": "Frontend is not built yet"}


# 유효성 검증 실패 시 처리
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    error_detail = []
    for error in exc.errors():
        error_detail.append(
            {
                "loc": error.get("loc", []),
                "msg": error.get("msg", ""),
                "type": error.get("type", ""),
            }
        )

    log_error(f"유효성 검증 오류: {error_detail}")

    return {
        "success": False,
        "message": "입력 데이터가 유효하지 않습니다",
        "error_code": "VALIDATION_ERROR",
        "details": error_detail,
        "timestamp": get_kst_now().isoformat(),
    }


# 서버 시작 이벤트 핸들러
@app.on_event("startup")
async def startup_event():
    # 데이터베이스 초기화
    init_db()
    # 백그라운드 태스크 시작
    asyncio.create_task(cleanup_expired_locks_task())
    log_info("서버가 시작되었습니다")


# 서버 종료 이벤트 핸들러
@app.on_event("shutdown")
async def shutdown_event():
    log_info("서버가 종료되었습니다")


# 만료된 락 정리 백그라운드 태스크
async def cleanup_expired_locks_task():
    """만료된 락을 정리하는 백그라운드 태스크"""
    log_info("만료된 락 정리 백그라운드 태스크 시작")
    try:
        while True:
            try:
                # 비동기 컨텍스트에서 DB 세션 관리
                db: Session = next(get_db())

                # 저장 프로시저 호출
                result = db.execute("CALL cleanup_expired_locks()")
                cleaned_locks = result.scalar()

                if cleaned_locks and cleaned_locks > 0:
                    log_info(f"만료된 락 {cleaned_locks}개가 정리되었습니다")

                db.close()
            except Exception as e:
                log_error(f"락 정리 중 오류 발생: {str(e)}")
                traceback.print_exc()

            # 5분마다 실행
            await asyncio.sleep(300)
    except asyncio.CancelledError:
        log_info("만료된 락 정리 태스크가 취소되었습니다")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
