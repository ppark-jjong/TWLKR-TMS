"""
사용자 모델
"""

from sqlalchemy import Column, String, Enum
from enum import Enum as PyEnum

# from pydantic import Field
# from typing import Optional, Dict, Any, List

from backend.database import Base

# from backend.models.model_config import APIModel


# Enum 정의는 schemas/user_schema.py로 이동
# class UserRole(str, PyEnum): ...
# class Department(str, PyEnum): ...


class User(Base):
    """사용자 DB 모델"""

    __tablename__ = "user"

    user_id = Column(String(50), primary_key=True)
    user_password = Column(String(255), nullable=False)
    # SQLAlchemy Enum 정의는 문자열 이름 사용
    user_department = Column(
        Enum("CS", "HES", "LENOVO", name="department_enum"), nullable=False
    )
    user_role = Column(Enum("ADMIN", "USER", name="role_enum"), nullable=False)


# API 요청/응답 모델 (schemas/user_schema.py로 이동)
# class UserCreate(APIModel): ...
# class UserUpdate(APIModel): ...
# class UserResponse(APIModel): ...
# class UserListResponseData(APIModel): ...
# class UserListResponse(APIModel): ...
