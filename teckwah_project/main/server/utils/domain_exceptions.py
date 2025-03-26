# teckwah_project/main/server/utils/domain_exceptions.py
"""
도메인 예외 정의 - 서비스 계층에서 사용하는 도메인 특화 예외
"""
from app.utils.exceptions import BaseApiException, ValidationException, NotFoundException


class DashboardDomainException(BaseApiException):
    """대시보드 도메인 예외 기본 클래스"""
    pass


class InvalidStatusTransitionException(ValidationException):
    """상태 전이 규칙 위반 예외"""
    def __init__(self, current_status: str, new_status: str):
        super().__init__(
            detail=f"'{current_status}' 상태에서 '{new_status}' 상태로 변경할 수 없습니다",
            error_fields={"current_status": current_status, "new_status": new_status}
        )


class DashboardStatusLockedException(ValidationException):
    """완료/취소 등 수정 불가 상태의 대시보드 예외"""
    def __init__(self, status: str):
        super().__init__(
            detail=f"'{status}' 상태의 대시보드는 수정할 수 없습니다",
            error_fields={"status": status}
        )


class InvalidPostalCodeException(ValidationException):
    """우편번호 정보 없음 예외"""
    def __init__(self, postal_code: str):
        super().__init__(
            detail=f"'{postal_code}' 우편번호에 대한 정보가 없습니다",
            error_fields={"postal_code": postal_code}
        )