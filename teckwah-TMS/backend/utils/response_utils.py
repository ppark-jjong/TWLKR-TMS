"""
API 응답 형식을 표준화하는 유틸리티 함수
"""

from typing import Dict, Any, List, Optional, Union


def create_response(
    success: bool,
    message: str,
    data: Any = None,
    error_code: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    표준화된 API 응답 생성
    
    Args:
        success: 성공 여부
        message: 응답 메시지
        data: 응답 데이터
        error_code: 오류 코드 (실패 시)
        **kwargs: 추가 필드
        
    Returns:
        표준화된 응답 딕셔너리
    """
    response = {
        "success": success,
        "message": message,
    }
    
    if data is not None:
        response["data"] = data
    
    if error_code and not success:
        response["error_code"] = error_code
    
    # 추가 필드 병합
    response.update(kwargs)
    
    return response


def success_response(message: str = "요청이 성공적으로 처리되었습니다", data: Any = None, **kwargs) -> Dict[str, Any]:
    """
    성공 응답 생성
    
    Args:
        message: 성공 메시지
        data: 응답 데이터
        **kwargs: 추가 필드
        
    Returns:
        성공 응답 딕셔너리
    """
    return create_response(True, message, data, **kwargs)


def error_response(
    message: str = "요청 처리 중 오류가 발생했습니다",
    error_code: str = "INTERNAL_ERROR",
    data: Any = None,
    **kwargs
) -> Dict[str, Any]:
    """
    오류 응답 생성
    
    Args:
        message: 오류 메시지
        error_code: 오류 코드
        data: 추가 오류 정보
        **kwargs: 추가 필드
        
    Returns:
        오류 응답 딕셔너리
    """
    return create_response(False, message, data, error_code, **kwargs)
