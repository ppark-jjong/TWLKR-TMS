# teckwah_project/server/main.py
import asyncio
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from datetime import datetime
import os
import os.path
import traceback
import time
import json

from server.config.settings import get_settings
from server.config.database import get_db, SessionLocal
from server.utils.logger import set_request_id, log_info, log_error, log_debug, log_warning

# API 라우터 가져오기
from server.api.auth_router import router as auth_router
from server.api.dashboard_router import router as dashboard_router
from server.api.download_router import router as download_router
from server.api.handover_router import router as handover_router  # 인수인계 라우터 추가

settings = get_settings()

# 디버그 모드 확인
is_debug = settings.DEBUG
env_mode = os.environ.get("BUILD_MODE", "production")
log_info(f"애플리케이션 시작: 모드={env_mode}, 디버그={is_debug}")

# FastAPI 애플리케이션 생성 - 프로덕션 환경에서는 문서 비활성화
docs_url = "/docs" if is_debug else None
redoc_url = "/redoc" if is_debug else None
openapi_url = "/openapi.json" if is_debug else None

app = FastAPI(
    title="배송 실시간 관제 시스템",
    description="배송 주문을 실시간으로 관리하는 API",
    version="1.0.0",
    openapi_url=openapi_url,
    docs_url=docs_url,
    redoc_url=redoc_url,
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
    
    # 요청 시작 시간 기록
    start_time = time.time()
    
    # 디버그 모드에서 요청 내용 로깅
    path = request.url.path
    is_api_request = path.startswith("/auth") or path.startswith("/api") or path.startswith("/dashboard") or path.startswith("/download")
    
    if is_api_request:
        log_info(f"API 요청: {request.method} {path} [ID: {request_id}]")
        
        # 디버그 모드에서만 요청 헤더와 바디를 로깅
        if is_debug:
            # 요청 헤더 로깅
            headers = dict(request.headers)
            # 민감한 정보 필터링
            if "authorization" in headers:
                headers["authorization"] = "FILTERED"
            if "cookie" in headers:
                headers["cookie"] = "FILTERED"
                
            # 요청 바디 로깅 시도 (GET 요청은 바디가 없으므로 스킵)
            if request.method != "GET":
                try:
                    # 바디 읽기 (FastAPI에서는 이를 한 번만 할 수 있음)
                    body = await request.body()
                    request._body = body  # 바디 재설정
                    
                    if body:
                        try:
                            # JSON 형식 확인 및 로깅
                            payload = json.loads(body)
                            # 민감한 정보 필터링
                            if isinstance(payload, dict):
                                if "password" in payload:
                                    payload["password"] = "FILTERED"
                                if "token" in payload:
                                    payload["token"] = "FILTERED"
                            log_debug(f"요청 바디: {payload}")
                        except:
                            # 바이너리 데이터 등의 경우 크기만 로깅
                            log_debug(f"요청 바디: <바이너리 또는 비 JSON 데이터, 크기: {len(body)} 바이트>")
                except Exception as e:
                    log_warning(f"요청 바디 로깅 실패: {str(e)}")
    
    try:
        # 요청 처리 및 응답 반환
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        
        # 처리 시간 계산 및 응답 로깅
        process_time = time.time() - start_time
        
        if is_api_request:
            log_info(f"API 응답: {request.method} {path} - 상태 코드: {response.status_code}, 처리 시간: {process_time:.4f}초")
            
            # 응답 내용 로깅 (디버그 모드에서만)
            if is_debug and response.status_code != 200:
                # 오류 응답만 상세 로깅 (성공 응답은 너무 많은 데이터가 될 수 있음)
                log_debug(f"오류 응답: {response.status_code} - {path}")
                
        # 처리 시간이 너무 긴 경우 경고 로깅
        if process_time > 1.0:  # 1초 이상 소요된 요청
            log_warning(f"느린 요청 감지: {request.method} {path} - 처리 시간: {process_time:.4f}초")
            
        return response
    except Exception as e:
        # 예외 발생 시 로깅
        process_time = time.time() - start_time
        log_error(f"요청 처리 중 오류 발생: {request.url.path} - {str(e)}")
        
        if is_debug:
            log_debug(f"예외 스택 트레이스:\n{traceback.format_exc()}")
        
        # 클라이언트에 오류 응답 반환
        return JSONResponse(
            status_code=500,
            content={
                "success": False, 
                "error_code": "SERVER_ERROR", 
                "message": str(e) if is_debug else "서버 오류가 발생했습니다",
                "request_id": request_id  # 요청 ID를 응답에 포함하여 추적 가능하게 함
            }
        )


# 라우터 등록
app.include_router(auth_router, prefix="/auth", tags=["인증"])
app.include_router(dashboard_router, prefix="", tags=["대시보드"])
app.include_router(download_router, prefix="/download", tags=["다운로드"])
app.include_router(handover_router, tags=["인수인계"])  # 인수인계 라우터 추가 (prefix는 라우터에 정의됨)

# 정적 파일 디렉토리 확인 및 생성
static_dir = "/app/server/static"
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)
    log_info(f"Static 디렉토리가 없어 생성했습니다: {static_dir}")

