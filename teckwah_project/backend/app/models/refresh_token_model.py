# backend/app/models/refresh_token_model.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.database import Base

class RefreshToken(Base):
    __tablename__ = 'refresh_token'

    refresh_token_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), ForeignKey('user.user_id'), nullable=False)
    refresh_token = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default='CURRENT_TIMESTAMP', nullable=False)

    def __repr__(self):
        return f"<RefreshToken(user_id='{self.user_id}', expires_at='{self.expires_at}')>" 