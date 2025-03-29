# teckwah_project/main/server/utils/constants.py
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
import re
from sqlalchemy import and_, or_
from sqlalchemy.orm import Query
from main.server.utils.datetime import get_kst_now


class DeliveryType(str, Enum):
    DELIVERY = "DELIVERY"
    RETURN = "RETURN"


class DeliveryStatus(str, Enum):
    WAITING = "WAITING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETE = "COMPLETE"
    ISSUE = "ISSUE"
    CANCEL = "CANCEL"


class Department(str, Enum):
    CS = "CS"
    HES = "HES"
    LENOVO = "LENOVO"


class Warehouse(str, Enum):
    SEOUL = "SEOUL"
    BUSAN = "BUSAN"
    GWANGJU = "GWANGJU"
    DAEJEON = "DAEJEON"


# 상태 변경 관련 상수
STATUS_TRANSITIONS = {
    "WAITING": ["IN_PROGRESS", "CANCEL"],
    "IN_PROGRESS": ["COMPLETE", "ISSUE", "CANCEL"],
    "COMPLETE": [],
    "ISSUE": [],
    "CANCEL": [],
}

# 상태 표시 텍스트
STATUS_TEXT_MAP = {
    "WAITING": "대기",
    "IN_PROGRESS": "진행",
    "COMPLETE": "완료",
    "ISSUE": "이슈",
    "CANCEL": "취소",
}

# 타입 표시 텍스트
TYPE_TEXT_MAP = {
    "DELIVERY": "배송",
    "RETURN": "회수",
}

# 창고 표시 텍스트
WAREHOUSE_TEXT_MAP = {
    "SEOUL": "서울",
    "BUSAN": "부산",
    "GWANGJU": "광주",
    "DAEJEON": "대전",
}

# 부서 표시 텍스트
DEPARTMENT_TEXT_MAP = {
    "CS": "CS",
    "HES": "HES",
    "LENOVO": "LENOVO",
}

# 데이터 없음 vs 오류 메시지
MESSAGES = {
    "DATA": {
        "EMPTY": "조회된 데이터가 없습니다",
        "SUCCESS": "데이터를 조회했습니다",
        "ERROR": "데이터 조회 중 오류가 발생했습니다",
    },
    "DASHBOARD": {
        "CREATE_SUCCESS": "대시보드가 생성되었습니다",
        "CREATE_ERROR": "대시보드 생성 중 오류가 발생했습니다",
        "STATUS_UPDATE_SUCCESS": "{status} 상태로 변경되었습니다",
        "STATUS_UPDATE_ERROR": "상태 변경 중 오류가 발생했습니다",
        "ASSIGN_SUCCESS": "배차가 완료되었습니다",
        "ASSIGN_ERROR": "배차 처리 중 오류가 발생했습니다",
    },
    "VALIDATION": {
        "REQUIRED": "{field}은(는) 필수 항목입니다",
        "INVALID_CONTACT": "올바른 연락처 형식이 아닙니다",
        "INVALID_POSTAL": "올바른 우편번호 형식이 아닙니다",
        "FUTURE_ETA": "ETA는 현재 시간 이후여야 합니다",
    },
    # 오류 응답 관련 메시지 추가
    "ERROR": {
        "SERVER": "서버 내부 오류가 발생했습니다",
        "NOT_FOUND": "요청한 리소스를 찾을 수 없습니다",
        "UNAUTHORIZED": "인증되지 않은 접근입니다",
        "FORBIDDEN": "권한이 없습니다",
        "BAD_REQUEST": "잘못된 요청입니다",
        "LOCKED": "다른 사용자가 작업 중입니다",
        "VALIDATION": "입력 데이터가 유효하지 않습니다",
        "DB_ERROR": "데이터베이스 오류가 발생했습니다",
        "DB_CONNECTION": "데이터베이스 연결 오류가 발생했습니다",
    },
    # 락 관련 메시지 추가
    "LOCK": {
        "ACQUIRE_SUCCESS": "락을 획득했습니다",
        "ACQUIRE_ERROR": "락 획득에 실패했습니다",
        "RELEASE_SUCCESS": "락을 해제했습니다",
        "RELEASE_ERROR": "락 해제에 실패했습니다",
        "EXPIRED": "락이 만료되었습니다",
        "CONFLICT": "다른 사용자({user})가 현재 작업 중입니다",
        "PERMISSION": "락을 해제할 권한이 없습니다",
    },
}


# 차트 타입
class ChartType(str, Enum):
    DELIVERY_STATUS = "delivery_status"
    HOURLY_ORDERS = "hourly_orders"


def validate_postal_code(postal_code: str) -> bool:
    """우편번호 유효성 검사"""
    pattern = r"^\d{5}$"
    return bool(re.match(pattern, postal_code))


def validate_phone_number(phone: str) -> bool:
    """전화번호 유효성 검사"""
    pattern = r"^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$"
    return bool(re.match(pattern, phone))


def build_search_query(
    query: Query,
    search_term: Optional[str] = None,
    filters: Optional[Dict[str, Any]] = None,
    date_range: Optional[Dict[str, datetime]] = None,
    status_list: Optional[List[str]] = None,
    department_list: Optional[List[str]] = None,
    warehouse_list: Optional[List[str]] = None,
) -> Query:
    """검색 쿼리 빌더"""
    conditions = []

    # 검색어 조건
    if search_term:
        search_conditions = [
            query.model.order_no.ilike(f"%{search_term}%"),
            query.model.customer.ilike(f"%{search_term}%"),
            query.model.address.ilike(f"%{search_term}%"),
        ]
        conditions.append(or_(*search_conditions))

    # 필터 조건
    if filters:
        for key, value in filters.items():
            if hasattr(query.model, key) and value is not None:
                conditions.append(getattr(query.model, key) == value)

    # 날짜 범위 조건
    if date_range:
        if date_range.get("start_date"):
            conditions.append(query.model.create_time >= date_range["start_date"])
        if date_range.get("end_date"):
            conditions.append(query.model.create_time <= date_range["end_date"])

    # 상태 목록 조건
    if status_list:
        conditions.append(query.model.status.in_(status_list))

    # 부서 목록 조건
    if department_list:
        conditions.append(query.model.department.in_(department_list))

    # 창고 목록 조건
    if warehouse_list:
        conditions.append(query.model.warehouse.in_(warehouse_list))

    # 모든 조건 적용
    if conditions:
        query = query.filter(and_(*conditions))

    return query


def format_remark(
    remark: Optional[str], updated_by: Optional[str] = None
) -> Dict[str, Any]:
    """메모 포맷팅"""
    if not remark:
        return {}

    return {"remark": remark, "updated_by": updated_by}


def calculate_pagination(total: int, page: int, size: int) -> Dict[str, Any]:
    """페이지네이션 계산"""
    total_pages = (total + size - 1) // size if size > 0 else 0
    return {
        "total": total,
        "page": page,
        "size": size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }


def sanitize_input(text: str) -> str:
    """입력값 정제 (XSS 방지)"""
    if not text:
        return ""
    return text.replace("<", "&lt;").replace(">", "&gt;")


def format_error_response(
    error_code: str, message: str, details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """에러 응답 포맷팅"""
    response = {
        "success": False,
        "error_code": error_code,
        "message": message,
        "timestamp": get_kst_now().isoformat(),
    }
    if details:
        response["details"] = details
    return response
