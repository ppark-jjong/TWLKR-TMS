from datetime import datetime, timedelta
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from ..models.handover_lock_model import HandoverLock

class HandoverLockRepository:
    """
    인수인계 락 데이터 액세스 레이어
    """
    def __init__(self, db: Session):
        self.db = db

    def acquire_lock(self, handover_id: int, user_id: str, timeout: int = 300) -> Optional[HandoverLock]:
        """
        인수인계 레코드에 락 획득 
        """
        # 현재 시간
        now = datetime.now()
        # 만료 시간 계산
        expires_at = now + timedelta(seconds=timeout)
        
        # 기존 락 확인
        existing_lock = self.db.query(HandoverLock).filter(
            HandoverLock.handover_id == handover_id,
            HandoverLock.expires_at > now
        ).first()
        
        # 이미 락이 있으면 None 반환
        if existing_lock:
            return None
        
        # 락 생성
        new_lock = HandoverLock(
            handover_id=handover_id,
            locked_by=user_id,
            locked_at=now,
            expires_at=expires_at,
            lock_timeout=timeout
        )
        
        self.db.add(new_lock)
        self.db.commit()
        self.db.refresh(new_lock)
        
        return new_lock

    def release_lock(self, handover_id: int, user_id: str) -> bool:
        """
        인수인계 레코드의 락 해제
        """
        # 현재 락 찾기
        lock = self.db.query(HandoverLock).filter(
            HandoverLock.handover_id == handover_id
        ).first()
        
        # 락이 없거나 사용자가 다른 경우
        if not lock or (lock.locked_by != user_id):
            return False
        
        # 락 삭제
        self.db.delete(lock)
        self.db.commit()
        
        return True

    def get_lock_info(self, handover_id: int) -> Optional[HandoverLock]:
        """
        인수인계 레코드의 락 정보 조회
        """
        return self.db.query(HandoverLock).filter(
            HandoverLock.handover_id == handover_id
        ).first()

    def is_locked_by_others(self, handover_id: int, user_id: str) -> bool:
        """
        다른 사용자에 의해 락이 걸려있는지 확인
        """
        now = datetime.now()
        lock = self.db.query(HandoverLock).filter(
            HandoverLock.handover_id == handover_id,
            HandoverLock.expires_at > now,
            HandoverLock.locked_by != user_id
        ).first()
        
        return lock is not None

    def cleanup_expired_locks(self) -> int:
        """
        만료된 락 정리
        """
        now = datetime.now()
        result = self.db.query(HandoverLock).filter(
            HandoverLock.expires_at < now
        ).delete(synchronize_session=False)
        
        self.db.commit()
        return result 