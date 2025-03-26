# teckwah_project/main/server/models/dashboard_remark_model.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from main.server.config.database import Base


class DashboardRemark(Base):
    __tablename__ = "dashboard_remark"

    remark_id = Column(Integer, primary_key=True, autoincrement=True)
    dashboard_id = Column(
        Integer,
        ForeignKey("dashboard.dashboard_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content = Column(Text, nullable=True)  
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    created_by = Column(String(50), nullable=False)
    # version 필드 제거됨
    formatted_content = Column(Text, nullable=True)

    # 관계 설정
    dashboard = relationship("Dashboard", back_populates="remarks")

    def __repr__(self):
        return f"<DashboardRemark(id={self.remark_id}, dashboard_id={self.dashboard_id})>"