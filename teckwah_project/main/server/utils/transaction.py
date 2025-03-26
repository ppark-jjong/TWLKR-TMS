# teckwah_project/main/server/utils/transaction.py
from contextlib import contextmanager
from functools import wraps
from sqlalchemy.orm import Session
from typing import Generator, Callable, TypeVar, Any, Optional
from sqlalchemy.exc import SQLAlchemyError

from app.utils.logger import log_info, log_error

T = TypeVar("T")


@contextmanager
def transaction(db: Session) -> Generator[Session, None, None]:
    """
    트랜잭션 컨텍스트 관리자 - 예외 세분화 추가

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
    except SQLAlchemyError as e:
        log_error(e, "데이터베이스 오류로 인한 트랜잭션 롤백")
        db.rollback()
        raise
    except Exception as e:
        log_error(e, "일반 오류로 인한 트랜잭션 롤백")
        db.rollback()
        raise


def transactional(func: Callable[..., T]) -> Callable[..., T]:
    """
    트랜잭션 데코레이터 - DB 세션 탐색 로직 개선

    Example:
        @transactional
        def update_data(self, data):
            # 트랜잭션으로 보호되는 메소드
    """
    @wraps(func)
    def wrapper(*args, **kwargs) -> T:
        # db 세션 찾기 (단순화된 로직)
        db = None
        
        # self.db 형태로 첫 번째 인자에 있는 경우
        if args and hasattr(args[0], "db"):
            db = args[0].db
        # self.repository.db 형태로 첫 번째 인자의 repository에 있는 경우
        elif args and hasattr(args[0], "repository") and hasattr(args[0].repository, "db"):
            db = args[0].repository.db
        # 명시적 db 인자
        elif "db" in kwargs:
            db = kwargs["db"]
            
        if db is None:
            raise ValueError("트랜잭션 처리를 위한 DB 세션을 찾을 수 없습니다")

        # 트랜잭션 컨텍스트 사용
        try:
            log_info(f"트랜잭션 시작: {func.__name__}")
            with transaction(db):
                return func(*args, **kwargs)
        except Exception as e:
            log_error(e, f"트랜잭션 실패: {func.__name__}")
            raise

    return wrapper


def transactional_with_retries(max_retries: int = 3, 
                              retry_on_exceptions: Optional[tuple] = None):
    """
    재시도 기능이 추가된 트랜잭션 데코레이터

    Args:
        max_retries: 최대 재시도 횟수
        retry_on_exceptions: 재시도할 예외 유형 (None이면 SQLAlchemyError만)

    Example:
        @transactional_with_retries(max_retries=3)
        def update_data(self, data):
            # 경쟁 상태가 있을 수 있는 작업
    """
    retry_exceptions = retry_on_exceptions or (SQLAlchemyError,)

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            # db 세션 찾기 (단순화된 로직)
            db = None
            
            # self.db 형태로 첫 번째 인자에 있는 경우
            if args and hasattr(args[0], "db"):
                db = args[0].db
            # self.repository.db 형태로 첫 번째 인자의 repository에 있는 경우
            elif args and hasattr(args[0], "repository") and hasattr(args[0].repository, "db"):
                db = args[0].repository.db
            # 명시적 db 인자
            elif "db" in kwargs:
                db = kwargs["db"]
                
            if db is None:
                raise ValueError("트랜잭션 처리를 위한 DB 세션을 찾을 수 없습니다")

            last_exception = None
            for attempt in range(max_retries):
                try:
                    log_info(f"트랜잭션 시도 {attempt + 1}/{max_retries}: {func.__name__}")
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
                    log_error(e, f"트랜잭션 실패 (재시도 없음): {func.__name__}")
                    raise

            # 모든 재시도가 실패한 경우
            log_error(last_exception, f"트랜잭션 {max_retries}회 시도 모두 실패: {func.__name__}")
            raise last_exception

        return wrapper

    return decorator