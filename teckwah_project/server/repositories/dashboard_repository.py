# teckwah_project/server/repositories/dashboard_repository.py
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_, or_, text
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import pytz

from server.models.dashboard_model import Dashboard
from server.models.postal_code_model import PostalCode, PostalCodeDetail
from server.utils.logger import log_info, log_error
from server.utils.datetime import KST, get_kst_now, localize_to_kst
from server.utils.error import LockConflictException
from server.repositories.base_repository import BaseRepository
from server.utils.lock_manager import LockManager


class DashboardRepository(BaseRepository[Dashboard]):
    """통합된 대시보드 저장소 구현"""

    def __init__(self, db: Session):
        super().__init__(db, Dashboard)
        self.lock_manager = LockManager(db)

    #
    # [대시보드 기본 기능 영역]
    #
    def get_dashboard_list_by_date(
        self, start_date: datetime, end_date: datetime, page: int = 1, page_size: int = 100
    ) -> Tuple[List[Dashboard], int]:
        """ETA 기준으로 날짜 범위 내 대시보드 목록 조회 (페이지네이션 적용)"""
        try:
            log_info(f"대시보드 목록 조회: {start_date} ~ {end_date}, 페이지={page}, 페이지크기={page_size}")
            
            # 전체 개수 쿼리 (메인 쿼리와 분리하여 성능 향상)
            count_query = (
                self.db.query(func.count(Dashboard.dashboard_id))
                .filter(Dashboard.eta.between(start_date, end_date))
            )
            total_count = count_query.scalar()
            
            # 페이지네이션 적용된 데이터 쿼리 - N+1 쿼리 문제 해결을 위한 조인로드 적용
            offset = (page - 1) * page_size
            query = (
                self.db.query(Dashboard)
                .filter(Dashboard.eta.between(start_date, end_date))
                .options(joinedload(Dashboard.postal_code_info))  # N+1 쿼리 방지를 위한 조인 로드
                .order_by(Dashboard.eta)
                .offset(offset)
                .limit(page_size)
            )
            
            result = query.all()
            log_info(f"대시보드 목록 조회 결과: {len(result)}건 (전체 {total_count}건)")
            return result, total_count
            
        except Exception as e:
            log_error(f"대시보드 목록 조회 실패: {str(e)}")
            return [], 0

    def get_dashboard_detail(self, dashboard_id: int) -> Optional[Dashboard]:
        """대시보드 상세 정보 조회"""
        try:
            log_info(f"대시보드 상세 조회: ID={dashboard_id}")
            dashboard = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .options(joinedload(Dashboard.postal_code_info))
                .first()
            )
            return dashboard
        except Exception as e:
            log_error(f"대시보드 상세 조회 실패: {str(e)}", {"id": dashboard_id})
            return None
            
    def get_dashboard_with_lock(self, dashboard_id: int, user_id: str) -> Optional[Dashboard]:
        """대시보드 상세 정보 조회 (행 수준 락 획득)"""
        try:
            log_info(f"대시보드 락 획득 조회: ID={dashboard_id}, 사용자={user_id}")
            
            # LockManager 사용
            lock_result = self.lock_manager.acquire_lock(
                Dashboard, 
                dashboard_id, 
                user_id, 
                action_type="EDIT"
            )
            
            if not lock_result.get("success", False):
                log_error(f"락 획득 실패: {lock_result.get('message', '')}")
                raise LockConflictException(
                    detail=lock_result.get('message', '다른 사용자가 편집 중입니다')
                )
            
            # 락 획득 성공, 조인 로딩 적용된 대시보드 반환
            dashboard = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .options(joinedload(Dashboard.postal_code_info))
                .first()
            )
            
            if dashboard:
                log_info(f"대시보드 락 획득 성공: ID={dashboard_id}")
            else:
                log_info(f"락 획득할 대시보드 없음: ID={dashboard_id}")
                
            return dashboard
            
        except LockConflictException:
            # 다시 던지기
            raise
        except Exception as e:
            log_error(f"대시보드 락 획득 실패: {str(e)}")
            raise

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 (ETA 기준)"""
        try:
            log_info("대시보드 날짜 범위 조회")
            # 가장 빠른 날짜와 가장 늦은 날짜 조회
            result = self.db.query(
                func.min(Dashboard.eta).label("oldest_date"),
                func.max(Dashboard.eta).label("latest_date"),
            ).first()

            # 올바른 시간대 처리로 수정
            now = get_kst_now()
            oldest_date = result.oldest_date or now - timedelta(days=30)
            latest_date = result.latest_date or now

            # 시간대 정보 없는 경우 KST로 변환
            oldest_date = localize_to_kst(oldest_date)
            latest_date = localize_to_kst(latest_date)

            log_info(f"날짜 범위 조회 결과: {oldest_date} ~ {latest_date}")
            return oldest_date, latest_date
        except Exception as e:
            log_error(f"날짜 범위 조회 실패: {str(e)}")
            # 실패 시 기본값으로 현재 날짜 기준 30일 범위 반환
            now = get_kst_now()
            return now - timedelta(days=30), now

    def create_dashboard(self, dashboard_data: Dict[str, Any]) -> Optional[Dashboard]:
        """대시보드 생성"""
        try:
            log_info(f"대시보드 생성: {dashboard_data}")
            # BaseRepository의 create 메서드 사용
            dashboard = self.create(**dashboard_data)
            log_info(f"대시보드 생성 완료: ID={dashboard.dashboard_id}")
            return dashboard
        except Exception as e:
            log_error(f"대시보드 생성 실패: {str(e)}", dashboard_data)
            raise

    def update_dashboard_fields(
        self, dashboard_id: int, fields: Dict[str, Any], user_id: str
    ) -> Optional[Dashboard]:
        """대시보드 필드 업데이트 - 행 수준 락 적용"""
        try:
            log_info(f"대시보드 필드 업데이트: ID={dashboard_id}, 필드={fields}")
            
            # BaseRepository의 update_with_lock 메서드 사용
            # 하지만 dashboard_id 필드 이름이 다르므로 직접 구현
            dashboard = self.get_dashboard_with_lock(dashboard_id, user_id)
            
            if not dashboard:
                log_info(f"업데이트할 대시보드 없음: ID={dashboard_id}")
                return None
                
            # 필드 업데이트
            for key, value in fields.items():
                setattr(dashboard, key, value)
                
            # UI 표시용 락 정보 갱신
            dashboard.updated_by = user_id
                
            self.db.flush()
            log_info(f"대시보드 필드 업데이트 완료: ID={dashboard_id}")
            return dashboard

        except Exception as e:
            log_error(f"대시보드 필드 업데이트 실패: {str(e)}", {"id": dashboard_id, "fields": fields})
            raise

    def assign_driver(
        self, dashboard_ids: List[int], driver_info: Dict[str, str], user_id: str
    ) -> List[Dashboard]:
        """배차 처리 (여러 대시보드에 배차 담당자 할당) - 행 수준 락 적용"""
        try:
            driver_name = driver_info.get('driver_name', '')
            driver_contact = driver_info.get('driver_contact', '')
            
            log_info(f"배차 처리: IDs={dashboard_ids}, 담당자={driver_name}")
            
            updated_dashboards = []
            
            # LockManager를 사용하여 다중 락 획득
            lock_result = self.lock_manager.acquire_multiple_locks(
                Dashboard, 
                dashboard_ids, 
                user_id,
                action_type="ASSIGN"
            )
            
            if not lock_result.get("success", False):
                # 락 획득 실패
                failed_ids = lock_result.get("failed_ids", [])
                raise LockConflictException(
                    detail=f"{len(failed_ids)}개 항목에 대한 락 획득 실패"
                )
                
            # 각 대시보드 업데이트
            for dashboard_id in dashboard_ids:
                dashboard = (
                    self.db.query(Dashboard)
                    .filter(Dashboard.dashboard_id == dashboard_id)
                    .first()
                )
                
                if dashboard:
                    dashboard.driver_name = driver_name
                    dashboard.driver_contact = driver_contact
                    dashboard.updated_by = user_id
                    updated_dashboards.append(dashboard)
            
            self.db.flush()
            log_info(f"배차 처리 완료: {len(updated_dashboards)}건")
            return updated_dashboards

        except Exception as e:
            log_error(f"배차 처리 실패: {str(e)}", {"ids": dashboard_ids, "driver": driver_name})
            raise

    def delete_dashboards(self, dashboard_ids: List[int], user_id: str) -> int:
        """대시보드 삭제 (관리자 전용) - 행 수준 락 적용"""
        try:
            log_info(f"대시보드 삭제: IDs={dashboard_ids}")
            
            # LockManager를 사용하여 다중 락 획득
            lock_result = self.lock_manager.acquire_multiple_locks(
                Dashboard, 
                dashboard_ids, 
                user_id,
                action_type="DELETE"
            )
            
            if not lock_result.get("success", False):
                # 락 획득 실패
                failed_ids = lock_result.get("failed_ids", [])
                raise LockConflictException(
                    detail=f"{len(failed_ids)}개 항목에 대한 락 획득 실패"
                )
            
            # 삭제 처리
            delete_result = self.db.query(Dashboard).filter(
                Dashboard.dashboard_id.in_(dashboard_ids)
            ).delete(synchronize_session=False)
            
            self.db.flush()
            log_info(f"대시보드 삭제 완료: {delete_result}건")
            return delete_result
            
        except Exception as e:
            log_error(f"대시보드 삭제 실패: {str(e)}", {"ids": dashboard_ids})
            raise

    def search_dashboards_by_order_no(self, order_no: str, page: int = 1, page_size: int = 10) -> Tuple[List[Dashboard], int]:
        """주문번호로 대시보드 검색"""
        try:
            log_info(f"주문번호로 대시보드 검색: {order_no}, 페이지={page}, 페이지크기={page_size}")
            
            # 전체 개수 쿼리
            count_query = (
                self.db.query(func.count(Dashboard.dashboard_id))
                .filter(Dashboard.order_no.ilike(f"%{order_no}%"))
            )
            total_count = count_query.scalar()
            
            # 페이지네이션 적용된 데이터 쿼리
            offset = (page - 1) * page_size
            dashboards = (
                self.db.query(Dashboard)
                .filter(Dashboard.order_no.ilike(f"%{order_no}%"))
                .order_by(Dashboard.eta)
                .offset(offset)
                .limit(page_size)
                .all()
            )
            
            log_info(f"검색 결과: {len(dashboards)}건 (전체 {total_count}건)")
            return dashboards, total_count
            
        except Exception as e:
            log_error(f"주문번호 검색 실패: {str(e)}", {"order_no": order_no})
            return [], 0

    def get_eta_date_range(self):
        """대시보드 ETA의 최소/최대 날짜 범위 조회"""
        result = {}
        try:
            min_eta_query = self.db.query(func.min(Dashboard.eta)).scalar()
            max_eta_query = self.db.query(func.max(Dashboard.eta)).scalar()
            
            result = {
                'min_eta': min_eta_query,
                'max_eta': max_eta_query
            }
        except Exception as e:
            log_error(f"ETA 날짜 범위 조회 중 오류 발생: {str(e)}")
        
        return result

    def get_dashboard_list_by_date_with_filters(
        self, start_date, end_date, page=1, size=10, filters=None
    ) -> Tuple[List[Dashboard], int]:
        """날짜 범위와 필터를 적용하여 대시보드 목록 조회 (페이지네이션 적용)"""
        if filters is None:
            filters = {}
            
        # 기본 쿼리 구성
        query = self.db.query(Dashboard)
        
        # 날짜 필터링 적용 (필수 조건)
        if start_date:
            query = query.filter(Dashboard.eta >= start_date)
        if end_date:
            query = query.filter(Dashboard.eta <= end_date)
            
        # 추가 필터 적용
        if 'status' in filters and filters['status']:
            query = query.filter(Dashboard.status == filters['status'])
            
        if 'department' in filters and filters['department']:
            query = query.filter(Dashboard.department == filters['department'])
            
        if 'warehouse' in filters and filters['warehouse']:
            query = query.filter(Dashboard.warehouse == filters['warehouse'])
            
        if 'search_term' in filters and filters['search_term']:
            search_term = f"%{filters['search_term']}%"
            query = query.filter(
                or_(
                    Dashboard.order_no.ilike(search_term),
                    Dashboard.customer.ilike(search_term),
                    Dashboard.address.ilike(search_term),
                    Dashboard.driver_name.ilike(search_term)
                )
            )
        
        # 전체 개수 쿼리 (별도 실행하여 성능 최적화)
        count_query = query.with_entities(func.count())
        total_count = count_query.scalar()
        
        # 페이지네이션 적용 - N+1 쿼리 문제 해결을 위한 조인로드 적용
        offset = (page - 1) * size
        query = query.options(joinedload(Dashboard.postal_code_info)).order_by(Dashboard.eta.asc()).offset(offset).limit(size)
        
        # 결과 반환
        results = query.all()
        log_info(f"필터 조회 결과: {len(results)}건 (전체 {total_count}건)")
        return results, total_count

    # get_all_dashboard_list_with_filters 메서드는 필요할 경우에만 사용하도록 경고 추가
    def get_all_dashboard_list_with_filters(self, start_date, end_date, filters=None):
        """
        클라이언트 사이드 페이지네이션을 위한 전체 데이터셋 조회
        주의: 큰 데이터셋에서는 성능 문제가 발생할 수 있으므로 가급적 서버 사이드 페이지네이션 사용 권장
        """
        log_info("전체 대시보드 목록 조회 (클라이언트 페이지네이션용) - 성능 주의")
        
        if filters is None:
            filters = {}
            
        query = self.db.query(Dashboard)
        
        # 날짜 필터링 적용
        if start_date:
            query = query.filter(Dashboard.eta >= start_date)
        if end_date:
            query = query.filter(Dashboard.eta <= end_date)
            
        # 추가 필터 적용
        if 'status' in filters and filters['status']:
            query = query.filter(Dashboard.status == filters['status'])
            
        if 'department' in filters and filters['department']:
            query = query.filter(Dashboard.department == filters['department'])
            
        if 'warehouse' in filters and filters['warehouse']:
            query = query.filter(Dashboard.warehouse == filters['warehouse'])
            
        if 'search_term' in filters and filters['search_term']:
            search_term = f"%{filters['search_term']}%"
            query = query.filter(
                or_(
                    Dashboard.order_no.ilike(search_term),
                    Dashboard.customer.ilike(search_term),
                    Dashboard.address.ilike(search_term),
                    Dashboard.driver_name.ilike(search_term)
                )
            )
        
        # 정렬 적용
        query = query.order_by(Dashboard.eta.asc())
        
        # 결과 반환 (경고 로그 추가)
        results = query.all()
        log_info(f"전체 목록 조회 완료: {len(results)}건 (큰 데이터셋에서는 성능 주의)")
        return results
