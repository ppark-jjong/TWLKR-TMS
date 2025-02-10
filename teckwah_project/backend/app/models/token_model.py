from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.config.database import Base


class Token(Base):
    """토큰 모델"""
    __tablename__ = "tokens"

    token_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    refresh_token = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="tokens")

    def __repr__(self):
        return f"<Token(user_id={self.user_id}, refresh_token={self.refresh_token}, expires_at={self.expires_at})>" 