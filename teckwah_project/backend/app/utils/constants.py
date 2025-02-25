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
}
