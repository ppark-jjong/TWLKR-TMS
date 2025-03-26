# teckwah_project/main/server/models/refresh_token_model.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from main.server.config.database import Base


class RefreshToken(Base):
    __tablename__ = "refresh_token"

    refresh_token_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        String(50), ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False
    )
    refresh_token = Column(String(255), nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<RefreshToken(user_id={self.user_id}, expires={self.expires_at})>"
