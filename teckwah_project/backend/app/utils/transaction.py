# backend/app/utils/transaction.py
from contextlib import contextmanager
from functools import wraps
from sqlalchemy.orm import Session
from typing import Generator, Callable, TypeVar, Any

from app.utils.logger import log_info, log_error

T = TypeVar("T")


@contextmanager
def transaction(db: Session) -> Generator[Session, None, None]:
    """
    트랜잭션 컨텍스트 관리자

    Example:
        with transaction(db) as session:
            # 트랜잭션 내에서 데이터베이스 작업 수행
            session.add(entity)
    """
    try:
        log_info("트랜잭션 시작")
        yield db
        db.commit()
        log_info("트랜잭션 커밋 완료")
    except Exception as e:
        log_error(e, "트랜잭션 롤백")
        db.rollback()
        raise


def transactional(func: Callable[..., T]) -> Callable[..., T]:
    """
    트랜잭션 데코레이터 - 함수 실행을 트랜잭션으로 감싸줌

    Example:
        @transactional
        def create_dashboard(self, dashboard_data, db):
            # 트랜잭션 내에서 데이터베이스 작업 수행
            pass
    """

    @wraps(func)
    def wrapper(*args, **kwargs) -> T:
        # db 세션 찾기
        db = None

        # self.db 형태로 첫 번째 인자(self)에 db가 있는 경우
        if args and hasattr(args[0], "db"):
            db = args[0].db
        # 레포지토리 형태로 첫 번째 인자(self)의 repository.db에 있는 경우
        elif (
            args
            and hasattr(args[0], "repository")
            and hasattr(args[0].repository, "db")
        ):
            db = args[0].repository.db
        # 명시적 db 인자가 있는 경우
        elif "db" in kwargs:
            db = kwargs["db"]

        # db 세션을 찾지 못한 경우
        if db is None:
            raise ValueError(
                "트랜잭션 데코레이터를 사용하려면 db 세션이 필요합니다. "
                "클래스 메서드라면 self.db 또는 self.repository.db가 있어야 하고, "
                "그렇지 않으면 db 인자를 명시적으로 전달해야 합니다."
            )

        # 트랜잭션 컨텍스트 관리자 사용
        with transaction(db):
            return func(*args, **kwargs)

    return wrapper


def transactional_with_retries(max_retries: int = 3, retry_on_exceptions: tuple = None):
    """
    재시도 기능이 추가된 트랜잭션 데코레이터

    Args:
        max_retries: 최대 재시도 횟수
        retry_on_exceptions: 재시도할 예외 유형 (None이면 모든 예외)

    Example:
        @transactional_with_retries(max_retries=3)
        def update_data(self, data):
            # 경쟁 상태가 있을 수 있는 작업
    """
    retry_exceptions = retry_on_exceptions or Exception

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            # db 세션 찾기 (위와 동일)
            db = None
            if args and hasattr(args[0], "db"):
                db = args[0].db
            elif (
                args
                and hasattr(args[0], "repository")
                and hasattr(args[0].repository, "db")
            ):
                db = args[0].repository.db
            elif "db" in kwargs:
                db = kwargs["db"]

            if db is None:
                raise ValueError(
                    "트랜잭션 데코레이터를 사용하려면 db 세션이 필요합니다."
                )

            last_exception = None
            for attempt in range(max_retries):
                try:
                    with transaction(db):
                        return func(*args, **kwargs)
                except retry_exceptions as e:
                    last_exception = e
                    log_error(
                        e,
                        f"트랜잭션 시도 {attempt + 1}/{max_retries} 실패, 재시도 중...",
                    )
                    continue
                except Exception as e:
                    # 재시도 대상이 아닌 예외는 바로 전파
                    log_error(e, "트랜잭션 실패 (재시도 없음)")
                    raise

            # 모든 재시도가 실패한 경우
            log_error(last_exception, f"트랜잭션 {max_retries}회 시도 모두 실패")
            raise last_exception

        return wrapper

    return decorator
