# backend/app/models/dashboard_memo_model.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.config.database import Base


class DashboardMemo(Base):
    __tablename__ = "dashboard_memo"

    memo_id = Column(Integer, primary_key=True, autoincrement=True)
    dashboard_id = Column(
        Integer,
        ForeignKey("dashboard.dashboard_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(String(50), ForeignKey("user.user_id"), nullable=False)
    content = Column(Text, nullable=False)
    formatted_content = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)

    # Relationships
    dashboard = relationship("Dashboard", back_populates="memos")
    user = relationship("User", back_populates="memos")

    def __repr__(self):
        return f"<DashboardMemo(id={self.memo_id}, dashboard_id={self.dashboard_id}, user_id={self.user_id})>"
