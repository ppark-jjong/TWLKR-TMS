# backend/app/utils/error_handler.py

from typing import Any, Dict, Optional
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from app.utils.logger import log_error, log_warning

class DatabaseError(Exception):
    """데이터베이스 관련 에러"""
    pass

class ValidationError(Exception):
    """데이터 검증 관련 에러"""
    pass

class AuthenticationError(Exception):
    pass

def handle_database_error(error: SQLAlchemyError, context: str, data: Optional[Any] = None) -> None:
    """데이터베이스 에러 처리"""
    log_error(error, f"데이터베이스 에러 - {context}", data)
    raise DatabaseError(f"데이터베이스 작업 실패: {context}")

def handle_validation_error(field: str, detail: str, data: Optional[Any] = None) -> None:
    """데이터 검증 에러 처리"""
    error_msg = f"필드 '{field}' 검증 실패: {detail}"
    log_warning(error_msg, data)
    raise ValidationError(error_msg)

def create_error_response(error: Exception) -> Dict[str, str]:
    """에러 응답 생성"""
    if isinstance(error, DatabaseError):
        return {"error": "데이터베이스 오류가 발생했습니다", "detail": str(error)}
    elif isinstance(error, ValidationError):
        return {"error": "데이터 검증 오류가 발생했습니다", "detail": str(error)}
    elif isinstance(error, AuthenticationError):
        return {"error": "인증 오류가 발생했습니다", "detail": str(error)}
    else:
        return {"error": "서버 오류가 발생했습니다", "detail": "관리자에게 문의하세요"}

def validate_dashboard_data(data: Dict[str, Any]) -> None:
    """대시보드 데이터 검증"""
    required_fields = {
        "postal_code": "우편번호는 5자리여야 합니다",
        "contact": "연락처 형식이 올바르지 않습니다",
        "order_no": "주문번호는 필수입니다",
        "address": "주소는 필수입니다",
        "customer": "고객명은 필수입니다"
    }

    for field, message in required_fields.items():
        if field not in data or not data[field]:
            handle_validation_error(field, message, data)
        
        if field == "postal_code" and not (data[field].isdigit() and len(data[field]) == 5):
            handle_validation_error(field, message, data)
            
        if field == "contact" and not data[field].replace("-", "").isdigit():
            handle_validation_error(field, message, data)

def validate_date_range(start_date: str, end_date: str) -> None:
    """날짜 범위 검증"""
    try:
        if start_date > end_date:
            handle_validation_error(
                "date_range",
                "시작 날짜는 종료 날짜보다 이전이어야 합니다",
                {"start_date": start_date, "end_date": end_date}
            )
    except ValueError as e:
        handle_validation_error("date_range", "날짜 형식이 올바르지 않습니다", str(e))