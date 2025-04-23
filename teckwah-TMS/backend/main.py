"""
배송 실시간 관제 시스템 메인 애플리케이션
"""

import os
import logging
import uvicorn
from fastapi import FastAPI, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse
from contextlib import asynccontextmanager
import time

# 유틸리티 및 설정
from backend.utils.config import get_settings
from backend.utils.logger import logger
from backend.utils.database import get_db, test_db_connection
from backend.utils.security import get_session

# 라우터 임포트
from backend.routes.auth_route import router as auth_router
from backend.routes.dashboard_route import router as dashboard_router
from backend.routes.handover_route import router as handover_router
from backend.routes.user_route import router as user_router
from backend.routes.visualization_route import router as visualization_router

# 설정 로드
settings = get_settings()

# 템플릿 및 정적 파일 경로 설정
templates_path = os.path.join(os.path.dirname(__file__), "templates")
static_path = os.path.join(os.path.dirname(__file__), "static")

# Jinja2 템플릿 설정
templates = Jinja2Templates(directory=templates_path)


# lifespan 이벤트 핸들러 (FastAPI 최신 방식)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 애플리케이션 시작 시 실행되는 코드
    logger.info("애플리케이션 시작 중...")

    # 템플릿 및 정적 파일 디렉토리 확인
    if not os.path.exists(templates_path):
        logger.warning(f"템플릿 디렉토리가 존재하지 않습니다: {templates_path}")
        os.makedirs(templates_path, exist_ok=True)

    if not os.path.exists(static_path):
        logger.warning(f"정적 파일 디렉토리가 존재하지 않습니다: {static_path}")
        os.makedirs(static_path, exist_ok=True)

    # 데이터베이스 연결 테스트
    if test_db_connection():
        logger.info("데이터베이스 연결 확인 완료")
    else:
        logger.error("데이터베이스 연결 실패")
        # 디버그 모드가 아니라면 서버를 종료
        if not settings.DEBUG:
            logger.critical("데이터베이스 연결 실패로 서버를 종료합니다.")
            # 비동기 컨텍스트에서 프로세스를 종료하는 것은 권장되지 않으므로
            # 예외를 발생시켜 서버 시작을 중단합니다.
            raise Exception("데이터베이스 연결 실패")

    logger.info(f"서버가 시작되었습니다: http://localhost:{settings.PORT}")
    if settings.DEBUG:
        logger.info(f"API 문서: http://localhost:{settings.PORT}/docs")

    yield

    # 애플리케이션 종료 시 실행되는 코드
    logger.info("애플리케이션 종료 중...")
    # 필요한 정리 작업 수행

    logger.info("애플리케이션이 정상적으로 종료되었습니다.")


# FastAPI 앱 생성
app = FastAPI(
    title="TWLRK-TMS",
    description="배송 실시간 관제 시스템 API",
    version="1.0.0",
    docs_url=None if not settings.DEBUG else "/docs",
    redoc_url=None if not settings.DEBUG else "/redoc",
    lifespan=lifespan,
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 세션 미들웨어 설정
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SESSION_SECRET,
    max_age=settings.SESSION_EXPIRE_HOURS * 3600,  # 시간을 초로 변환
)


