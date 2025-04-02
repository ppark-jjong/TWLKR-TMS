# teckwah_project/server/utils/common.py
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
import re
from sqlalchemy import and_, or_
from sqlalchemy.orm import Query

from server.utils.constants import (
    DeliveryType,
    DeliveryStatus,
    Department,
    Warehouse,
    STATUS_TRANSITIONS,
    STATUS_TEXT_MAP,
    TYPE_TEXT_MAP,
    WAREHOUSE_TEXT_MAP,
    DEPARTMENT_TEXT_MAP,
    MESSAGES,
    ChartType
)
from server.utils.datetime import get_kst_now

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
