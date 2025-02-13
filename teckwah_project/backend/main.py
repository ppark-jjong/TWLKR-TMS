# backend/main.py

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api import auth_router, dashboard_router, visualization_router
from app.config.settings import get_settings
from app.config.database import Base, engine
from app.config.excel_to_user import import_users
from app.config.excel_to_postalcode import import_postal_codes
from app.utils.logger import log_info, log_error

settings = get_settings()
# 데이터베이스 테이블 생성
Base.metadata.create_all(bind=engine)

# Excel 데이터 초기화
try:
    log_info("Excel 데이터 초기화 시작...")
    import_postal_codes()
    import_users()
    log_info("Excel 데이터 초기화 완료")
except Exception as e:
    log_error(e, "Excel 데이터 초기화 중 오류 발생")

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
app.include_router(
    visualization_router.router, prefix="/visualization", tags=["시각화"]
)


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if "." in full_path:  # 정적 파일 요청 처리
        return FileResponse(f"static/{full_path}")
    return FileResponse("static/index.html")
