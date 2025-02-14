from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os

from app.api import auth_router, dashboard_router, visualization_router
from app.config.settings import get_settings
from app.config.database import engine, Base, initialize_models
from app.utils.logger import log_info, log_error

settings = get_settings()
# initialize_models()
# 데이터베이스 테이블 생성
# Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
)

# 정적 파일 서빙 설정
app.mount("/static", StaticFiles(directory="static"), name="static")

# API 라우터 등록
app.include_router(auth_router.router, prefix="/auth", tags=["인증"])
app.include_router(dashboard_router.router, prefix="/dashboard", tags=["대시보드"])
app.include_router(
    visualization_router.router, prefix="/visualization", tags=["시각화"]
)


# SPA 라우팅 처리
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # API 요청은 제외
    if full_path.startswith(("auth/", "dashboard/", "visualization/")):
        raise HTTPException(status_code=404, detail="Not found")

    # 정적 파일 요청 처리
    static_file = os.path.join("static", full_path)
    if os.path.isfile(static_file):
        return FileResponse(static_file)

    # 나머지는 index.html로 라우팅
    return FileResponse("static/index.html")
