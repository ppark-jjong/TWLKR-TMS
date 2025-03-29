# teckwah_project/server/utils/transaction.py
from contextlib import contextmanager
from functools import wraps
from sqlalchemy.orm import Session
from typing import Generator, Callable, TypeVar, Any
from sqlalchemy.exc import SQLAlchemyError

from server.utils.logger import log_info, log_error
from server.utils.datetime import get_kst_now

T = TypeVar("T")


@contextmanager
def transaction(db: Session) -> Generator[Session, None, None]:
    """트랜잭션 컨텍스트 관리자 - KST 시간 기준 로깅"""
    try:
        now = get_kst_now()
        log_info(f"트랜잭션 시작: {now.isoformat()}")
        yield db
        db.commit()
        log_info(f"트랜잭션 커밋 완료: {get_kst_now().isoformat()}")
    except SQLAlchemyError as e:
        log_error(e, "트랜잭션 롤백 (SQLAlchemy 오류)")
        db.rollback()
        raise
    except Exception as e:
        log_error(e, "트랜잭션 롤백 (일반 예외)")
        db.rollback()
        raise


def transactional(func: Callable[..., T]) -> Callable[..., T]:
    """트랜잭션 데코레이터 - 서비스 메서드에 일관된 트랜잭션 관리 적용"""

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
