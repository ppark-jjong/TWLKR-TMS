# backend/app/repositories/dashboard_repository.py

from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.models.dashboard_model import Dashboard

class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_dashboard(self, dashboard_data: dict) -> Dashboard:
        """신규 대시보드 생성"""
        dashboard = Dashboard(**dashboard_data)
        self.db.add(dashboard)
        self.db.commit()
        self.db.refresh(dashboard)
        return dashboard

    def get_dashboard_by_date(self, date: datetime) -> List[Dashboard]:
        """날짜별 대시보드 조회"""
        start_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        return self.db.query(Dashboard).filter(
            and_(
                Dashboard.eta >= start_date,
                Dashboard.eta <= end_date
            )
        ).all()

    def get_dashboard_by_id(self, dashboard_id: int) -> Optional[Dashboard]:
        """대시보드 상세 정보 조회"""
        return self.db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()

    def update_dashboard_status(self, dashboard_id: int, status: str, 
                              current_time: datetime) -> Optional[Dashboard]:
        """대시보드 상태 업데이트"""
        dashboard = self.get_dashboard_by_id(dashboard_id)
        if dashboard:
            dashboard.status = status
            if status == "IN_PROGRESS":
                dashboard.depart_time = current_time
            elif status in ["COMPLETE", "ISSUE"]:
                dashboard.complete_time = current_time
            
            self.db.commit()
            self.db.refresh(dashboard)
        return dashboard

    def update_dashboard_remark(self, dashboard_id: int, remark: str) -> Optional[Dashboard]:
        """대시보드 메모 업데이트"""
        dashboard = self.get_dashboard_by_id(dashboard_id)
        if dashboard:
            dashboard.remark = remark
            self.db.commit()
            self.db.refresh(dashboard)
        return dashboard

    def update_dashboard_driver(self, dashboard_ids: List[int], 
                              driver_name: str, driver_contact: str) -> List[Dashboard]:
        """배차 정보 업데이트"""
        dashboards = self.db.query(Dashboard).filter(
            Dashboard.dashboard_id.in_(dashboard_ids)
        ).all()
        
        for dashboard in dashboards:
            dashboard.driver_name = driver_name
            dashboard.driver_contact = driver_contact
        
        self.db.commit()
        return dashboards

    def delete_dashboards(self, dashboard_ids: List[int]) -> bool:
        """대시보드 삭제"""
        try:
            self.db.query(Dashboard).filter(
                Dashboard.dashboard_id.in_(dashboard_ids)
            ).delete(synchronize_session=False)
            self.db.commit()
            return True
        except Exception:
            self.db.rollback()
            return False

    def get_dashboards_by_department(self, date: datetime, department: str) -> List[Dashboard]:
        """부서별 대시보드 조회"""
        start_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        return self.db.query(Dashboard).filter(
            and_(
                Dashboard.eta >= start_date,
                Dashboard.eta <= end_date,
                Dashboard.department == department
            )
        ).all()