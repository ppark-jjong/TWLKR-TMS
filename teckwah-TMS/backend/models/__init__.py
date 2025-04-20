"""
모델 모듈 초기화

모든 모델 클래스를 가져와서 편리하게 import 할 수 있도록 설정합니다.
"""

from backend.models.model_config import APIModel, API_MODEL_CONFIG

from backend.models.user import (
    User,
    UserRole,
    Department,
    UserCreate,
    UserUpdate,
    UserResponse,
)

from backend.models.dashboard import (
    Dashboard,
    OrderType,
    OrderStatus,
    Warehouse,
    OrderCreate,
    OrderUpdate,
    OrderResponse,
    OrderFilter,
    DriverAssign,
    OrderStatusUpdate,
    OrderDeleteMultiple,
)

from backend.models.handover import (
    Handover,
    HandoverCreate,
    HandoverUpdate,
    HandoverResponse,
)

from backend.models.postal_code import (
    PostalCode,
    PostalCodeDetail,
    PostalCodeResponse,
    PostalCodeDetailResponse,
    PostalCodeCreate,
    PostalCodeDetailCreate,
)

# 특수 케이스나 추가 필요한 모델들을 위한 설정
__all__ = [
    'APIModel',
    'API_MODEL_CONFIG',
    'User',
    'UserRole',
    'Department',
    'UserCreate',
    'UserUpdate',
    'UserResponse',
    'Dashboard',
    'OrderType',
    'OrderStatus',
    'Warehouse',
    'OrderCreate',
    'OrderUpdate',
    'OrderResponse',
    'OrderFilter',
    'DriverAssign',
    'OrderStatusUpdate',
    'OrderDeleteMultiple',
    'Handover',
    'HandoverCreate',
    'HandoverUpdate',
    'HandoverResponse',
    'PostalCode',
    'PostalCodeDetail',
    'PostalCodeResponse',
    'PostalCodeDetailResponse',
    'PostalCodeCreate',
    'PostalCodeDetailCreate',
]
