# backend/app/repositories/dashboard_repository.py
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict, Any, Set
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, or_, exc, desc, case
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from app.models.dashboard_model import Dashboard
from app.models.postal_code_model import PostalCode, PostalCodeDetail
from app.utils.logger import log_error, log_info
from app.utils.exceptions import OptimisticLockException, PessimisticLockException
from app.repositories.dashboard_lock_repository import DashboardLockRepository
import time
import pytz

class DashboardRepository:
    def __init__(self, db: Session):
        self.db = db
        self.kr_timezone = pytz.timezone("Asia/Seoul")

    def get_dashboards_by_date_range(
        self, start_time: datetime, end_time: datetime
    ) -> List[Dashboard]:
        """기간별 대시보드 조회 - ETA 날짜 기준"""
        try:
            log_info(f"ETA 기준 기간별 대시보드 조회: {start_time} ~ {end_time}")

            result = (
                self.db.query(Dashboard)
                .filter(and_(Dashboard.eta >= start_time, Dashboard.eta <= end_time))
                .order_by(
                    # 상태별 그룹화 우선 (대기, 진행 중 우선, 완료/이슈/취소는 후순위)
                    case(
                        (Dashboard.status == "WAITING", 1),
                        (Dashboard.status == "IN_PROGRESS", 2),
                        (Dashboard.status == "COMPLETE", 10),
                        (Dashboard.status == "ISSUE", 11),
                        (Dashboard.status == "CANCEL", 12),
                        else_=99,
                    ).asc(),
                    # 같은 상태 그룹 내에서는 ETA 기준 정렬
                    Dashboard.eta.asc(),
                )
                .all()
            )

            # 결과 검증 및 로깅
            if result:
                log_info(f"대시보드 조회 결과: {len(result)}건")

                # 데이터 샘플 로깅 (디버깅용)
                if len(result) > 0:
                    sample = result[0]
                    log_info(
                        f"샘플 데이터: ID={sample.dashboard_id}, 상태={sample.status}, SLA={sample.sla}, 담당자={sample.driver_name}"
                    )
            else:
                log_info("대시보드 조회 결과 없음")
                result = []

            return result

        except NameError as e:
            log_error(
                e,
                "대시보드 조회 실패: 필요한 함수/변수가 정의되지 않음",
                {"start": start_time, "end": end_time},
            )
            raise
        except SQLAlchemyError as e:
            log_error(
                e,
                "대시보드 조회 실패: 데이터베이스 오류",
                {"start": start_time, "end": end_time},
            )
            raise
        except Exception as e:
            log_error(
                e,
                "대시보드 조회 실패: 예상치 못한 오류",
                {"start": start_time, "end": end_time},
            )
            raise

    def search_dashboards_by_order_no(self, order_no: str) -> List[Dashboard]:
        """주문번호로 대시보드 검색 (인덱스 활용)"""
        try:
            log_info(f"주문번호로 대시보드 검색: {order_no}")

            # order_no 컬럼이 String(15) 타입이므로 검색 처리
            search_term = order_no.strip()

            # 정확히 일치하는 주문번호 검색
            result = (
                self.db.query(Dashboard)
                .filter(Dashboard.order_no == search_term)
                .order_by(
                    case(
                        (Dashboard.status == "WAITING", 1),
                        (Dashboard.status == "IN_PROGRESS", 2),
                        (Dashboard.status == "COMPLETE", 10),
                        (Dashboard.status == "ISSUE", 11),
                        (Dashboard.status == "CANCEL", 12),
                        else_=99,
                    ).asc(),
                    Dashboard.eta.asc(),
                )
                .all()
            )

            # 결과 검증 및 로깅
            if result:
                log_info(f"주문번호 검색 결과: {len(result)}건")
                if len(result) > 0:
                    log_info(
                        f"첫 번째 결과: ID={result[0].dashboard_id}, 상태={result[0].status}"
                    )
            else:
                log_info("주문번호 검색 결과 없음")

            return result

        except SQLAlchemyError as e:
            log_error(e, "주문번호 검색 실패", {"order_no": order_no})
            raise

    def get_dashboard_detail(self, dashboard_id: int) -> Optional[Dashboard]:
        """대시보드 상세 정보 조회 (읽기 전용)"""
        try:
            log_info(f"대시보드 상세 조회: {dashboard_id}")
            result = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id == dashboard_id)
                .first()
            )

            # 결과 검증 및 로깅
            if result:
                log_info(
                    f"대시보드 상세 조회 결과: ID={result.dashboard_id}, 상태={result.status}, SLA={result.sla}"
                )
            else:
                log_info(f"대시보드 상세 조회 결과 없음: ID={dashboard_id}")

            return result
        except SQLAlchemyError as e:
            log_error(e, "대시보드 조회 실패", {"id": dashboard_id})
            raise

    def get_dashboard_detail_with_lock(
        self, dashboard_id: int, user_id: str, lock_type: str = "EDIT"
    ) -> Optional[Dashboard]:
        """대시보드 상세 정보 조회 (비관적 락 적용)"""
        try:
            log_info(
                f"대시보드 상세 조회 (비관적 락): {dashboard_id}, 사용자: {user_id}, 락 타입: {lock_type}"
            )

            # DashboardLockRepository 인스턴스 생성
            lock_repository = DashboardLockRepository(self.db)

            # 락 획득 시도
            try:
                lock = lock_repository.acquire_lock(dashboard_id, user_id, lock_type)
                if not lock:
                    raise PessimisticLockException("다른 사용자가 수정 중입니다.")
            except PessimisticLockException as e:
                log_info(f"락 획득 실패: {e.detail}")
                raise

            # SELECT FOR UPDATE로 DB 레벨 락 획득 - with_for_update 호출 위치 수정
            try:
                result = (
                    self.db.query(Dashboard)
                    .filter(Dashboard.dashboard_id == dashboard_id)
                    .with_for_update(nowait=True)  # 위치 변경됨
                    .first()
                )
            except exc.OperationalError as e:
                # 락 획득 실패 시 이미 획득한 락 해제
                lock_repository.release_lock(dashboard_id, user_id)
                log_error(e, "대시보드 락 획득 실패", {"id": dashboard_id})
                raise PessimisticLockException("데이터베이스 락을 획득할 수 없습니다.")

            if not result:
                # 락을 획득했지만 데이터가 없는 경우 락 해제
                lock_repository.release_lock(dashboard_id, user_id)
                log_info(f"대시보드 상세 조회 결과 없음 (락 해제): ID={dashboard_id}")
                return None

            log_info(
                f"대시보드 상세 조회 결과 (락 획득): ID={result.dashboard_id}, 상태={result.status}"
            )
            return result

        except PessimisticLockException:
            # 이미 예외를 발생시켰으므로 그대로 전파
            raise
        except SQLAlchemyError as e:
            log_error(e, "대시보드 조회 실패", {"id": dashboard_id})
            # 에러 발생 시 락 해제 시도
            try:
                lock_repository = DashboardLockRepository(self.db)
                lock_repository.release_lock(dashboard_id, user_id)
            except:
                log_error(None, "락 해제 실패", {"id": dashboard_id})
            raise

    def get_dashboards_by_ids(self, dashboard_ids: List[int]) -> List[Dashboard]:
        """대시보드 다중 조회"""
        try:
            log_info(f"대시보드 다중 조회: {dashboard_ids}")
            result = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .all()
            )

            # 결과 검증 및 로깅
            if result:
                log_info(
                    f"대시보드 다중 조회 결과: {len(result)}건 / 요청 {len(dashboard_ids)}건"
                )
                if len(result) < len(dashboard_ids):
                    found_ids = [r.dashboard_id for r in result]
                    missing_ids = [id for id in dashboard_ids if id not in found_ids]
                    log_info(f"찾을 수 없는 대시보드: {missing_ids}")
            else:
                log_info(f"대시보드 다중 조회 결과 없음: IDs={dashboard_ids}")

            return result
        except SQLAlchemyError as e:
            log_error(e, "대시보드 다중 조회 실패", {"ids": dashboard_ids})
            raise

    def acquire_locks_for_multiple_dashboards(
        self, dashboard_ids: List[int], user_id: str, lock_type: str = "ASSIGN"
    ) -> List[int]:
        """여러 대시보드에 대한 락 획득 시도 (배차 처리 등에 사용)
        반환값: 락 획득에 성공한 대시보드 ID 목록
        """
        if not dashboard_ids:
            return []

        log_info(f"여러 대시보드 락 획득 시도: {dashboard_ids}, 사용자: {user_id}")

        lock_repository = DashboardLockRepository(self.db)
        acquired_ids = []
        failed_ids = []

        try:
            # 각 대시보드에 대해 락 획득 시도
            for dashboard_id in dashboard_ids:
                try:
                    lock = lock_repository.acquire_lock(
                        dashboard_id, user_id, lock_type
                    )
                    if lock:
                        acquired_ids.append(dashboard_id)
                    else:
                        failed_ids.append(dashboard_id)
                except PessimisticLockException:
                    failed_ids.append(dashboard_id)

            # 일부 락 획득 실패 시 이미 획득한 락도 모두 해제
            if failed_ids:
                log_info(f"일부 대시보드 락 획득 실패: {failed_ids}, 모든 락 해제")
                for acquired_id in acquired_ids:
                    lock_repository.release_lock(acquired_id, user_id)
                return []

            return acquired_ids

        except Exception as e:
            # 에러 발생 시 획득한 모든 락 해제
            log_error(e, "여러 대시보드 락 획득 실패", {"ids": dashboard_ids})
            for acquired_id in acquired_ids:
                try:
                    lock_repository.release_lock(acquired_id, user_id)
                except:
                    pass
            return []

    def create_dashboard(
        self,
        dashboard_data: Dict[str, Any],
        current_time: datetime,
    ) -> Dashboard:
        """대시보드 생성"""
        try:
            log_info(f"대시보드 생성 시작")

            dashboard = Dashboard(**dashboard_data)
            dashboard.version = 1  # 초기 버전 설정
            dashboard.create_time = current_time  # KST 시간을 직접 설정
            self.db.add(dashboard)

            # postal_code_detail 정보 연결 위해 flush
            self.db.flush()

            # 거리/시간 정보 조회 시도
            postal_detail = (
                self.db.query(PostalCodeDetail)
                .filter(
                    and_(
                        PostalCodeDetail.postal_code == dashboard.postal_code,
                        PostalCodeDetail.warehouse == dashboard.warehouse,
                    )
                )
                .first()
            )

            # 정보가 있으면 업데이트
            if postal_detail:
                dashboard.distance = postal_detail.distance
                dashboard.duration_time = postal_detail.duration_time

            self.db.commit()
            self.db.refresh(dashboard)

            # 생성된 대시보드 정보 로깅
            log_info(
                f"대시보드 생성 완료: ID={dashboard.dashboard_id}, 상태={dashboard.status}, SLA={dashboard.sla}"
            )

            return dashboard

        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "대시보드 생성 실패", dashboard_data)
            raise

    def update_dashboard_status(
        self,
        dashboard_id: int,
        status: str,
        current_time: datetime,
        expected_version: int,
    ) -> Optional[Dashboard]:
        """상태 업데이트 (낙관적 락만 적용)"""
        try:
            dashboard = self.get_dashboard_detail(dashboard_id)
            if not dashboard:
                return None

            # 낙관적 락 검증
            if dashboard.version != expected_version:
                log_info(
                    f"낙관적 락 충돌 발생: 대시보드 ID {dashboard_id}, 예상 버전 {expected_version}, 실제 버전 {dashboard.version}"
                )
                raise OptimisticLockException(
                    f"다른 사용자가 이미 데이터를 수정했습니다. 최신 데이터를 확인하세요.",
                    current_version=dashboard.version,
                )

            old_status = dashboard.status
            dashboard.status = status

            # 상태 변경에 따른 시간 업데이트
            if status == "IN_PROGRESS" and old_status != "IN_PROGRESS":
                dashboard.depart_time = current_time
                dashboard.complete_time = None
            elif status in ["COMPLETE", "ISSUE"]:
                dashboard.complete_time = current_time
            elif status in ["WAITING", "CANCEL"]:
                dashboard.depart_time = None
                dashboard.complete_time = None

            # 버전 증가
            dashboard.version += 1

            self.db.commit()
            self.db.refresh(dashboard)

            # 상태 업데이트 결과 로깅
            log_info(
                f"상태 업데이트 완료: ID={dashboard.dashboard_id}, {old_status} -> {status}, 버전={dashboard.version}"
            )

            return dashboard

        except OptimisticLockException:
            self.db.rollback()
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "상태 업데이트 실패", {"id": dashboard_id, "status": status})
            raise

    def update_dashboard_status_with_lock(
        self,
        dashboard_id: int,
        status: str,
        current_time: datetime,
        expected_version: int,
        user_id: str,
    ) -> Optional[Dashboard]:
        """상태 업데이트 (낙관적 락 + 비관적 락 적용)"""
        try:
            # 비관적 락으로 대시보드 조회
            dashboard = self.get_dashboard_detail_with_lock(
                dashboard_id, user_id, "STATUS"
            )
            if not dashboard:
                return None

            # 낙관적 락 검증
            if dashboard.version != expected_version:
                log_info(
                    f"낙관적 락 충돌 발생: 대시보드 ID {dashboard_id}, 예상 버전 {expected_version}, 실제 버전 {dashboard.version}"
                )
                # 락 해제
                lock_repository = DashboardLockRepository(self.db)
                lock_repository.release_lock(dashboard_id, user_id)

                raise OptimisticLockException(
                    f"다른 사용자가 이미 데이터를 수정했습니다. 최신 데이터를 확인하세요.",
                    current_version=dashboard.version,
                )

            old_status = dashboard.status
            dashboard.status = status

            # 상태 변경에 따른 시간 업데이트
            if status == "IN_PROGRESS" and old_status != "IN_PROGRESS":
                dashboard.depart_time = current_time
                dashboard.complete_time = None
            elif status in ["COMPLETE", "ISSUE"]:
                dashboard.complete_time = current_time
            elif status in ["WAITING", "CANCEL"]:
                dashboard.depart_time = None
                dashboard.complete_time = None

            # 버전 증가
            dashboard.version += 1

            self.db.commit()
            self.db.refresh(dashboard)

            # 락 해제
            lock_repository = DashboardLockRepository(self.db)
            lock_repository.release_lock(dashboard_id, user_id)

            # 상태 업데이트 결과 로깅
            log_info(
                f"상태 업데이트 완료: ID={dashboard.dashboard_id}, {old_status} -> {status}, 버전={dashboard.version}"
            )

            return dashboard

        except OptimisticLockException:
            self.db.rollback()
            # 락 해제는 이미 전에 수행됨
            raise
        except PessimisticLockException:
            self.db.rollback()
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            # 락 해제
            lock_repository = DashboardLockRepository(self.db)
            lock_repository.release_lock(dashboard_id, user_id)
            log_error(e, "상태 업데이트 실패", {"id": dashboard_id, "status": status})
            raise

    def update_dashboard_fields(
        self, dashboard_id: int, fields: Dict[str, Any], expected_version: int
    ) -> Optional[Dashboard]:
        """대시보드 필드 업데이트 (낙관적 락 적용)"""
        try:
            dashboard = self.get_dashboard_detail(dashboard_id)
            if not dashboard:
                return None

            # 낙관적 락 검증
            if dashboard.version != expected_version:
                log_info(
                    f"낙관적 락 충돌 발생: 대시보드 ID {dashboard_id}, 예상 버전 {expected_version}, 실제 버전 {dashboard.version}"
                )
                raise OptimisticLockException(
                    f"다른 사용자가 이미 데이터를 수정했습니다. 최신 데이터를 확인하세요.",
                    current_version=dashboard.version,
                )

            # 필드 업데이트
            for field, value in fields.items():
                if hasattr(dashboard, field) and field != "version":
                    setattr(dashboard, field, value)

            dashboard.version += 1  # 버전 증가

            self.db.commit()
            self.db.refresh(dashboard)

            # 필드 업데이트 결과 로깅
            log_info(
                f"필드 업데이트 완료: ID={dashboard.dashboard_id}, 필드={list(fields.keys())}, 버전={dashboard.version}"
            )

            return dashboard

        except OptimisticLockException:
            self.db.rollback()
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "필드 업데이트 실패", {"id": dashboard_id, "fields": fields})
            raise

    def update_dashboard_fields_with_lock(
        self,
        dashboard_id: int,
        fields: Dict[str, Any],
        expected_version: int,
        user_id: str,
    ) -> Optional[Dashboard]:
        """대시보드 필드 업데이트 (낙관적 락 + 비관적 락 적용)"""
        try:
            # 비관적 락으로 대시보드 조회
            dashboard = self.get_dashboard_detail_with_lock(
                dashboard_id, user_id, "EDIT"
            )
            if not dashboard:
                return None

            # 낙관적 락 검증
            if dashboard.version != expected_version:
                log_info(
                    f"낙관적 락 충돌 발생: 대시보드 ID {dashboard_id}, 예상 버전 {expected_version}, 실제 버전 {dashboard.version}"
                )
                # 락 해제
                lock_repository = DashboardLockRepository(self.db)
                lock_repository.release_lock(dashboard_id, user_id)

                raise OptimisticLockException(
                    f"다른 사용자가 이미 데이터를 수정했습니다. 최신 데이터를 확인하세요.",
                    current_version=dashboard.version,
                )

            # 필드 업데이트
            for field, value in fields.items():
                if hasattr(dashboard, field) and field != "version":
                    setattr(dashboard, field, value)

            dashboard.version += 1  # 버전 증가

            self.db.commit()
            self.db.refresh(dashboard)

            # 락 해제
            lock_repository = DashboardLockRepository(self.db)
            lock_repository.release_lock(dashboard_id, user_id)

            # 필드 업데이트 결과 로깅
            log_info(
                f"필드 업데이트 완료: ID={dashboard.dashboard_id}, 필드={list(fields.keys())}, 버전={dashboard.version}"
            )

            return dashboard

        except OptimisticLockException:
            self.db.rollback()
            # 락 해제는 이미 전에 수행됨
            raise
        except PessimisticLockException:
            self.db.rollback()
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            # 락 해제
            lock_repository = DashboardLockRepository(self.db)
            lock_repository.release_lock(dashboard_id, user_id)
            log_error(e, "필드 업데이트 실패", {"id": dashboard_id, "fields": fields})
            raise

    def assign_driver_with_lock(
        self,
        dashboard_ids: List[int],
        driver_name: str,
        driver_contact: str,
        versions: Dict[int, int],
        user_id: str,
    ) -> List[Dashboard]:
        """배차 처리 (낙관적 락 + 비관적 락 적용)"""
        try:
            log_info(f"배차 처리 (락 적용): {len(dashboard_ids)}건, 사용자: {user_id}")

            # 1. 먼저 모든 대시보드에 락 획득 시도
            acquired_ids = self.acquire_locks_for_multiple_dashboards(
                dashboard_ids, user_id, "ASSIGN"
            )
            if not acquired_ids or len(acquired_ids) != len(dashboard_ids):
                log_info(f"일부 대시보드 락 획득 실패, 배차 처리 중단")
                raise PessimisticLockException(f"다른 사용자가 배차 중입니다.")

            # 2. 대상 대시보드 조회 (이미 락이 걸려있음)
            dashboards = self.get_dashboards_by_ids(dashboard_ids)
            if not dashboards:
                # 락 해제 후 종료
                lock_repository = DashboardLockRepository(self.db)
                for dashboard_id in acquired_ids:
                    lock_repository.release_lock(dashboard_id, user_id)
                return []

            successful_ids = []
            failed_ids = []

            # 3. 각 대시보드에 대해 낙관적 락 검증 후 배차 정보 업데이트
            for dashboard in dashboards:
                if dashboard.dashboard_id not in versions:
                    failed_ids.append(dashboard.dashboard_id)
                    continue

                expected_version = versions[dashboard.dashboard_id]

                # 낙관적 락 검증
                if dashboard.version != expected_version:
                    log_info(
                        f"낙관적 락 충돌 발생: 대시보드 ID {dashboard.dashboard_id}, 예상 버전 {expected_version}, 실제 버전 {dashboard.version}"
                    )
                    failed_ids.append(dashboard.dashboard_id)
                    continue

                # 배차 정보 업데이트
                dashboard.driver_name = driver_name
                dashboard.driver_contact = driver_contact
                dashboard.version += 1  # 버전 증가
                successful_ids.append(dashboard.dashboard_id)

            if failed_ids:
                # 실패한 항목이 있으면 롤백하고 예외 발생
                self.db.rollback()
                log_info(f"배차 처리 실패 항목: {failed_ids}")

                # 모든 락 해제
                lock_repository = DashboardLockRepository(self.db)
                for dashboard_id in acquired_ids:
                    lock_repository.release_lock(dashboard_id, user_id)

                raise OptimisticLockException(
                    f"일부 항목이 다른 사용자에 의해 수정되었습니다. 최신 데이터를 확인하세요.",
                    current_version=0,  # 프론트엔드에서 재조회 하도록 함
                )

            self.db.commit()

            # 모든 락 해제
            lock_repository = DashboardLockRepository(self.db)
            for dashboard_id in acquired_ids:
                lock_repository.release_lock(dashboard_id, user_id)

            # 배차 처리 결과 로깅
            log_info(f"배차 처리 완료: {len(successful_ids)}건")

            # 업데이트된 대시보드 다시 조회하여 반환
            return self.get_dashboards_by_ids(successful_ids)

        except OptimisticLockException:
            # 모든 락 해제
            lock_repository = DashboardLockRepository(self.db)
            for dashboard_id in dashboard_ids:
                lock_repository.release_lock(dashboard_id, user_id)
            raise
        except PessimisticLockException:
            # 모든 락 해제
            lock_repository = DashboardLockRepository(self.db)
            for dashboard_id in dashboard_ids:
                lock_repository.release_lock(dashboard_id, user_id)
            raise
        except SQLAlchemyError as e:
            self.db.rollback()
            # 모든 락 해제
            lock_repository = DashboardLockRepository(self.db)
            for dashboard_id in dashboard_ids:
                lock_repository.release_lock(dashboard_id, user_id)
            log_error(e, "배차 처리 실패", {"ids": dashboard_ids})
            raise

    def delete_dashboards(self, dashboard_ids: List[int]) -> bool:
        """대시보드 삭제"""
        try:
            if not dashboard_ids:
                return False

            deleted = (
                self.db.query(Dashboard)
                .filter(Dashboard.dashboard_id.in_(dashboard_ids))
                .delete(synchronize_session=False)
            )

            self.db.commit()
            log_info(f"대시보드 삭제 완료: {deleted}건")
            return deleted > 0
        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "대시보드 삭제 실패", {"ids": dashboard_ids})
            raise

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 (ETA 기준)"""
        try:
            log_info("조회 가능 날짜 범위 조회")

            # MIN, MAX 조회 쿼리
            result = self.db.query(
                func.min(Dashboard.eta).label("oldest_date"),
                func.max(Dashboard.eta).label("latest_date"),
            ).first()

            # NULL 처리 및 기본값 설정
            oldest_date = (
                result.oldest_date if result and result.oldest_date else datetime.now()
            )
            latest_date = (
                result.latest_date if result and result.latest_date else datetime.now()
            )

            log_info(f"조회 가능 날짜 범위: {oldest_date} ~ {latest_date}")
            return oldest_date, latest_date

        except SQLAlchemyError as e:
            log_error(e, "날짜 범위 조회 실패")
            # 에러 시 기본값 반환 (현재 기준 전/후 30일)
            now = datetime.now()
            return now - timedelta(days=30), now
