from typing import Any, Dict, List, Optional, Type, TypeVar, Generic, Union
from sqlalchemy.orm import Session
from sqlalchemy import select, update, delete, and_, or_
from datetime import datetime

from server.utils.logger import log_info, log_error

T = TypeVar('T')

class BaseRepository(Generic[T]):
    """모든 리포지토리의 기본 클래스"""
    
    def __init__(self, db: Session, model_class: Type[T]):
        self.db = db
        self.model_class = model_class
        
        # ID 필드 이름 결정 - 기본은 'id', 없으면 '{model_name}_id' 시도
        model_name = model_class.__name__.lower()
        self.id_field_name = "id"
        if hasattr(model_class, f"{model_name}_id"):
            self.id_field_name = f"{model_name}_id"
    
    def get_by_id(self, id: int) -> Optional[T]:
        """ID로 단일 레코드 조회"""
        return self.db.query(self.model_class).filter_by(**{self.id_field_name: id}).first()
    
    def get_by_id_with_lock(self, id: int, user_id: str) -> Optional[T]:
        """락을 획득하며 ID로 단일 레코드 조회"""
        try:
            filter_kwargs = {self.id_field_name: id}
            return (
                self.db.query(self.model_class)
                .filter_by(**filter_kwargs)
                .with_for_update(nowait=True)
                .first()
            )
        except Exception as e:
            log_error(f"행 단위 락 획득 실패: {self.model_class.__name__}(ID: {id}), 사용자: {user_id}, 오류: {str(e)}")
            raise
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """페이지네이션된 전체 레코드 조회"""
        return self.db.query(self.model_class).offset(skip).limit(limit).all()
    
    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """레코드 수 조회 (필터 가능)"""
        query = self.db.query(self.model_class)
        if filters:
            query = self._apply_filters(query, filters)
        return query.count()
    
    def create(self, **kwargs) -> T:
        """새 레코드 생성"""
        db_item = self.model_class(**kwargs)
        self.db.add(db_item)
        self.db.flush()
        return db_item
    
    def update(self, id: int, **kwargs) -> Optional[T]:
        """레코드 업데이트"""
        db_item = self.get_by_id(id)
        if not db_item:
            return None
            
        for key, value in kwargs.items():
            if hasattr(db_item, key):
                setattr(db_item, key, value)
                
        self.db.flush()
        return db_item
    
    def update_with_lock(self, id: int, user_id: str, **kwargs) -> Optional[T]:
        """락을 획득하며 레코드 업데이트"""
        db_item = self.get_by_id_with_lock(id, user_id)
        if not db_item:
            return None
            
        for key, value in kwargs.items():
            if hasattr(db_item, key):
                setattr(db_item, key, value)
                
        self.db.flush()
        return db_item
    
    def delete(self, id: int) -> bool:
        """레코드 삭제"""
        db_item = self.get_by_id(id)
        if not db_item:
            return False
            
        self.db.delete(db_item)
        self.db.flush()
        return True
    
    def delete_with_lock(self, id: int, user_id: str) -> bool:
        """락을 획득하며 레코드 삭제"""
        db_item = self.get_by_id_with_lock(id, user_id)
        if not db_item:
            return False
            
        self.db.delete(db_item)
        self.db.flush()
        return True
    
    def delete_many(self, ids: List[int]) -> int:
        """여러 레코드 삭제"""
        result = self.db.query(self.model_class).filter(
            getattr(self.model_class, self.id_field_name).in_(ids)
        ).delete(synchronize_session=False)
        self.db.flush()
        return result
    
    def delete_many_with_lock(self, ids: List[int], user_id: str) -> Dict[str, Any]:
        """락을 획득하며 여러 레코드 삭제"""
        success_ids = []
        failed_ids = []
        
        for id in ids:
            try:
                if self.delete_with_lock(id, user_id):
                    success_ids.append(id)
                else:
                    failed_ids.append(id)
            except Exception as e:
                log_error(f"락 획득 삭제 실패: {self.model_class.__name__}(ID: {id}), 사용자: {user_id}, 오류: {str(e)}")
                failed_ids.append(id)
        
        return {
            "success_count": len(success_ids),
            "failed_count": len(failed_ids),
            "success_ids": success_ids,
            "failed_ids": failed_ids
        }
    
    def find_by_attributes(self, attributes: Dict[str, Any], limit: int = 100) -> List[T]:
        """속성으로 레코드 검색"""
        query = self.db.query(self.model_class)
        for attr, value in attributes.items():
            if hasattr(self.model_class, attr):
                query = query.filter(getattr(self.model_class, attr) == value)
        return query.limit(limit).all()
    
    def _apply_filters(self, query, filters: Dict[str, Any]):
        """쿼리에 필터 적용"""
        for attr, value in filters.items():
            if value is not None and hasattr(self.model_class, attr):
                query = query.filter(getattr(self.model_class, attr) == value)
        return query 