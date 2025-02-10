from sqlalchemy import Column, Integer, String, DateTime, Text, func
from app.config.database import Base


class ErrorLog(Base):
    """에러 로그 모델"""

    __tablename__ = "error_log"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    error_message = Column(Text, nullable=False)
    failed_query = Column(String(255), nullable=False)
    logged_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
