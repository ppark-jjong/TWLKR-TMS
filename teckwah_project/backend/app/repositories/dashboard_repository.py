# backend/app/repositories/dashboard_repository.py
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_, or_, text
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import pytz

from app.models.dashboard_model import Dashboard
from app.models.postal_code_model import PostalCode, PostalCodeDetail
from app.interfaces.repository_interfaces import DashboardRepositoryInterface
from app.utils.logger import log_info, log_error
from app.utils.datetime_helper import KST, get_kst_now, localize_to_kst


class DashboardRepository(DashboardRepositoryInterface):
    """대시보드 저장소 구현"""

    def __init__(self, db: Session):
        self.db = db

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
            log_error(e, "대시보드 목록 조회 실패")
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
            log_error(e, "대시보드 상세 조회 실패", {"id": dashboard_id})
            return None

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
            log_error(e, "날짜 범위 조회 실패")
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
            log_error(e, "대시보드 생성 실패", dashboard_data)
            self.db.rollback()
            return None

    def update_dashboard_fields(
        self, dashboard_id: int, fields: Dict[str, Any]
    ) -> Optional[Dashboard]:
        """대시보드 필드 업데이트"""
        try:
            log_info(f"대시보드 필드 업데이트: ID={dashboard_id}, 필드={fields}")

            # 수정된 부분: Dashboard.warehouse 클래스 속성 직접 참조 문제 해결
            # 우편번호 변경 시 관련 정보도 함께 업데이트
            if "postal_code" in fields:
                postal_code = fields["postal_code"]
                postal_info = (
                    self.db.query(PostalCode)
                    .filter(PostalCode.postal_code == postal_code)
                    .first()
                )

                if postal_info:
                    fields["city"] = postal_info.city
                    fields["county"] = postal_info.county
                    fields["district"] = postal_info.district

                    # 창고 정보가 있으면 거리, 소요시간 정보도 업데이트
                    # Dashboard.warehouse 클래스 속성 직접 참조 대신 대시보드 객체에서 warehouse 값 조회
                    dashboard = self.get_dashboard_detail(dashboard_id)
                    if dashboard and ("warehouse" in fields or dashboard.warehouse):
                        warehouse = fields.get("warehouse") or dashboard.warehouse
                        detail_info = (
                            self.db.query(PostalCodeDetail)
                            .filter(
                                PostalCodeDetail.postal_code == postal_code,
                                PostalCodeDetail.warehouse == warehouse,
                            )
                            .first()
                        )

                        if detail_info:
                            fields["distance"] = detail_info.distance
                            fields["duration_time"] = detail_info.duration_time

            # 필드 업데이트
            result = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .update(fields)
            )

            if result:
                dashboard = self.get_dashboard_detail(dashboard_id)
                log_info(f"대시보드 필드 업데이트 완료: ID={dashboard_id}")
                return dashboard
            else:
                log_info(f"업데이트할 대시보드 없음: ID={dashboard_id}")
                return None

        except Exception as e:
            log_error(
                e, "대시보드 필드 업데이트 실패", {"id": dashboard_id, "fields": fields}
            )
            self.db.rollback()
            return None

    def assign_driver(
        self, dashboard_ids: List[int], driver_name: str, driver_contact: str
    ) -> List[Dashboard]:
        """배차 처리 (여러 대시보드에 배차 담당자 할당)"""
        try:
            log_info(f"배차 처리: IDs={dashboard_ids}, 담당자={driver_name}")

            # 배차 정보 업데이트
            result = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .update(
                    {
                        "driver_name": driver_name,
                        "driver_contact": driver_contact,
                    },
                    synchronize_session=False,  # bulk update 최적화
                )
            )

            # 업데이트된 대시보드 목록 조회
            updated_dashboards = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .all()
            )

            log_info(f"배차 처리 완료: {len(updated_dashboards)}건")
            return updated_dashboards

        except Exception as e:
            log_error(
                e, "배차 처리 실패", {"ids": dashboard_ids, "driver": driver_name}
            )
            self.db.rollback()
            return []

    def delete_dashboards(self, dashboard_ids: List[int]) -> int:
        """대시보드 삭제 (관리자 전용)"""
        try:
            log_info(f"대시보드 삭제: IDs={dashboard_ids}")

            # 삭제 전 메모 및 락 확인
            result = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .delete(synchronize_session=False)  # bulk delete 최적화
            )

            log_info(f"대시보드 삭제 완료: {result}건")
            return result
        except Exception as e:
            log_error(e, "대시보드 삭제 실패", {"ids": dashboard_ids})
            self.db.rollback()
            return 0

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
            log_error(e, "주문번호 검색 실패", {"order_no": order_no})
            return []

    def acquire_lock_for_update(self, dashboard_id: int) -> Optional[Dashboard]:
        """대시보드 행 락 획득 (FOR UPDATE)"""
        try:
            log_info(f"대시보드 행 락 획득: ID={dashboard_id}")

            # WITH FOR UPDATE 구문으로 행 락 획득
            dashboard = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .with_for_update()
                .first()
            )

            return dashboard
        except Exception as e:
            log_error(e, "행 락 획득 실패", {"id": dashboard_id})
            return None

    def acquire_locks_for_update(self, dashboard_ids: List[int]) -> List[Dashboard]:
        """여러 대시보드에 대한 행 락 획득 (FOR UPDATE)"""
        try:
            log_info(f"여러 대시보드 행 락 획득: IDs={dashboard_ids}")

            # WITH FOR UPDATE 구문으로 여러 행 락 획득
            dashboards = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .with_for_update()
                .all()
            )

            return dashboards
        except Exception as e:
            log_error(e, "여러 행 락 획득 실패", {"ids": dashboard_ids})
            return []
