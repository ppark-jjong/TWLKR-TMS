# server/utils/transaction.py - 간소화 버전

from contextlib import contextmanager
from functools import wraps
from sqlalchemy.orm import Session
from typing import Generator, Callable, TypeVar, Any, Optional
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime

from server.utils.logger import log_info, log_error
from server.utils.error import LockConflictException

T = TypeVar("T")

@contextmanager
def transaction(db: Session) -> Generator[Session, None, None]:
    """트랜잭션 컨텍스트 관리자 - 단순화된 버전"""
    try:
        log_info("트랜잭션 시작")
        yield db
        db.commit()
        log_info("트랜잭션 커밋 완료")
    except SQLAlchemyError as e:
        log_error(e, "트랜잭션 롤백")
        db.rollback()
        # 락 관련 오류 처리
        if "lock wait timeout" in str(e).lower() or "deadlock" in str(e).lower():
            raise LockConflictException("데이터 접근 충돌이 발생했습니다. 잠시 후 다시 시도해주세요.")
        raise
    except Exception as e:
        log_error(e, "트랜잭션 롤백 (일반 예외)")
        db.rollback()
        raise


def transactional(func: Callable[..., T]) -> Callable[..., T]:
    """트랜잭션 데코레이터 - 함수 전체를 트랜잭션으로 래핑"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        # 첫 번째 인자가 self(인스턴스)인 경우 두 번째 인자가 db, 아니면 첫 번째 인자가 db
        db = args[1] if len(args) > 1 and not isinstance(args[0], Session) else args[0]
        if not isinstance(db, Session):
            db = kwargs.get('db')
            if not db:
                raise ValueError("db 인자를 찾을 수 없습니다")
        
        with transaction(db):
            return func(*args, **kwargs)
    return wrapper


@contextmanager
def with_row_lock(db: Session, model_class: Any, id_value: int, id_field: str = "id", user_id: str = None) -> Generator[Any, None, None]:
    """행 수준 락을 획득하는 컨텍스트 관리자"""
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
            raise ValueError(f"ID {id_value}에 해당하는 {model_class.__name__} 행을 찾을 수 없습니다")

        # 락 정보 업데이트
        if hasattr(row, 'locked_by') and user_id:
            row.locked_by = user_id
        if hasattr(row, 'lock_timestamp'):
            row.lock_timestamp = datetime.now()
            
        yield row
        
    except SQLAlchemyError as e:
        if "could not obtain lock" in str(e).lower() or "lock wait timeout" in str(e).lower():
            # 다른 사용자에 의해 이미 락이 획득된 경우
            raise LockConflictException("다른 사용자가 이미 리소스를 편집 중입니다")
        raise


# handover_repository.py에서 사용 중인 함수들 복원
def update_lock_info(row: Any, user_id: str) -> None:
    """행의 락 정보 업데이트"""
    if hasattr(row, 'locked_by'):
        row.locked_by = user_id
    if hasattr(row, 'lock_timestamp'):
        row.lock_timestamp = datetime.now()


def generic_acquire_lock(db: Session, model_class: Any, id_value: int, user_id: str, id_field: str = "id") -> Optional[Any]:
    """일반적인 락 획득 함수"""
    try:
        with with_row_lock(db, model_class, id_value, id_field, user_id) as row:
            update_lock_info(row, user_id)
            return row
    except Exception as e:
        log_error(e, f"락 획득 실패: {model_class.__name__}(ID: {id_value}), 사용자: {user_id}")
        raise