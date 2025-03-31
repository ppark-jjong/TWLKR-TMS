# server/utils/transaction.py - 개선된 버전

from contextlib import contextmanager
from functools import wraps
from sqlalchemy.orm import Session
from typing import Generator, Callable, TypeVar, Any, List, Optional, Union
from sqlalchemy.exc import SQLAlchemyError
from contextvars import ContextVar

from server.utils.logger import log_info, log_error
from server.utils.error import RowLockTimeoutException, DeadlockDetectedException, LockConflictException
from server.config.settings import get_settings

T = TypeVar("T")
settings = get_settings()

# 트랜잭션 컨텍스트 추적용 변수
_transaction_active = ContextVar('transaction_active', default=False)


@contextmanager
def transaction(db: Session) -> Generator[Session, None, None]:
    """트랜잭션 컨텍스트 관리자 - 단순화된 버전
    
    트랜잭션 범위를 최소화하고 명확하게 관리합니다.
    """
    # 이미 트랜잭션이 활성화되어 있는지 확인
    already_active = _transaction_active.get()
    
    if already_active:
        # 중첩된 경우 - 새 트랜잭션 시작하지 않고 DB 세션만 전달
        yield db
        return
        
    # 새 트랜잭션 컨텍스트 시작
    token = _transaction_active.set(True)
    try:
        log_info("트랜잭션 시작")
        yield db
        db.commit()
        log_info("트랜잭션 커밋 완료")
    except SQLAlchemyError as e:
        log_error(f"트랜잭션 롤백 (SQLAlchemy 오류): {str(e)}")
        db.rollback()
        # 락 타임아웃 또는 데드락 감지 시 특별 예외 발생
        if "lock wait timeout" in str(e).lower():
            raise RowLockTimeoutException()
        elif "deadlock" in str(e).lower():
            raise DeadlockDetectedException()
        raise
    except Exception as e:
        log_error(f"트랜잭션 롤백 (일반 예외): {str(e)}")
        db.rollback()
        raise
    finally:
        # 트랜잭션 컨텍스트 상태 복원
        _transaction_active.reset(token)


def transactional(func: Callable[..., T]) -> Callable[..., T]:
    """트랜잭션 데코레이터 - 함수 전체를 트랜잭션으로 래핑"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        # 첫 번째 인자가 self(인스턴스)인 경우 두 번째 인자가 db, 아니면 첫 번째 인자가 db
        db = args[1] if len(args) > 1 and isinstance(args[0], object) and not isinstance(args[0], Session) else args[0]
        if not isinstance(db, Session):
            db = kwargs.get('db')
            if not db:
                raise ValueError("db 인자를 찾을 수 없습니다")
        
        with transaction(db):
            return func(*args, **kwargs)
    return wrapper


def with_row_lock(query, user_id: Optional[str] = None, skip_ui_lock_info: bool = False, nowait: bool = False):
    """
    쿼리에 행 수준 락을 적용하는 헬퍼 함수
    
    Parameters:
    - query: SQLAlchemy 쿼리 객체
    - user_id: 락을 획득한 사용자 ID (UI 표시용)
    - skip_ui_lock_info: UI용 락 정보 업데이트 생략 여부
    - nowait: 즉시 락 획득 실패 시 예외 발생 여부 (True면 대기 없이 즉시 실패)
    
    Returns:
    - 락을 적용한 쿼리
    
    예시:
    with transaction(db):
        record = with_row_lock(db.query(Dashboard).filter(...), user_id="user1").first()
        # 레코드 수정 작업 수행
    """
    try:
        # SELECT FOR UPDATE로 락 획득
        locked_query = query.with_for_update(nowait=nowait)
        return locked_query
    except SQLAlchemyError as e:
        if nowait and "could not obtain lock" in str(e).lower():
            # 락 충돌 정보 수집 시도
            try:
                # 락을 요청한 레코드의 ID 파악 시도
                model = query.column_descriptions[0]['entity'].__table__
                primary_key = model.primary_key.columns.values()[0].name
                
                stmt = str(query.statement.compile())
                import re
                record_id_match = re.search(f"{primary_key} = (\d+)", stmt)
                record_id = int(record_id_match.group(1)) if record_id_match else None
                
                lock_info = None
                if record_id:
                    # 락 충돌 정보 생성
                    lock_info = {
                        "id": record_id,
                        "locked_by": "다른 사용자",  # 실제 락 보유자 정보는 DB에서 조회 필요
                        "locked_at": None
                    }
                
                raise LockConflictException(
                    detail="다른 사용자가 현재 이 데이터를 수정 중입니다",
                    lock_info=lock_info
                )
            except Exception as parse_error:
                # 락 정보 파싱 실패 시 기본 예외 발생
                log_error(f"락 충돌 정보 파싱 실패: {str(parse_error)}")
                raise LockConflictException("락 획득에 실패했습니다")
        # 기타 오류는 원래 예외 전달
        raise


def with_row_lock_timeout(query, user_id: Optional[str] = None, timeout: int = None):
    """
    타임아웃이 적용된 행 락 획득 함수
    
    Parameters:
    - query: SQLAlchemy 쿼리 객체
    - user_id: 락을 획득한 사용자 ID (UI 표시용)
    - timeout: 락 획득 대기 시간 (초, None인 경우 설정값 사용)
    
    Returns:
    - 락을 적용한 쿼리 결과
    """
    timeout = timeout or getattr(settings, "LOCK_WAIT_TIMEOUT", 5)
    
    try:
        # nowait=True로 즉시 락 획득 시도
        return with_row_lock(query, user_id, nowait=True)
    except LockConflictException:
        # 즉시 실패하면 다시 시도하지 않고 충돌 보고
        raise
    except SQLAlchemyError as e:
        # 기타 데이터베이스 오류는 원래 예외 전파
        raise


def update_lock_info(record, user_id: str):
    """
    UI 표시용 락 정보 업데이트
    
    Parameters:
    - record: 업데이트할 모델 인스턴스
    - user_id: 락을 획득한 사용자 ID
    
    이 함수는 실제 락과는 무관하며, 기본적으로 updated_by 필드를 업데이트합니다.
    """
    if hasattr(record, "updated_by"):
        record.updated_by = user_id