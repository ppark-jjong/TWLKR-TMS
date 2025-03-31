from sqlalchemy import func, and_, or_, desc
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Optional

from ..models.handover_model import HandoverRecord


class HandoverRepository:
    """
    인수인계 데이터 액세스 레이어
    """
    def __init__(self, db: Session):
        self.db = db

    def create_handover(self, title: str, content: str, created_by: str) -> HandoverRecord:
        """
        새 인수인계 레코드 생성
        """
        new_handover = HandoverRecord(
            title=title,
            content=content,
            created_by=created_by
        )
        self.db.add(new_handover)
        self.db.commit()
        self.db.refresh(new_handover)
        return new_handover

    def get_handover_by_id(self, handover_id: int) -> Optional[HandoverRecord]:
        """
        ID로 단일 인수인계 조회
        """
        return self.db.query(HandoverRecord).filter(
            HandoverRecord.handover_id == handover_id
        ).first()

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
        인수인계 레코드 업데이트
        """
        handover = self.get_handover_by_id(handover_id)
        if handover:
            for key, value in data.items():
                if hasattr(handover, key) and value is not None:
                    setattr(handover, key, value)
            self.db.commit()
            self.db.refresh(handover)
        return handover

    def delete_handover(self, handover_id: int) -> bool:
        """
        인수인계 레코드 삭제
        """
        handover = self.get_handover_by_id(handover_id)
        if handover:
            self.db.delete(handover)
            self.db.commit()
            return True
        return False 