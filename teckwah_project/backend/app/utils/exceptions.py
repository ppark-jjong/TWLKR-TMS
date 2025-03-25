# app/utils/exceptions.py
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