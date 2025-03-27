# teckwah_project/main/server/utils/constants.py
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
        "DB_CONNECTION": "데이터베이스 연결 오류가 발생했습니다"
    },
    # 락 관련 메시지 추가
    "LOCK": {
        "ACQUIRE_SUCCESS": "락을 획득했습니다",
        "ACQUIRE_ERROR": "락 획득에 실패했습니다",
        "RELEASE_SUCCESS": "락을 해제했습니다",
        "RELEASE_ERROR": "락 해제에 실패했습니다",
        "EXPIRED": "락이 만료되었습니다",
        "CONFLICT": "다른 사용자({user})가 현재 작업 중입니다",
        "PERMISSION": "락을 해제할 권한이 없습니다"
    }
}


# 차트 타입
class ChartType(str, Enum):
    DELIVERY_STATUS = "delivery_status"
    HOURLY_ORDERS = "hourly_orders"