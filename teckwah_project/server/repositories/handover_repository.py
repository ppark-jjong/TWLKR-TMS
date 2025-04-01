from sqlalchemy import func, and_, or_, desc
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Optional

from ..models.handover_model import HandoverRecord
from ..utils.transaction import with_row_lock, update_lock_info, generic_acquire_lock
from ..utils.error import LockConflictException, NotFoundException


class HandoverRepository:
    """
    인수인계 데이터 액세스 레이어
    """
    def __init__(self, db: Session):
        self.db = db

    def create_handover(self, title: str, content: str, created_by: str, is_notice: bool = False, notice_until: Optional[datetime] = None) -> HandoverRecord:
        """
        새 인수인계 레코드 생성
        """
        new_handover = HandoverRecord(
            title=title,
            content=content,
            created_by=created_by,
            is_notice=is_notice,
            notice_until=notice_until
        )
        self.db.add(new_handover)
        self.db.flush()
        return new_handover

    def get_handover_by_id(self, handover_id: int) -> Optional[HandoverRecord]:
        """
        ID로 단일 인수인계 조회
        """
        return self.db.query(HandoverRecord).filter(
            HandoverRecord.handover_id == handover_id
        ).first()
        
    def get_handover_with_lock(self, handover_id: int, user_id: str) -> Optional[HandoverRecord]:
        """
        ID로 단일 인수인계 조회 (행 수준 락 획득)
        """
        try:
            # 공통 락 획득 함수 사용
            return generic_acquire_lock(
                self.db,
                HandoverRecord,
                handover_id,
                user_id,
                field_name='handover_id'
            )
        except Exception as e:
            # 오류 발생 시 LockConflictException으로 변환하여 상위에 전달
            raise LockConflictException(f"행 락 획득 실패: {str(e)}")

    def get_handovers_by_date_range(self, 
                                   start_date: datetime, 
                                   end_date: datetime) -> List[HandoverRecord]:
        """
        날짜 범위로 인수인계 목록 조회
        수정일 또는 생성일 기준으로 내림차순 정렬
        """
        # 종료 날짜에 하루를 더해 해당 날짜의 끝까지 포함
        end_date_inclusive = end_date + timedelta(days=1)
        
        return self.db.query(HandoverRecord).filter(
            or_(
                and_(
                    HandoverRecord.updated_at.is_not(None),
                    HandoverRecord.updated_at >= start_date,
                    HandoverRecord.updated_at < end_date_inclusive
                ),
                and_(
                    HandoverRecord.updated_at.is_(None),
                    HandoverRecord.created_at >= start_date,
                    HandoverRecord.created_at < end_date_inclusive
                )
            )
        ).order_by(
            desc(func.coalesce(HandoverRecord.updated_at, HandoverRecord.created_at))
        ).all()

    def update_handover(self, handover_id: int, data: Dict) -> Optional[HandoverRecord]:
        """
        인수인계 레코드 업데이트 (락 없이)
        """
        handover = self.get_handover_by_id(handover_id)
        if handover:
            for key, value in data.items():
                if hasattr(handover, key):
                    setattr(handover, key, value)
            self.db.flush()
            return handover
        return None

    def update_handover_with_lock(self, handover_id: int, data: Dict, user_id: str) -> Optional[HandoverRecord]:
        """
        인수인계 레코드 업데이트 (행 수준 락 사용)
        """
        handover = self.get_handover_with_lock(handover_id, user_id)
        if handover:
            for key, value in data.items():
                if hasattr(handover, key):
                    setattr(handover, key, value)
            
            # 버전 증가 (낙관적 락 지원)
            if hasattr(handover, "version"):
                handover.version += 1
                
            self.db.flush()
            return handover
        return None

    def delete_handover(self, handover_id: int) -> bool:
        """
        인수인계 레코드 삭제 (락 없이)
        """
        handover = self.get_handover_by_id(handover_id)
        if handover:
            self.db.delete(handover)
            self.db.flush()
            return True
        return False
        
    def delete_handover_with_lock(self, handover_id: int, user_id: str) -> bool:
        """
        인수인계 레코드 삭제 (행 수준 락 사용)
        """
        handover = self.get_handover_with_lock(handover_id, user_id)
        if handover:
            self.db.delete(handover)
            self.db.flush()
            return True
        return False 