# 요청 시간 로깅 미들웨어
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    요청 처리 시간을 로깅하는 미들웨어
    """
    start_time = time.time()

    # 요청 정보 로깅
    logger.info(f"요청 시작: {request.method} {request.url.path}")

    response = await call_next(request)

    # 처리 시간 계산 및 로깅
    process_time = (time.time() - start_time) * 1000
    logger.info(
        f"요청 완료: {request.method} {request.url.path} - "
        f"처리 시간: {process_time:.2f}ms - 상태 코드: {response.status_code}"
    )

    return response


# 공통 에러 핸들러
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    표준 HTTP 예외를 일관된 응답 형식으로 변환
    """
    if request.headers.get("accept") == "application/json":
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.detail,
                "error_code": f"HTTP_{exc.status_code}",
            },
        )
    else:
        # HTML 응답을 요청한 경우 에러 페이지 렌더링
        return templates.TemplateResponse(
            "error.html",
            {"request": request, "error_code": exc.status_code, "message": exc.detail},
            status_code=exc.status_code,
        )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    모든 예외를 일관된 응답 형식으로 변환
    """
    logger.error(f"처리되지 않은 예외: {str(exc)}", exc_info=True)

    if request.headers.get("accept") == "application/json":
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "서버 내부 오류가 발생했습니다.",
                "error_code": "INTERNAL_SERVER_ERROR",
            },
        )
    else:
        # HTML 응답을 요청한 경우 에러 페이지 렌더링
        return templates.TemplateResponse(
            "error.html",
            {
                "request": request,
                "error_code": 500,
                "message": "서버 내부 오류가 발생했습니다.",
            },
            status_code=500,
        )


# 헬스 체크 엔드포인트
@app.get("/health")
async def health_check():
    """
    서버 상태 확인용 헬스 체크 엔드포인트
    """
    return {"status": "ok", "timestamp": time.time()}


# 로그인 페이지 라우트
@app.get("/login")
async def login_page(request: Request):
    """
    로그인 페이지 제공
    """
    # 이미 로그인된 경우 대시보드로 리다이렉션
    session_id = request.cookies.get("session_id")
    session_data = get_session(session_id)

    if session_data:
        return RedirectResponse(url="/dashboard", status_code=303)

    return templates.TemplateResponse(
        "login.html", {"request": request, "error": None, "debug": settings.DEBUG}
    )


# 대시보드 페이지 라우트
@app.get("/dashboard")
async def dashboard_page(request: Request):
    """
    대시보드 페이지 제공
    """
    # 로그인 확인
    session_id = request.cookies.get("session_id")
    session_data = get_session(session_id)

    if not session_data:
        return RedirectResponse(url="/login", status_code=303)

    # 쿼리 파라미터에서 필터 정보 가져오기
    filter_params = {
        "date_range": request.query_params.get("date_range", "today"),
        "status": request.query_params.get("status", "all"),
        "search_type": request.query_params.get("search_type", "order_id"),
        "search_value": request.query_params.get("search_value", ""),
    }

    # date_range가 custom인 경우 시작일과 종료일 추가
    if filter_params["date_range"] == "custom":
        filter_params["start_date"] = request.query_params.get("start_date", "")
        filter_params["end_date"] = request.query_params.get("end_date", "")

    # 주문 데이터와 드라이버 목록은 실제로는 서비스에서 조회
    # 여기서는 예시 데이터 사용
    orders = []  # dashboard_service.get_orders(filter_params)
    drivers = []  # driver_service.get_available_drivers()

    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "user": session_data,
            "filter": filter_params,
            "orders": orders,
            "drivers": drivers,
        },
    )


# 인수인계 페이지 라우트
@app.get("/handover")
async def handover_page(request: Request):
    """
    인수인계 페이지 제공
    """
    # 로그인 확인
    session_id = request.cookies.get("session_id")
    session_data = get_session(session_id)

    if not session_data:
        return RedirectResponse(url="/login", status_code=303)

    # 쿼리 파라미터에서 필터 정보 가져오기
    filter_params = {
        "date_range": request.query_params.get("date_range", "today"),
        "search_type": request.query_params.get("search_type", "title"),
        "search_value": request.query_params.get("search_value", ""),
    }

    # date_range가 custom인 경우 시작일과 종료일 추가
    if filter_params["date_range"] == "custom":
        filter_params["start_date"] = request.query_params.get("start_date", "")
        filter_params["end_date"] = request.query_params.get("end_date", "")

    # 페이지네이션 정보
    page = int(request.query_params.get("page", "1"))

    # 인수인계 데이터는 실제로는 서비스에서 조회
    # 여기서는 예시 데이터 사용
    handovers = []  # handover_service.get_handovers(filter_params, page)
    total_pages = 1  # 전체 페이지 수

    return templates.TemplateResponse(
        "handover.html",
        {
            "request": request,
            "user": session_data,
            "filter": filter_params,
            "handovers": handovers,
            "current_page": page,
            "total_pages": total_pages,
        },
    )


# 시각화 페이지 라우트
@app.get("/visualization")
async def visualization_page(request: Request):
    """
    시각화 페이지 제공 (관리자 전용)
    """
    # 로그인 확인
    session_id = request.cookies.get("session_id")
    session_data = get_session(session_id)

    if not session_data:
        return RedirectResponse(url="/login", status_code=303)

    # 관리자 권한 확인
    if session_data.get("user_role") != "ADMIN":
        return templates.TemplateResponse(
            "error.html",
            {
                "request": request,
                "error_code": 403,
                "message": "관리자만 접근할 수 있습니다.",
            },
            status_code=403,
        )

    # 요약 정보는 실제로는 서비스에서 조회
    # 여기서는 예시 데이터 사용
    summary = {
        "total_orders": 100,
        "completed_orders": 65,
        "in_progress_orders": 25,
        "pending_orders": 10,
    }

    return templates.TemplateResponse(
        "visualization.html",
        {"request": request, "user": session_data, "summary": summary},
    )


# 사용자 관리 페이지 라우트
@app.get("/users")
async def users_page(request: Request):
    """
    사용자 관리 페이지 제공 (관리자 전용)
    """
    # 로그인 확인
    session_id = request.cookies.get("session_id")
    session_data = get_session(session_id)

    if not session_data:
        return RedirectResponse(url="/login", status_code=303)

    # 관리자 권한 확인
    if session_data.get("user_role") != "ADMIN":
        return templates.TemplateResponse(
            "error.html",
            {
                "request": request,
                "error_code": 403,
                "message": "관리자만 접근할 수 있습니다.",
            },
            status_code=403,
        )

    # 쿼리 파라미터에서 필터 정보 가져오기
    filter_params = {
        "role": request.query_params.get("role", "all"),
        "search_type": request.query_params.get("search_type", "user_id"),
        "search_value": request.query_params.get("search_value", ""),
    }

    # 페이지네이션 정보
    page = int(request.query_params.get("page", "1"))

    # 사용자 데이터는 실제로는 서비스에서 조회
    # 여기서는 예시 데이터 사용
    users = []  # user_service.get_users(filter_params, page)
    total_pages = 1  # 전체 페이지 수

    return templates.TemplateResponse(
        "users.html",
        {
            "request": request,
            "user": session_data,
            "filter": filter_params,
            "users": users,
            "current_page": page,
            "total_pages": total_pages,
        },
    )


# 기본 경로 리다이렉션
@app.get("/")
async def redirect_to_dashboard():
    """
    루트 경로를 대시보드로 리다이렉션
    """
    return RedirectResponse(url="/dashboard", status_code=303)


# 라우터 등록
app.include_router(auth_router, prefix="/auth", tags=["인증"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["대시보드"])
app.include_router(handover_router, prefix="/handover", tags=["인수인계"])
app.include_router(user_router, prefix="/users", tags=["사용자 관리"])
app.include_router(visualization_router, prefix="/visualization", tags=["시각화"])

# 정적 파일 서빙 설정
app.mount("/static", StaticFiles(directory=static_path), name="static")

# 직접 실행 시 서버 시작
if __name__ == "__main__":
    logger.info(
        f"서버를 시작합니다. 포트: {settings.PORT}, 디버그 모드: {settings.DEBUG}"
    )
    # Uvicorn으로 서버 실행
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning",
    )
