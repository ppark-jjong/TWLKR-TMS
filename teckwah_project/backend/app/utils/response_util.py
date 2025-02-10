from typing import Any, Optional, Dict, Union
from fastapi.responses import JSONResponse
from fastapi import status


def create_response(
    status_code: int = status.HTTP_200_OK,
    success: bool = True,
    data: Any = None,
    message: Optional[str] = None,
    error: Optional[str] = None,
) -> Dict[str, Any]:
    """
    표준화된 API 응답 생성

    Args:
        status_code: HTTP 상태 코드
        success: 성공 여부
        data: 응답 데이터
        message: 응답 메시지
        error: 에러 메시지

    Returns:
        표준화된 응답 딕셔너리
    """
    response = {
        "success": success,
        "data": data,
        "message": message,
        "error": error,
    }

    return JSONResponse(
        status_code=status_code,
        content=response,
    )


def success_response(
    data: Any = None,
    message: str = "성공적으로 처리되었습니다.",
    status_code: int = status.HTTP_200_OK,
) -> JSONResponse:
    """성공 응답 생성"""
    return create_response(
        status_code=status_code,
        success=True,
        data=data,
        message=message,
    )


def error_response(
    message: str = "요청을 처리하는 중 오류가 발생했습니다.",
    error: Optional[str] = None,
    status_code: int = status.HTTP_400_BAD_REQUEST,
) -> JSONResponse:
    """에러 응답 생성"""
    return create_response(
        status_code=status_code,
        success=False,
        message=message,
        error=error,
    )
