# backend/app/utils/transaction.py
from contextlib import contextmanager
from sqlalchemy.orm import Session
from typing import Generator, Callable, TypeVar, Any

from app.utils.logger import log_error

T = TypeVar('T')


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
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        raise e


def transactional(func: Callable[..., T]) -> Callable[..., T]:
    """
    트랜잭션 데코레이터
    
    Example:
        @transactional
        def create_dashboard(self, dashboard_data, db):
            # 트랜잭션 내에서 데이터베이스 작업 수행
            pass
    """
    def wrapper(*args, **kwargs) -> T:
        # db 세션 찾기
        db = None
        
        # self.db 형태로 첫 번째 인자(self)에 db가 있는 경우
        if args and hasattr(args[0], 'db'):
            db = args[0].db
        
        # 명시적 db 인자가 있는 경우
        elif 'db' in kwargs:
            db = kwargs['db']
        
        # db 세션을 찾지 못한 경우
        if db is None:
            raise ValueError("트랜잭션 데코레이터를 사용하려면 db 세션이 필요합니다.")
        
        try:
            result = func(*args, **kwargs)
            db.commit()
            return result
        except Exception as e:
            log_error(e, f"트랜잭션 롤백: {func.__name__}")
            db.rollback()
            raise e
    
    return wrapper