"""
오류 처리 미들웨어
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.base import BaseHTTPMiddleware
import traceback
from backend.utils.logger import logger


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    전역 오류 처리 미들웨어
    """

    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except SQLAlchemyError as e:
            # DB 오류 로깅 및 처리
            error_detail = str(e)
            logger.error(f"데이터베이스 오류: {error_detail}")
            logger.debug(traceback.format_exc())

            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "success": False,
                    "error_code": "DATABASE_ERROR",
                    "message": "데이터베이스 처리 중 오류가 발생했습니다",
                },
            )
        except Exception as e:
            # 일반 오류 로깅 및 처리
            error_detail = str(e)
            logger.error(f"서버 오류: {error_detail}")
            logger.debug(traceback.format_exc())

            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "success": False,
                    "error_code": "SERVER_ERROR",
                    "message": "서버 처리 중 오류가 발생했습니다",
                },
            )
