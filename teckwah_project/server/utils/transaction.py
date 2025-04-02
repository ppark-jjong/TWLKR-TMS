# server/utils/transaction.py - 개선된 버전

from contextlib import contextmanager
from functools import wraps
from sqlalchemy.orm import Session
from typing import Generator, Callable, TypeVar, Any
from sqlalchemy.exc import SQLAlchemyError
from contextvars import ContextVar

from server.utils.logger import log_info, log_error
from server.utils.error import RowLockTimeoutException, DeadlockDetectedException
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