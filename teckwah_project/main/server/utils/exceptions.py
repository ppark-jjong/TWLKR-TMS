# teckwah_project/main/server/utils/exceptions.py
class BaseApiException(Exception):
    """API 예외의 기본 클래스"""
    def __init__(self, detail: str = "서버 오류가 발생했습니다"):
        self.detail = detail
        super().__init__(self.detail)

# 서버 측 오류를 위한 단일 예외 클래스
class ServerException(BaseApiException):
    """서버 내부 오류 예외"""
    pass

# 클라이언트 측 오류를 위한 단일 예외 클래스
class ClientException(BaseApiException):
    """클라이언트 요청 오류 예외"""
    pass

class UnauthorizedException(ClientException):
    """인증되지 않은 접근 예외"""
    def __init__(self, detail: str = "인증되지 않은 접근입니다"):
        super().__init__(detail)

class NotFoundException(ClientException):
    """리소스를 찾을 수 없음 예외"""
    def __init__(self, detail: str = "요청한 리소스를 찾을 수 없습니다"):
        super().__init__(detail)

class ValidationException(ClientException):
    """데이터 검증 실패 예외"""
    def __init__(self, detail: str = "입력 데이터가 유효하지 않습니다"):
        super().__init__(detail)

class PessimisticLockException(ServerException):
    """비관적 락 획득 실패 예외"""
    def __init__(self, detail: str = "다른 사용자가 동시에 수정 중입니다"):
        super().__init__(detail)

class DatabaseException(ServerException):
    """데이터베이스 관련 예외"""
    def __init__(self, detail: str = "데이터베이스 작업 중 오류가 발생했습니다"):
        super().__init__(detail)

class BusinessLogicException(ClientException):
    """비즈니스 로직 위반 예외"""
    def __init__(self, detail: str = "비즈니스 규칙을 위반했습니다"):
        super().__init__(detail)