# 정적 파일 서빙 - 중요: 이 부분은 SPA 라우팅 처리보다 먼저 와야 함
try:
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    log_info(f"정적 파일 서비스 마운트 완료: {static_dir}")
    
    # 디버그 모드에서 정적 파일 목록 로깅
    if is_debug:
        try:
            static_files = os.listdir(static_dir)
            log_debug(f"정적 파일 목록: {len(static_files)}개 파일")
            if static_files:
                # 최대 10개 파일만 로깅
                files_to_log = static_files[:10]
                if len(static_files) > 10:
                    files_to_log.append("... 외 더 많은 파일")
                log_debug(f"정적 파일 샘플: {files_to_log}")
        except Exception as e:
            log_warning(f"정적 파일 목록 로깅 실패: {str(e)}")
except Exception as e:
    log_error(f"정적 파일 서비스 마운트 오류: {str(e)}")

# favicon.ico 경로 처리
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    # 먼저 서버 루트에서 favicon을 찾고, 없으면 static 디렉토리에서 찾음
    favicon_path = "/app/server/favicon.ico"
    static_favicon_path = "/app/server/static/favicon.ico"
    
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path)
    elif os.path.exists(static_favicon_path):
        return FileResponse(static_favicon_path)
    else:
        raise HTTPException(status_code=404, detail="Favicon not found")

# SPA 라우트 처리 (클라이언트 라우팅 지원)
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    # API 요청은 처리하지 않음
    if full_path.startswith("auth/") or full_path.startswith("dashboard/"):
        return {"detail": "Not Found"}
    
    # 그 외 모든 경로는 index.html로 라우팅 (SPA 클라이언트 라우팅)
    index_path = "/app/server/static/index.html"
    
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        log_error(f"index.html을 찾을 수 없습니다: {index_path}")
        # 파일이 없는 경우 에러 메시지
        return JSONResponse(
            status_code=404,
            content={
                "success": False, 
                "error_code": "NOT_FOUND", 
                "message": "프론트엔드 파일을 찾을 수 없습니다. 빌드가 올바르게 생성되었는지 확인하세요."
            }
        )

# 헬스체크 엔드포인트
@app.get("/health", tags=["시스템"])
async def health_check():
    return {
        "status": "ok", 
        "timestamp": datetime.now().isoformat(),
        "mode": env_mode,
        "debug": is_debug
    }


# 시작 이벤트 핸들러
@app.on_event("startup")
async def startup_event():
    log_info("애플리케이션이 시작되었습니다")
    
    # 환경 정보 로깅
    env_info = {
        "debug": is_debug,
        "mode": env_mode,
        "python_path": os.environ.get("PYTHONPATH", ""),
        "host": os.environ.get("MYSQL_HOST", ""),
    }
    log_info("환경 설정", env_info)


# 종료 이벤트 핸들러
@app.on_event("shutdown")
async def shutdown_event():
    log_info("애플리케이션이 종료됩니다")


# 애플리케이션이 실행 중일 때만 실행
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app", host="0.0.0.0", port=settings.API_PORT, reload=settings.DEBUG
    )
