"""
인증 관련 Pydantic 스키마
"""

from pydantic import BaseModel


# 로그인 요청 데이터 모델
class LoginRequest(BaseModel):
    username: str
    password: str
