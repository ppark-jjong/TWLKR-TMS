from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
from itertools import groupby
from sqlalchemy.orm import Session

from ..repositories.handover_repository import HandoverRepository
from ..repositories.handover_lock_repository import HandoverLockRepository
from ..models.handover_model import HandoverRecord
from ..models.handover_lock_model import HandoverLock
from ..schemas.handover_schema import HandoverCreate, HandoverUpdate, HandoverResponse, HandoverListResponse, HandoverLockResponse


class HandoverService:
    """
    인수인계 서비스 레이어
    """
    def __init__(self, db: Session):
        self.repository = HandoverRepository(db)
        self.lock_repository = HandoverLockRepository(db)

    def create_handover(self, data: HandoverCreate, current_user: str) -> HandoverResponse:
        """
        인수인계 레코드 생성
        """
        handover = self.repository.create_handover(
            title=data.title,
            content=data.content,
            created_by=current_user
        )
        return self._to_response(handover, current_user)

    def get_handover(self, handover_id: int, current_user: str) -> Optional[HandoverResponse]:
        """
        단일 인수인계 조회
        """
        handover = self.repository.get_handover_by_id(handover_id)
        if handover:
            return self._to_response(handover, current_user)
        return None

    def get_handovers_by_date_range(self, 
                                   start_date: datetime, 
                                   end_date: datetime, 
                                   current_user: str) -> List[HandoverListResponse]:
        """
        날짜 범위로 인수인계 목록 조회 및 날짜별로 그룹화
        """
        handovers = self.repository.get_handovers_by_date_range(start_date, end_date)
        
        # 날짜별로 그룹화
        grouped_handovers = []
        
        # 날짜 추출 함수 (effective_date 사용)
        def get_record_date(record):
            return record.effective_date.strftime("%Y-%m-%d")
        
        # 날짜별로 정렬 후 그룹화
        sorted_handovers = sorted(handovers, key=get_record_date, reverse=True)
        
        for date, records in groupby(sorted_handovers, key=get_record_date):
            grouped_handovers.append(
                HandoverListResponse(
                    date=date,
                    records=[self._to_response(record, current_user) for record in records]
                )
            )
        
        return grouped_handovers

    def acquire_lock(self, 
                    handover_id: int, 
                    current_user: str, 
                    timeout: int = 300) -> Optional[HandoverLockResponse]:
        """
        인수인계 레코드 락 획득
        """
        # 레코드가 존재하는지 확인
        handover = self.repository.get_handover_by_id(handover_id)
        if not handover:
            return None
        
        # 락 획득 시도
        lock = self.lock_repository.acquire_lock(handover_id, current_user, timeout)
        if not lock:
            return None
        
        return HandoverLockResponse(
            handover_id=lock.handover_id,
            locked_by=lock.locked_by,
            locked_at=lock.locked_at,
            expires_at=lock.expires_at
        )

    def release_lock(self, handover_id: int, current_user: str) -> bool:
        """
        인수인계 레코드 락 해제
        """
        return self.lock_repository.release_lock(handover_id, current_user)

    def get_lock_info(self, handover_id: int) -> Optional[HandoverLockResponse]:
        """
        인수인계 레코드 락 정보 조회
        """
        lock = self.lock_repository.get_lock_info(handover_id)
        if not lock:
            return None
        
        return HandoverLockResponse(
            handover_id=lock.handover_id,
            locked_by=lock.locked_by,
            locked_at=lock.locked_at,
            expires_at=lock.expires_at
        )

    def is_locked_by_others(self, handover_id: int, current_user: str) -> bool:
        """
        다른 사용자에 의해 락이 걸려있는지 확인
        """
        return self.lock_repository.is_locked_by_others(handover_id, current_user)

    def update_handover_with_permission(self, 
                                       handover_id: int, 
                                       data: HandoverUpdate, 
                                       current_user: str,
                                       is_admin: bool = False) -> Dict[str, Any]:
        """
        인수인계 레코드 수정 (권한 확인 포함)
        """
        # 기본 응답 구조
        result = {
            "handover": None,
            "error_code": None,
            "message": None
        }
        
        # 레코드 조회
        handover = self.repository.get_handover_by_id(handover_id)
        
        # 존재하지 않는 레코드
        if not handover:
            result["error_code"] = "NOT_FOUND"
            result["message"] = "인수인계 항목을 찾을 수 없습니다."
            return result
        
        # 권한 확인 (작성자 또는 관리자만 수정 가능)
        if handover.created_by != current_user and not is_admin:
            result["error_code"] = "FORBIDDEN"
            result["message"] = "수정 권한이 없습니다. (본인 또는 관리자만 가능)"
            result["handover"] = self._to_response(handover, current_user)
            return result
        
        # 수정 데이터 준비
        update_data = data.model_dump(exclude_unset=True)
        
        # 업데이트 수행
        updated_handover = self.repository.update_handover(handover_id, update_data)
        result["handover"] = self._to_response(updated_handover, current_user)
        
        return result

    def delete_handover_with_permission(self, 
                                       handover_id: int, 
                                       current_user: str, 
                                       is_admin: bool = False) -> Dict[str, Any]:
        """
        인수인계 레코드 삭제 (권한 확인 포함)
        """
        # 기본 응답 구조
        result = {
            "error_code": None,
            "message": None
        }
        
        # 레코드 조회
        handover = self.repository.get_handover_by_id(handover_id)
        
        # 존재하지 않는 레코드
        if not handover:
            result["error_code"] = "NOT_FOUND"
            result["message"] = "인수인계 항목을 찾을 수 없습니다."
            return result
        
        # 권한 확인 (작성자 또는 관리자만 삭제 가능)
        if handover.created_by != current_user and not is_admin:
            result["error_code"] = "FORBIDDEN"
            result["message"] = "삭제 권한이 없습니다. (본인 또는 관리자만 가능)"
            return result
        
        # 삭제 수행
        delete_result = self.repository.delete_handover(handover_id)
        if not delete_result:
            result["error_code"] = "DELETE_FAILED"
            result["message"] = "삭제에 실패했습니다."
            return result
        
        return result

    def _to_response(self, handover: HandoverRecord, current_user: str) -> HandoverResponse:
        """
        모델을 응답 스키마로 변환
        """
        # 락 정보 조회
        lock = self.lock_repository.get_lock_info(handover.handover_id)
        
        return HandoverResponse(
            handover_id=handover.handover_id,
            title=handover.title,
            content=handover.content,
            created_at=handover.created_at,
            updated_at=handover.updated_at,
            effective_date=handover.effective_date,
            created_by=handover.created_by,
            is_own=handover.created_by == current_user,
            is_locked=lock is not None,
            locked_by=lock.locked_by if lock else None
        ) 