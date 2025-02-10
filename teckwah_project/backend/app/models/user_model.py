"""사용자 모델"""
from sqlalchemy import Column, String, Enum
from sqlalchemy.orm import relationship
from app.config.database import Base
from app.schemas.common_schema import UserRole, UserDepartment

class User(Base):
    """사용자 모델"""
    __tablename__ = "users"

    user_id = Column(String(50), primary_key=True)
    user_password = Column(String(255), nullable=False)
    user_department = Column(Enum(UserDepartment), nullable=False)
    user_role = Column(Enum(UserRole), nullable=False)

    def verify_password(self, password: str) -> bool:
        """비밀번호 검증"""
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.verify(password, self.user_password)

    class Config:
        from_attributes = True