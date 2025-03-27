# teckwah_project/main/server/utils/exceptions.py
from main.server.utils.constants import MESSAGES

class BaseApiException(Exception):
    """API 예외의 기본 클래스"""

    def __init__(self, detail: str = MESSAGES["ERROR"]["SERVER"]):
        self.detail = detail
        super().__init__(self.detail)


class ValidationException(BaseApiException):
    """데이터 검증 실패 예외"""

    def __init__(
        self, detail: str = MESSAGES["ERROR"]["VALIDATION"], error_fields=None
    ):
        self.error_fields = error_fields or {}
        super().__init__(detail)


class NotFoundException(BaseApiException):
    """리소스를 찾을 수 없음 예외"""

    def __init__(self, detail: str = MESSAGES["ERROR"]["NOT_FOUND"]):
        super().__init__(detail)


class PessimisticLockException(BaseApiException):
    """비관적 락 획득 실패 예외"""

    def __init__(self, detail: str = MESSAGES["ERROR"]["LOCKED"], **kwargs):
        self.__dict__.update(kwargs)
        super().__init__(detail)


class UnauthorizedException(BaseApiException):
    """인증되지 않은 접근 예외"""

    def __init__(self, detail: str = MESSAGES["ERROR"]["UNAUTHORIZED"]):
        super().__init__(detail)


class InvalidStatusTransitionException(ValidationException):
    """상태 전이 규칙 위반 예외"""

    def __init__(self, current_status: str, new_status: str):
        super().__init__(
            detail=f"'{current_status}' 상태에서 '{new_status}' 상태로 변경할 수 없습니다",
            error_fields={"current_status": current_status, "new_status": new_status},
        )


class DashboardStatusLockedException(ValidationException):
    """완료/취소 등 수정 불가 상태의 대시보드 예외"""

    def __init__(self, status: str):
        super().__init__(
            detail=f"'{status}' 상태의 대시보드는 수정할 수 없습니다",
            error_fields={"status": status},
        )