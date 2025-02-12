# backend/app/models/user_model.py
from sqlalchemy import Column, String, Enum
from app.config.database import Base


class User(Base):
    __tablename__ = "user"

    user_id = Column(String(50), primary_key=True, nullable=False)
    user_password = Column(String(255), nullable=False)
    user_department = Column(Enum("CS", "HES", "LENOVO"), nullable=False)
    user_role = Column(Enum("ADMIN", "USER"), nullable=False)

    def __repr__(self):
        return f"<User(user_id='{self.user_id}', user_role='{self.user_role}')>"
