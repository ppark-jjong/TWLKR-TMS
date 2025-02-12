# backend/app/models/error_log_model.py
from sqlalchemy import Column, Integer, Text, DateTime, String, text
from app.config.database import Base


class ErrorLog(Base):
    __tablename__ = "error_log"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    error_message = Column(Text, nullable=False)
    failed_query = Column(String(255), nullable=False)
    logged_at = Column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

    def __repr__(self):
        return (
            f"<ErrorLog(log_id='{self.log_id}', error_message='{self.error_message}')>"
        )
