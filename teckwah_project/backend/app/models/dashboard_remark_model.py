# app/models/dashboard_remark_model.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.config.database import Base


class DashboardRemark(Base):
    __tablename__ = "dashboard_remark"

    remark_id = Column(Integer, primary_key=True, autoincrement=True)
    dashboard_id = Column(
        Integer,
        ForeignKey("dashboard.dashboard_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    created_by = Column(String(50), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    formatted_content = Column(Text, nullable=True)

    # 관계 설정
    dashboard = relationship("Dashboard", back_populates="remarks")

    def __repr__(self):
        return f"<DashboardRemark(id={self.remark_id}, dashboard_id={self.dashboard_id})>"