# teckwah_project/main/server/utils/error_handler.py
from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError
from app.utils.logger import log_error
from app.utils.exceptions import BaseApiException, ValidationException, NotFoundException, PessimisticLockException

def handle_database_error(error: SQLAlchemyError, operation: str) -> None:
    """데이터베이스 에러 세분화된 처리"""
    # 에러 타입별 메시지 및 상태 코드 결정
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    message = "서버 오류가 발생했습니다"
    
    if isinstance(error, IntegrityError):
        # 무결성 제약 조건 위반 (중복키, 외래키 등)
        log_error(error, f"데이터베이스 무결성 오류 ({operation})")
        status_code = status.HTTP_409_CONFLICT
        message = "데이터 무결성 오류가 발생했습니다"
    elif isinstance(error, OperationalError):
        # 데이터베이스 연결 오류 등
        log_error(error, f"데이터베이스 운영 오류 ({operation})")
        message = "데이터베이스 연결 오류가 발생했습니다"
    else:
        # 기타 SQL 오류
        log_error(error, f"데이터베이스 오류 ({operation})")
    
    raise HTTPException(
        status_code=status_code,
        detail={"success": False, "message": message, "error_type": error.__class__.__name__}
    )

def handle_validation_error(error: Exception) -> dict:
    """입력값 검증 에러 상세 처리"""
    # ValidationException인 경우 상세 필드 정보 포함
    error_fields = {}
    
    if hasattr(error, 'error_fields') and error.error_fields:
        error_fields = error.error_fields
    
    return {
        "success": False,
        "message": str(error) or "요청 데이터가 올바르지 않습니다",
        "fields": error_fields
    }

def handle_domain_exception(error: BaseApiException) -> dict:
    """도메인 예외 처리 공통 로직"""
    status_code = status.HTTP_400_BAD_REQUEST
    
    # 예외 타입별 상태 코드 매핑
    if isinstance(error, NotFoundException):
        status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(error, ValidationException):
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    elif isinstance(error, PessimisticLockException):
        status_code = status.HTTP_423_LOCKED
    
    return status_code, {
        "success": False,
        "message": str(error),
        "error_type": error.__class__.__name__,
        "details": error.detail if hasattr(error, 'detail') else None
    }

def create_error_response(message: str, error_type: str = None, details: dict = None) -> dict:
    """일관된 에러 응답 생성 유틸리티"""
    response = {
        "success": False,
        "message": message
    }
    
    if error_type:
        response["error_type"] = error_type
        
    if details:
        response["details"] = details
        
    return response