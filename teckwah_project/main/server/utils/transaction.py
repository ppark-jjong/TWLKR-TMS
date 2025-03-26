# teckwah_project/main/server/utils/transaction.py
from contextlib import contextmanager
from functools import wraps
from sqlalchemy.orm import Session
from typing import Generator, Callable, TypeVar, Any
from sqlalchemy.exc import SQLAlchemyError

from main.server.utils.logger import log_info, log_error

T = TypeVar("T")


@contextmanager
def transaction(db: Session) -> Generator[Session, None, None]:
    """트랜잭션 컨텍스트 관리자"""
    try:
        log_info("트랜잭션 시작")
        yield db
        db.commit()
        log_info("트랜잭션 커밋 완료")
    except SQLAlchemyError as e:
        log_error(e, "트랜잭션 롤백")
        db.rollback()
        raise
    except Exception as e:
        log_error(e, "트랜잭션 롤백")
        db.rollback()
        raise


def transactional(func: Callable[..., T]) -> Callable[..., T]:
    """트랜잭션 데코레이터"""

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
