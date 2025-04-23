"""
오류 처리 미들웨어
"""

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR

from backend.utils.logger import logger
from backend.schemas.common import ErrorResponse
import traceback


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    전역 오류 처리 미들웨어
    - 처리되지 않은 예외를 캐치하여 일관된 오류 응답 반환
    """
    
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            # 에러 로깅
            logger.error(f"처리되지 않은 예외 발생: {str(e)}")
            logger.error(traceback.format_exc())
            
            # 에러 응답 생성
            error_response = ErrorResponse(
                success=False,
                message="서버 내부 오류가 발생했습니다",
                error_code="INTERNAL_SERVER_ERROR"
            )
            
            # JSON 응답 반환
            return JSONResponse(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                content=error_response.model_dump()
            )
