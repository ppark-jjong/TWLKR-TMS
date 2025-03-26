# teckwah_project/main/server/models/user_model.py
from sqlalchemy import Column, String, Enum
from app.config.database import Base


class User(Base):
    __tablename__ = "user"

    user_id = Column(String(50), primary_key=True)
    user_password = Column(String(255), nullable=False)
    user_department = Column(Enum("CS", "HES", "LENOVO"), nullable=False, index=True)
    user_role = Column(Enum("ADMIN", "USER"), nullable=False, server_default="USER")

    def __repr__(self):
        return f"<User(id={self.user_id}, department={self.user_department})>"
