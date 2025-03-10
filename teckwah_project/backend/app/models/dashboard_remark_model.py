# app/models/dashboard_remark_model.py
from sqlalchemy import Column, Integer, Text, DateTime, String, ForeignKey, func
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
    content = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    created_by = Column(String(50), nullable=False)  # 사용자 ID 저장
    version = Column(Integer, nullable=False, default=1)  # 낙관적 락을 위한 버전

    # 관계 설정
    dashboard = relationship("Dashboard", back_populates="remarks")

    def __repr__(self):
        return (
            f"<DashboardRemark(id={self.remark_id}, dashboard_id={self.dashboard_id})>"
        )

    @property
    def formatted_content(self):
        """user_id: content 형식으로 반환"""
        return f"{self.created_by}: {self.content}"
