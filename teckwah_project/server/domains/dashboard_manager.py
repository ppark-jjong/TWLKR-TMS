from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from fastapi import HTTPException, status

from server.models.dashboard_model import Dashboard
from server.models.dashboard_lock_model import DashboardLock
from server.utils.datetime import get_kst_now
from server.utils.error import NotFoundException, LockConflictException
from server.domains.lock_manager import LockManager

class DashboardManager:
    """
    도메인 중심 대시보드 매니저
    
    대시보드 관련 데이터 액세스와 비즈니스 로직을 통합관리합니다.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.lock_manager = LockManager(db)
        self._reference_data_cache = {}  # 간단한 인메모리 캐시
        self._cache_expiry = {}
    
    def get_dashboards(self, filters: Dict[str, Any], page: int = 1, size: int = 10, 
                       sort_by: str = None, sort_desc: bool = True) -> Dict[str, Any]:
        """
        필터링, 정렬, 페이지네이션을 적용하여 대시보드 목록 조회
        """
        # 기본 쿼리 생성
        query = self.db.query(Dashboard)
        
        # 필터링 조건 적용
        if filters:
            for key, value in filters.items():
                if value is not None:
                    if key == 'search_keyword' and value:
                        # 검색어 필터링 (여러 필드에 대해 OR 조건)
                        search_term = f"%{value}%"
                        query = query.filter(
                            or_(
                                Dashboard.customer_name.like(search_term),
                                Dashboard.postal_code.like(search_term),
                                Dashboard.address.like(search_term),
                                Dashboard.driver_name.like(search_term),
                                Dashboard.driver_contact.like(search_term)
                            )
                        )
                    elif key == 'eta_start' and value:
                        query = query.filter(Dashboard.eta >= value)
                    elif key == 'eta_end' and value:
                        query = query.filter(Dashboard.eta <= value)
                    elif key == 'status' and value:
                        if isinstance(value, list):
                            query = query.filter(Dashboard.status.in_(value))
                        else:
                            query = query.filter(Dashboard.status == value)
                    elif key == 'department' and value:
                        query = query.filter(Dashboard.department == value)
                    elif hasattr(Dashboard, key):
                        query = query.filter(getattr(Dashboard, key) == value)
        
        # 기본 정렬: ETA 기준 (오름차순)
        if sort_by and hasattr(Dashboard, sort_by):
            if sort_desc:
                query = query.order_by(desc(getattr(Dashboard, sort_by)))
            else:
                query = query.order_by(asc(getattr(Dashboard, sort_by)))
        else:
            # 기본 정렬: ETA 오름차순
            query = query.order_by(asc(Dashboard.eta))
        
        # 전체 개수 카운트
        total_count = query.count()
        
        # 페이지네이션 적용
        offset = (page - 1) * size
        items = query.offset(offset).limit(size).all()
        
        # 메타 정보
        total_pages = (total_count + size - 1) // size if total_count > 0 else 0
        
        return {
            "items": items,
            "meta": {
                "page": page,
                "size": size,
                "total_count": total_count,
                "total_pages": total_pages,
            }
        }
    
    def get_dashboard_by_id(self, dashboard_id: int) -> Dashboard:
        """ID로 대시보드 조회"""
        dashboard = self.db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
        if not dashboard:
            raise NotFoundException(f"ID가 {dashboard_id}인 대시보드를 찾을 수 없습니다")
        return dashboard
    
    def create_dashboard(self, dashboard_data: Dict[str, Any]) -> Dashboard:
        """새 대시보드 생성"""
        dashboard = Dashboard(**dashboard_data)
        self.db.add(dashboard)
        self.db.flush()
        self.db.refresh(dashboard)
        return dashboard
    
    def update_dashboard(self, dashboard_id: int, update_data: Dict[str, Any], user_id: str) -> Dashboard:
        """
        대시보드 업데이트 (락 관리 포함)
        """
        # 락 획득 후 업데이트 수행
        with self.lock_manager.acquire_lock(dashboard_id, user_id, "EDIT") as _:
            dashboard = self.get_dashboard_by_id(dashboard_id)
            
            # 업데이트 데이터 적용
            for key, value in update_data.items():
                if hasattr(dashboard, key):
                    setattr(dashboard, key, value)
            
            # 변경 사항 저장
            self.db.flush()
            return dashboard
    
    def update_status(self, dashboard_id: int, status: str, user_id: str, is_admin: bool = False) -> Dashboard:
        """
        대시보드 상태 업데이트 (락 관리 포함)
        """
        # 락 획득 후 상태 변경 수행
        with self.lock_manager.acquire_lock(dashboard_id, user_id, "STATUS") as _:
            dashboard = self.get_dashboard_by_id(dashboard_id)
            
            # 관리자 권한 체크 (삭제 등 특수 상태로 변경 시)
            if status == "DELETED" and not is_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="삭제 권한이 없습니다"
                )
            
            # 상태 변경
            dashboard.status = status
            dashboard.updated_at = get_kst_now()
            dashboard.updated_by = user_id
            
            # 변경 사항 저장
            self.db.flush()
            return dashboard
    
    def assign_driver(self, dashboard_ids: List[int], driver_data: Dict[str, Any], user_id: str) -> List[Dashboard]:
        """
        다중 대시보드 배차 처리 (원자적 다중 락 관리 포함)
        """
        # 다중 락 획득 후 배차 정보 업데이트
        with self.lock_manager.acquire_multiple_locks(dashboard_ids, user_id, "ASSIGN") as _:
            updated_dashboards = []
            
            # 각 대시보드에 배차 정보 적용
            for dashboard_id in dashboard_ids:
                dashboard = self.get_dashboard_by_id(dashboard_id)
                
                # 배차 정보 업데이트
                dashboard.driver_name = driver_data.get("driver_name")
                dashboard.driver_contact = driver_data.get("driver_contact")
                dashboard.status = "ASSIGNED"  # 배차 시 상태 자동 변경
                dashboard.updated_at = get_kst_now()
                dashboard.updated_by = user_id
                
                updated_dashboards.append(dashboard)
            
            # 한 번에 커밋 (원자적 처리)
            self.db.flush()
            return updated_dashboards
    
    def delete_dashboard(self, dashboard_id: int, user_id: str, is_admin: bool = False) -> bool:
        """
        대시보드 삭제 (관리자 전용, 락 관리 포함)
        """
        # 관리자 권한 체크
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="삭제 권한이 없습니다"
            )
        
        # 락 획득 후 삭제 처리
        with self.lock_manager.acquire_lock(dashboard_id, user_id, "EDIT") as _:
            dashboard = self.get_dashboard_by_id(dashboard_id)
            
            # 소프트 삭제 처리
            dashboard.status = "DELETED"
            dashboard.updated_at = get_kst_now()
            dashboard.updated_by = user_id
            
            # 변경 사항 저장
            self.db.flush()
            return True
    
    def get_dashboard_stats(self, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        대시보드 상태별 통계 정보 조회
        """
        # 기본 쿼리
        query = self.db.query(Dashboard.status, 
                             self.db.func.count(Dashboard.dashboard_id))
        
        # 필터 적용
        if filters:
            for key, value in filters.items():
                if value is not None and hasattr(Dashboard, key):
                    query = query.filter(getattr(Dashboard, key) == value)
        
        # 상태별 그룹핑
        result = query.group_by(Dashboard.status).all()
        
        # 결과 포맷팅
        stats = {
            "total": 0,
            "status_counts": {}
        }
        
        for status, count in result:
            if status != "DELETED":  # 삭제된 항목은 통계에서 제외
                stats["status_counts"][status] = count
                stats["total"] += count
        
        return stats 