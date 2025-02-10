# backend/main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
from app.api import auth_api, dashboard_api, driver_api, visualization_api
from app.config.database import Base, engine
from app.config.excel_to_driver import import_drivers
from app.config.excel_to_user import import_users
from app.config.excel_to_postalcode import import_postal_codes
from app.utils.logger_util import Logger

# 데이터베이스 테이블 생성
Base.metadata.create_all(bind=engine)

# Excel 데이터 초기화
try:
    Logger.info("Excel 데이터 초기화 시작...")
    import_postal_codes()
    import_drivers()
    import_users()
    Logger.info("Excel 데이터 초기화 완료")
except Exception as e:
    Logger.error(f"Excel 데이터 초기화 중 오류 발생: {str(e)}")

app = FastAPI(title="배송 실시간 관제 시스템")

# API 라우터 등록
app.include_router(auth_api.router)
app.include_router(dashboard_api.router)
app.include_router(driver_api.router)
app.include_router(visualization_api.router)

# 정적 파일 서빙 설정
app.mount("/static", StaticFiles(directory="static", html=True), name="static")

# 파비콘 라우트
@app.get("/favicon.ico")
async def get_favicon():
    """파비콘 제공"""
    return FileResponse("static/favicon.ico")

# React 앱의 메인 HTML 파일 서빙
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """
    프론트엔드 라우팅 처리
    React Router의 클라이언트 사이드 라우팅을 위해 모든 경로에서 index.html 반환
    """
    # API 경로는 무시
    if full_path.startswith(("auth/", "dashboard/", "visualization/", "drivers/")):
        return None

    # 정적 파일이면 무시
    if full_path.startswith("static/"):
        return None

    # index.html 반환
    return FileResponse("static/index.html")

# 로깅 설정
Logger.info("서버 시작")