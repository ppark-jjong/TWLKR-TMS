# server/utils/transaction.py - 개선된 버전

from contextlib import contextmanager
from functools import wraps
from sqlalchemy.orm import Session
from typing import Generator, Callable, TypeVar, Any, Dict, Optional
from sqlalchemy.exc import SQLAlchemyError
from contextvars import ContextVar
from datetime import datetime

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


@contextmanager
def with_row_lock(db: Session, model_class: Any, id_value: int, id_field: str = "id", user_id: str = None) -> Generator[Any, None, None]:
    """행 수준 락을 획득하는 컨텍스트 관리자
    
    특정 행에 대해 배타적 락을 획득합니다.
    """
    log_info(f"행 락 획득 시도: {model_class.__name__}(ID: {id_value}), 사용자: {user_id}")
    
    try:
        # 락 획득 시도
        filter_kwargs = {id_field: id_value}
        row = (
            db.query(model_class)
            .filter_by(**filter_kwargs)
            .with_for_update(nowait=True)
            .first()
        )
        
        if not row:
            log_error(f"락 획득 실패: 행을 찾을 수 없음 {model_class.__name__}(ID: {id_value})")
            raise ValueError(f"ID {id_value}에 해당하는 {model_class.__name__} 행을 찾을 수 없습니다")
            
        # 락 정보 업데이트
        if hasattr(row, 'locked_by') and user_id:
            row.locked_by = user_id
        if hasattr(row, 'lock_timestamp'):
            row.lock_timestamp = datetime.now()
            
        yield row
        
    except SQLAlchemyError as e:
        log_error(f"락 획득 중 SQL 오류: {model_class.__name__}(ID: {id_value}), 오류: {str(e)}")
        if "could not obtain lock" in str(e).lower() or "lock wait timeout" in str(e).lower():
            # 다른 사용자에 의해 이미 락이 획득된 경우
            raise LockConflictException(f"다른 사용자가 이미 리소스를 편집 중입니다: {str(e)}")
        raise


def update_lock_info(row: Any, user_id: str) -> None:
    """행의 락 정보 업데이트
    
    락 획득 후 락 소유자 정보를 업데이트합니다.
    """
    if hasattr(row, 'locked_by'):
        row.locked_by = user_id
    if hasattr(row, 'lock_timestamp'):
        row.lock_timestamp = datetime.now()


def generic_acquire_lock(db: Session, model_class: Any, id_value: int, user_id: str, id_field: str = "id") -> Optional[Any]:
    """일반적인 락 획득 함수
    
    행 수준 락을 획득하고 락 정보를 업데이트합니다.
    """
    try:
        with with_row_lock(db, model_class, id_value, id_field, user_id) as row:
            update_lock_info(row, user_id)
            return row
    except Exception as e:
        log_error(f"락 획득 실패: {model_class.__name__}(ID: {id_value}), 사용자: {user_id}, 오류: {str(e)}")
        raise