"""
락 관리 유틸리티 모듈
데이터베이스 행 단위 락과 UI용 락 관리 기능을 제공합니다.
"""

from typing import Any, Dict, List, Optional, Type, Union
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, SQLAlchemyError
import re

from server.utils.error import LockConflictException, NotFoundException
from server.utils.datetime import get_kst_now
from server.utils.logger import log_info, log_error
from server.utils.constants import MESSAGES
from server.config.settings import get_settings

settings = get_settings()


def with_row_lock(query, nowait: bool = False):
    """
    쿼리에 행 수준 락을 적용하는 헬퍼 함수
    
    Args:
        query: SQLAlchemy 쿼리 객체
        nowait: 즉시 락 획득 실패 시 예외 발생 여부 (True면 대기 없이 즉시 실패)
    
    Returns:
        락을 적용한 쿼리
        
    Raises:
        LockConflictException: nowait=True이고 락 획득에 실패한 경우
    """
    try:
        # SELECT FOR UPDATE로 락 획득
        locked_query = query.with_for_update(nowait=nowait)
        return locked_query
    except SQLAlchemyError as e:
        if nowait and "could not obtain lock" in str(e).lower():
            # 락 충돌 정보 수집 시도
            try:
                # 락을 요청한 레코드의 ID 파악 시도
                model = query.column_descriptions[0]['entity'].__table__
                primary_key = model.primary_key.columns.values()[0].name
                
                stmt = str(query.statement.compile())
                record_id_match = re.search(f"{primary_key} = (\d+)", stmt)
                record_id = int(record_id_match.group(1)) if record_id_match else None
                
                lock_info = None
                if record_id:
                    # 락 충돌 정보 생성
                    lock_info = {
                        "id": record_id,
                        "locked_by": "다른 사용자",  # 실제 락 보유자 정보는 DB에서 조회 필요
                        "locked_at": None
                    }
                
                raise LockConflictException(
                    detail="다른 사용자가 현재 이 데이터를 수정 중입니다",
                    lock_info=lock_info
                )
            except Exception as parse_error:
                # 락 정보 파싱 실패 시 기본 예외 발생
                log_error(f"락 충돌 정보 파싱 실패: {str(parse_error)}")
                raise LockConflictException("락 획득에 실패했습니다")
        # 기타 오류는 원래 예외 전달
        raise


def update_lock_info(record, user_id: str):
    """
    UI 표시용 락 정보 업데이트
    
    Args:
        record: 업데이트할 모델 인스턴스
        user_id: 락을 획득한 사용자 ID
    """
    if hasattr(record, "updated_by"):
        record.updated_by = user_id


