# server/utils/transaction.py - 개선된 버전

from contextlib import contextmanager
from functools import wraps
from sqlalchemy.orm import Session
from typing import Generator, Callable, TypeVar, Any
from sqlalchemy.exc import SQLAlchemyError
from contextvars import ContextVar

from server.utils.logger import log_info, log_error

T = TypeVar("T")

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
        log_error(e, "트랜잭션 롤백 (SQLAlchemy 오류)")
        db.rollback()
        raise
    except Exception as e:
        log_error(e, "트랜잭션 롤백 (일반 예외)")
        db.rollback()
        raise
    finally:
        # 트랜잭션 컨텍스트 상태 복원
        _transaction_active.reset(token)


def transactional(func: Callable[..., T]) -> Callable[..., T]:
    """트랜잭션 데코레이터 - 단순화된 버전
    
    서비스 계층에서 트랜잭션 범위를 명확하게 관리하기 위한 데코레이터
    """
    @wraps(func)
    def wrapper(*args, **kwargs) -> T:
        # db 세션 찾기 - 첫번째 인자가 서비스인 경우만 처리
        if args and hasattr(args[0], "db"):
            db = args[0].db
        elif "db" in kwargs:
            db = kwargs["db"]
        else:
            raise ValueError("트랜잭션 처리를 위한 DB 세션을 찾을 수 없습니다")

        # 트랜잭션 컨텍스트 사용
        with transaction(db):
            return func(*args, **kwargs)

    return wrapper