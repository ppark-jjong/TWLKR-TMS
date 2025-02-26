# backend/app/utils/constants.py
from enum import Enum


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
}


# 차트 타입
class ChartType(str, Enum):
    DELIVERY_STATUS = "delivery_status"
    HOURLY_ORDERS = "hourly_orders"
