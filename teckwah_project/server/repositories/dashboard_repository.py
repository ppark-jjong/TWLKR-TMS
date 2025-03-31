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
from server.utils.transaction import with_row_lock, update_lock_info, with_row_lock_timeout
from server.utils.error import LockConflictException
from server.config.settings import get_settings


class DashboardRepository:
    """통합된 대시보드 저장소 구현"""

    def __init__(self, db: Session):
        self.db = db

    #
    # [대시보드 기본 기능 영역]
    #
    def get_dashboard_list_by_date(
        self, start_date: datetime, end_date: datetime
    ) -> List[Dashboard]:
        """ETA 기준으로 날짜 범위 내 대시보드 목록 조회"""
        try:
            log_info(f"대시보드 목록 조회: {start_date} ~ {end_date}")
            query = (
                self.db.query(Dashboard)
                .filter(Dashboard.eta.between(start_date, end_date))
                .order_by(Dashboard.eta)
            )
            result = query.all()
            log_info(f"대시보드 목록 조회 결과: {len(result)}건")
            return result
        except Exception as e:
            log_error(f"대시보드 목록 조회 실패: {str(e)}")
            return []

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
            
            # 개선된 타임아웃 처리가 적용된 행 락 획득 함수 사용
            dashboard = (
                with_row_lock_timeout(
                    self.db.query(Dashboard)
                    .filter(Dashboard.dashboard_id == dashboard_id)
                )
                .options(joinedload(Dashboard.postal_code_info))
                .first()
            )
            
            if dashboard:
                # UI 표시용 락 정보 업데이트
                update_lock_info(dashboard, user_id)
                self.db.flush()
                log_info(f"대시보드 락 획득 성공: ID={dashboard_id}")
            else:
                log_info(f"락 획득할 대시보드 없음: ID={dashboard_id}")
                
            return dashboard
        except LockConflictException as e:
            log_error(f"대시보드 락 충돌: ID={dashboard_id}, 사용자={user_id}")
            # 간소화된 락 충돌 정보
            raise LockConflictException(
                detail=f"대시보드 ID {dashboard_id}에 대한 락을 획득할 수 없습니다. 다른 사용자가 편집 중입니다."
            )
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
            dashboard = Dashboard(**dashboard_data)
            self.db.add(dashboard)
            self.db.flush()  # ID 생성을 위해 flush
            self.db.refresh(dashboard)
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
            
            # 락과 함께 대시보드 조회
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
        self, dashboard_ids: List[int], driver_name: str, driver_contact: str, user_id: str
    ) -> List[Dashboard]:
        """배차 처리 (여러 대시보드에 배차 담당자 할당) - 행 수준 락 적용"""
        try:
            log_info(f"배차 처리: IDs={dashboard_ids}, 담당자={driver_name}")
            
            updated_dashboards = []
            
            # 각 대시보드에 대해 락 획득 후 개별 업데이트
            for dashboard_id in dashboard_ids:
                # 락 획득 시도
                dashboard = self.get_dashboard_with_lock(dashboard_id, user_id)
                
                if dashboard:
                    # 배차 정보 업데이트
                    dashboard.driver_name = driver_name
                    dashboard.driver_contact = driver_contact
                    dashboard.updated_by = user_id
                    updated_dashboards.append(dashboard)
                else:
                    # 하나라도 락 획득에 실패하면 중단 (All or Nothing)
                    raise LockConflictException(f"대시보드 ID {dashboard_id}에 대한 락 획득 실패")
            
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
            
            deleted_count = 0
            
            # 각 대시보드에 대해 락 획득 후 개별 삭제
            for dashboard_id in dashboard_ids:
                # 락 획득 시도
                dashboard = self.get_dashboard_with_lock(dashboard_id, user_id)
                
                if dashboard:
                    # 대시보드 삭제
                    self.db.delete(dashboard)
                    deleted_count += 1
                else:
                    # 하나라도 락 획득에 실패하면 중단 (All or Nothing)
                    raise LockConflictException(f"대시보드 ID {dashboard_id}에 대한 락 획득 실패")
            
            self.db.flush()
            log_info(f"대시보드 삭제 완료: {deleted_count}건")
            return deleted_count
        except Exception as e:
            log_error(f"대시보드 삭제 실패: {str(e)}", {"ids": dashboard_ids})
            raise

    def search_dashboards_by_order_no(self, order_no: str) -> List[Dashboard]:
        """주문번호로 대시보드 검색"""
        try:
            log_info(f"주문번호 검색: {order_no}")

            # LIKE 검색 조건 생성 (주문번호에 검색어가 포함된 경우)
            search_term = f"%{order_no}%"

            dashboards = (
                self.db.query(Dashboard)
                .filter(Dashboard.order_no.like(search_term))
                .order_by(desc(Dashboard.eta))
                .all()
            )

            log_info(f"주문번호 검색 결과: {len(dashboards)}건")
            return dashboards
        except Exception as e:
            log_error(f"주문번호 검색 실패: {str(e)}")
            return []
            
    def get_lock_info(self, dashboard_id: int) -> Optional[Dict[str, Any]]:
        """Dashboard 행 단위 락 정보 제공 (UI 표시용)"""
        try:
            # 행 단위 락은 UI에서 보여줄 필요가 없으므로 간단한 정보만 반환
            return {
                "id": dashboard_id,
                "is_locked": False  # 행 단위 락은 UI에서 별도 표시하지 않음
            }
        except Exception as e:
            log_error(f"락 정보 조회 실패: {str(e)}")
            return None