class LockManager:
    """데이터베이스 행 수준 락을 관리하는 공통 유틸리티"""

    def __init__(self, db: Session):
        self.db = db

    def acquire_lock(
        self, 
        model_class: Any, 
        resource_id: int, 
        user_id: str, 
        action_type: str = "EDIT",
        timeout: int = 300
    ) -> Dict[str, Any]:
        """
        지정된 리소스에 대한 락 획득 시도
        
        Args:
            model_class: 대상 모델 클래스
            resource_id: 리소스 ID
            user_id: 현재 사용자 ID
            action_type: 락 유형 (EDIT, STATUS, ASSIGN 등)
            timeout: 락 타임아웃 (초)
            
        Returns:
            락 정보 딕셔너리
            
        Raises:
            LockConflictException: 락 충돌 발생 시
            NotFoundException: 리소스를 찾을 수 없을 때
        """
        try:
            # ID 필드명 결정 (id 또는 {model_name}_id)
            model_name = model_class.__name__.lower()
            id_field = f"{model_name}_id" if hasattr(model_class, f"{model_name}_id") else "id"
            id_attr = getattr(model_class, id_field)
            
            # 락 획득을 위한 쿼리 실행
            resource = with_row_lock(
                self.db.query(model_class).filter(id_attr == resource_id), 
                nowait=True
            ).first()
            
            if not resource:
                log_error(f"리소스를 찾을 수 없음: {model_class.__name__}(ID: {resource_id})")
                raise NotFoundException(f"ID가 {resource_id}인 {model_class.__name__}을(를) 찾을 수 없습니다")
            
            # UI 표시용 락 정보 업데이트
            update_lock_info(resource, user_id)
            
            # 락 정보 생성
            lock_info = {
                "resource_id": resource_id,
                "resource_type": model_class.__name__,
                "locked_by": user_id,
                "action_type": action_type,
                "locked_at": get_kst_now(),
                "expires_at": get_kst_now() + timedelta(seconds=timeout)
            }
            
            log_info(f"락 획득 성공: {model_class.__name__}(ID: {resource_id}) - 사용자: {user_id}")
            return {
                "success": True,
                "message": MESSAGES["LOCK"]["ACQUIRE_SUCCESS"],
                "data": lock_info
            }
            
        except OperationalError as e:
            error_msg = str(e).lower()
            
            # 락 충돌 감지
            if "could not obtain lock" in error_msg or "deadlock detected" in error_msg or "lock wait timeout" in error_msg:
                log_error(f"락 충돌 발생: {model_class.__name__}(ID: {resource_id}) - 사용자: {user_id}")
                
                raise LockConflictException(
                    detail=MESSAGES["LOCK"]["CONFLICT"].format(user="다른 사용자"),
                    error_code="LOCK_CONFLICT"
                )
            
            # 기타 오류
            log_error(f"락 획득 중 오류 발생: {str(e)}")
            raise
        
    def acquire_multiple_locks(
        self, 
        model_class: Any, 
        resource_ids: List[int], 
        user_id: str,
        action_type: str = "EDIT"
    ) -> Dict[str, Any]:
        """여러 리소스에 대한 락 획득 시도"""
        lock_results = {
            "success": True,
            "message": MESSAGES["LOCK"]["ACQUIRE_SUCCESS"],
            "locks": [],
            "failed_ids": []
        }
        
        acquired_locks = []
        
        try:
            # 모든 ID에 대해 락 획득 시도
            for resource_id in resource_ids:
                try:
                    lock_info = self.acquire_lock(model_class, resource_id, user_id, action_type)
                    if lock_info and lock_info.get("success", False):
                        acquired_locks.append(lock_info.get("data", {}))
                    else:
                        lock_results["failed_ids"].append(resource_id)
                        lock_results["success"] = False
                except LockConflictException:
                    lock_results["failed_ids"].append(resource_id)
                    lock_results["success"] = False
                except NotFoundException:
                    lock_results["failed_ids"].append(resource_id)
                    lock_results["success"] = False
            
            # 실패한 ID가 있는 경우
            if lock_results["failed_ids"]:
                lock_results["message"] = f"{len(lock_results['failed_ids'])}개 항목의 락 획득에 실패했습니다"
                
                # 이미 획득한 락은 모두 해제
                self.release_multiple_locks(model_class, resource_ids, user_id)
                return lock_results
            
            # 모든 락 획득 성공
            lock_results["locks"] = acquired_locks
            return lock_results
            
        except Exception as e:
            # 오류 발생 시 이미 획득한 락은 모두 해제
            if acquired_locks:
                self.release_multiple_locks(model_class, [lock["resource_id"] for lock in acquired_locks], user_id)
            
            log_error(f"다중 락 획득 중 오류 발생: {str(e)}")
            lock_results["success"] = False
            lock_results["message"] = f"락 획득 중 오류가 발생했습니다: {str(e)}"
            return lock_results
        
    def release_lock(self, model_class: Any, resource_id: int, user_id: str) -> Dict[str, Any]:
        """
        락 해제 (트랜잭션 종료 시 자동으로 해제되지만, 명시적 해제 가능)
        """
        # 행 단위 락은 트랜잭션 종료 시 자동 해제되므로 로깅만 수행
        log_info(f"락 해제: {model_class.__name__}(ID: {resource_id}) - 사용자: {user_id}")
        
        return {
            "success": True,
            "message": MESSAGES["LOCK"]["RELEASE_SUCCESS"]
        }
    
    def release_multiple_locks(self, model_class: Any, resource_ids: List[int], user_id: str) -> Dict[str, Any]:
        """여러 락 해제 (커밋 또는 롤백 시 자동 해제)"""
        for resource_id in resource_ids:
            self.release_lock(model_class, resource_id, user_id)
        
        return {
            "success": True,
            "message": f"{len(resource_ids)}개 항목의 락이 해제되었습니다"
        }
    
    def get_lock_info(self, model_class: Any, resource_id: int) -> Optional[Dict[str, Any]]:
        """
        현재 락 정보 조회 (행 단위 락은 실제 정보를 조회할 수 없어 UI용 가상 정보만 반환)
        """
        # 행 단위 락은 실제로 현재 상태를 조회할 수 없으므로 None 반환
        return None 