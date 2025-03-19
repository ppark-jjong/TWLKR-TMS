# app/repositories/dashboard_lock_repository.py
from datetime import datetime, timedelta
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, text, select
from sqlalchemy.exc import SQLAlchemyError, OperationalError

from app.models.dashboard_lock_model import DashboardLock
from app.models.dashboard_model import Dashboard
from app.utils.logger import log_info, log_error
from app.utils.exceptions import PessimisticLockException


class DashboardLockRepository:
    def __init__(self, db: Session):
        self.db = db
        self.default_lock_timeout = 300  # 기본 락 타임아웃 5분

    def acquire_lock(
        self, dashboard_id: int, user_id: str, lock_type: str, timeout_seconds: int = None
    ) -> Optional[DashboardLock]:
        """
        대시보드에 락 획득 시도 - 데이터베이스 트랜잭션 락 사용
        
        Args:
            dashboard_id: 대시보드 ID
            user_id: 사용자 ID
            lock_type: 락 유형 (EDIT, STATUS, ASSIGN, REMARK)
            timeout_seconds: 락 타임아웃(초), None인 경우 기본값 사용
            
        Returns:
            획득한 락 객체 또는 None
            
        Raises:
            PessimisticLockException: 락 획득 실패 시
        """
        timeout = timeout_seconds or self.default_lock_timeout
        
        try:
            # 1. 먼저 dashboard 테이블에 행 잠금 설정 (데이터베이스 트랜잭션 잠금)
            # SELECT ... FOR UPDATE NOWAIT 구문 사용
            try:
                # Row-level lock 획득 시도 (다른 세션이 잠금 중이면 즉시 실패)
                stmt = select(Dashboard).where(Dashboard.dashboard_id == dashboard_id).with_for_update(nowait=True)
                dashboard = self.db.execute(stmt).scalar_one_or_none()
                
                if not dashboard:
                    log_error(None, f"대시보드를 찾을 수 없음: ID {dashboard_id}")
                    return None
                    
            except OperationalError:
                # 다른 트랜잭션이 이미 해당 행을 잠금 - NOWAIT 옵션 때문에 즉시 실패
                log_error(None, f"대시보드 {dashboard_id}에 대한 DB 락 획득 실패")
                raise PessimisticLockException(
                    "다른 사용자가 이미 이 항목을 수정 중입니다", locked_by="Unknown"
                )
            
            # 2. 기존 락 정보 조회 (행 잠금 획득 성공 후)
            existing_lock = (
                self.db.query(DashboardLock)
                .filter(DashboardLock.dashboard_id == dashboard_id)
                .first()
            )
            
            if existing_lock:
                # 만료된 락인 경우 삭제
                if existing_lock.is_expired:
                    self.db.delete(existing_lock)
                    self.db.flush()
                # 현재 사용자의 락인 경우 갱신
                elif existing_lock.locked_by == user_id:
                    existing_lock.expires_at = datetime.utcnow() + timedelta(seconds=timeout)
                    self.db.flush()
                    return existing_lock
                # 다른 사용자의 락이 아직 유효한 경우 예외 발생
                else:
                    # 행 잠금은 이미 획득했으므로 다른 사용자 동시 접근 없음
                    # 그러나 메모리에 저장된 락 정보에 따라 추가 제약 적용
                    raise PessimisticLockException(
                        f"사용자 {existing_lock.locked_by}가 이미 수정 중입니다",
                        locked_by=existing_lock.locked_by,
                    )

            # 3. 새 락 생성
            current_time = datetime.utcnow()
            lock = DashboardLock(
                dashboard_id=dashboard_id,
                locked_by=user_id,
                locked_at=current_time,
                lock_type=lock_type,
                expires_at=current_time + timedelta(seconds=timeout),
                lock_timeout=timeout
            )
            self.db.add(lock)
            self.db.flush()

            log_info(
                f"락 획득 성공: 대시보드 ID {dashboard_id}, 사용자 {user_id}, 유형 {lock_type}"
            )
            return lock

        except PessimisticLockException:
            # 락 충돌 예외는 그대로 전파
            raise
        except SQLAlchemyError as e:
            # 다른 데이터베이스 오류 처리
            log_error(
                e, "락 획득 실패", {"dashboard_id": dashboard_id, "user_id": user_id}
            )
            # 트랜잭션 롤백은 호출자 책임
            raise

    def release_lock(self, dashboard_id: int, user_id: str) -> bool:
        """
        락 해제 (본인 소유의 락만 해제 가능)
        
        Args:
            dashboard_id: 대시보드 ID
            user_id: 사용자 ID
            
        Returns:
            해제 성공 여부
        """
        try:
            # dashboard_lock 테이블에서 락 삭제
            # 해당 사용자만 자신의 락을 해제할 수 있음
            deleted = (
                self.db.query(DashboardLock)
                .filter(
                    and_(
                        DashboardLock.dashboard_id == dashboard_id,
                        DashboardLock.locked_by == user_id,
                    )
                )
                .delete(synchronize_session=False)
            )
            
            self.db.flush()
            log_info(f"락 해제 {'성공' if deleted else '실패'}: 대시보드 ID {dashboard_id}, 사용자 {user_id}")
            return bool(deleted)

        except SQLAlchemyError as e:
            log_error(
                e, "락 해제 실패", {"dashboard_id": dashboard_id, "user_id": user_id}
            )
            # 트랜잭션 롤백은 호출자 책임
            raise

    def get_lock_info(self, dashboard_id: int) -> Optional[DashboardLock]:
        """
        대시보드 ID로 락 정보 조회
        
        Args:
            dashboard_id: 대시보드 ID
            
        Returns:
            락 객체 또는 None
        """
        try:
            lock = (
                self.db.query(DashboardLock)
                .filter(DashboardLock.dashboard_id == dashboard_id)
                .first()
            )
            
            # 만료된 락은 자동으로 정리
            if lock and lock.is_expired:
                self.db.delete(lock)
                self.db.flush()
                return None
                
            return lock
        except SQLAlchemyError as e:
            log_error(e, "락 정보 조회 실패", {"dashboard_id": dashboard_id})
            return None

    def acquire_locks_for_multiple_dashboards(
        self, dashboard_ids: List[int], user_id: str, lock_type: str, timeout_seconds: int = None
    ) -> List[int]:
        """
        여러 대시보드에 대한 락 획득 시도 - 하나라도 실패하면 전체 실패
        
        Args:
            dashboard_ids: 대시보드 ID 목록
            user_id: 사용자 ID
            lock_type: 락 유형
            timeout_seconds: 락 타임아웃(초)
            
        Returns:
            획득 성공한 대시보드 ID 목록 (전체 성공 또는 빈 목록)
        """
        if not dashboard_ids:
            return []
            
        # 모든 대시보드 ID를 문자열로 변환하여 IN 절에 사용
        dashboard_ids_str = ','.join(str(id) for id in dashboard_ids)
        successful_ids = []
        
        try:
            # 1. 먼저 모든 대시보드에 대해 FOR UPDATE로 행 잠금 시도
            try:
                # Row-level lock 획득 시도 (NOWAIT: 다른 세션이 잠금 중이면 즉시 실패)
                stmt = text(f"SELECT dashboard_id FROM dashboard WHERE dashboard_id IN ({dashboard_ids_str}) FOR UPDATE NOWAIT")
                result = self.db.execute(stmt)
                locked_ids = [row[0] for row in result]
                
                # 모든 대시보드가 잠금되었는지 확인
                if len(locked_ids) != len(dashboard_ids):
                    missing_ids = set(dashboard_ids) - set(locked_ids)
                    log_error(None, f"일부 대시보드 잠금 실패: {missing_ids}")
                    raise PessimisticLockException(
                        "일부 대시보드를 잠글 수 없습니다. 다른 사용자가 수정 중입니다."
                    )
                    
            except OperationalError:
                # 다른 트랜잭션이 이미 해당 행들 중 하나를 잠금
                log_error(None, f"다중 대시보드 락 획득 실패: {dashboard_ids}")
                raise PessimisticLockException(
                    "다른 사용자가 이미 이 항목들 중 하나를 수정 중입니다"
                )
            
            # 2. 기존 락 정보 조회 및 검증
            existing_locks = (
                self.db.query(DashboardLock)
                .filter(DashboardLock.dashboard_id.in_(dashboard_ids))
                .all()
            )
            
            # 만료되지 않은 다른 사용자의 락이 있는지 확인
            for lock in existing_locks:
                if not lock.is_expired and lock.locked_by != user_id:
                    raise PessimisticLockException(
                        f"사용자 {lock.locked_by}가 대시보드 {lock.dashboard_id}를 이미 수정 중입니다",
                        locked_by=lock.locked_by
                    )
            
            # 3. 만료된 락 삭제
            for lock in existing_locks:
                if lock.is_expired:
                    self.db.delete(lock)
            
            # 4. 모든 대시보드에 대해 새 락 생성
            timeout = timeout_seconds or self.default_lock_timeout
            current_time = datetime.utcnow()
            expiry_time = current_time + timedelta(seconds=timeout)
            
            for dashboard_id in dashboard_ids:
                # 이미 해당 사용자의 락이 있는지 확인
                existing_lock = next(
                    (lock for lock in existing_locks if lock.dashboard_id == dashboard_id and lock.locked_by == user_id), 
                    None
                )
                
                if existing_lock:
                    # 기존 락 갱신
                    existing_lock.expires_at = expiry_time
                    existing_lock.lock_type = lock_type
                else:
                    # 새 락 추가
                    new_lock = DashboardLock(
                        dashboard_id=dashboard_id,
                        locked_by=user_id,
                        locked_at=current_time,
                        lock_type=lock_type,
                        expires_at=expiry_time,
                        lock_timeout=timeout
                    )
                    self.db.add(new_lock)
                
                successful_ids.append(dashboard_id)
            
            # 변경사항 플러시 (커밋은 호출자 책임)
            self.db.flush()
            log_info(f"다중 락 획득 성공: {len(successful_ids)}개, 사용자 {user_id}")
            
            return successful_ids
            
        except PessimisticLockException:
            # 락 충돌 예외는 그대로 전파
            raise
        except SQLAlchemyError as e:
            # 다른 데이터베이스 오류 처리
            log_error(e, "다중 락 획득 실패", {"ids": dashboard_ids, "user_id": user_id})
            # 트랜잭션 롤백은 호출자 책임
            raise

    def cleanup_expired_locks(self) -> int:
        """
        만료된 락 자동 정리
        
        Returns:
            정리된 락 수
        """
        try:
            count = (
                self.db.query(DashboardLock)
                .filter(DashboardLock.expires_at < datetime.utcnow())
                .delete(synchronize_session=False)
            )
            self.db.commit()
            if count > 0:
                log_info(f"만료된 락 {count}개 정리 완료")
            return count
        except SQLAlchemyError as e:
            self.db.rollback()
            log_error(e, "만료된 락 정리 실패")
            return 0