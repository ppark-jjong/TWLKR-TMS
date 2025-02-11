# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import auth_router, dashboard_router, visualization_router
from app.config.settings import get_settings
from app.config.database import Base, engine
from app.config.excel_to_driver import import_drivers
from app.config.excel_to_user import import_users
from app.config.excel_to_postalcode import import_postal_codes
from app.utils.logger_util import Logger
settings = get_settings()
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

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc",
)


# 정적 파일 서빙 (React 빌드 파일)
app.mount("/static", StaticFiles(directory="static"), name="static")

# 라우터 등록
app.include_router(auth_router.router, prefix="/auth", tags=["인증"])
app.include_router(dashboard_router.router, prefix="/dashboard", tags=["대시보드"])
app.include_router(visualization_router.router, prefix="/visualization", tags=["시각화"])

@app.get("/")
async def root():
    """서버 상태 확인용 엔드포인트"""
    return {
        "status": "running",
        "project": settings.PROJECT_NAME,
        "version": "1.0.0"
    }