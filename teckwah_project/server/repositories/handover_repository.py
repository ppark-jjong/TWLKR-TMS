from sqlalchemy import func, and_, or_, desc
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Optional

from ..models.handover_model import HandoverRecord
from ..utils.transaction import with_row_lock, update_lock_info, generic_acquire_lock
from ..utils.error import LockConflictException, NotFoundException
from .base_repository import BaseRepository
from ..utils.logger import log_info, log_error


class HandoverRepository(BaseRepository[HandoverRecord]):
    """
    인수인계 데이터 액세스 레이어
    """
    def __init__(self, db: Session):
        super().__init__(db, HandoverRecord)

    def create_handover(self, title: str, content: str, created_by: str, is_notice: bool = False, notice_until: Optional[datetime] = None) -> HandoverRecord:
        """
        새 인수인계 레코드 생성
        """
        log_info(f"인수인계 생성 시도: '{title}', 작성자: {created_by}")
        return self.create(
            title=title,
            content=content,
            created_by=created_by,
            is_notice=is_notice,
            notice_until=notice_until
        )

    def get_handover_by_id(self, handover_id: int) -> Optional[HandoverRecord]:
        """
        ID로 단일 인수인계 조회
        """
        return self.get_by_id(handover_id)
        
    def get_handover_with_lock(self, handover_id: int, user_id: str) -> Optional[HandoverRecord]:
        """
        ID로 단일 인수인계 조회 (행 수준 락 획득)
        """
        try:
            return self.get_by_id_with_lock(handover_id, user_id)
        except Exception as e:
            # 오류 발생 시 LockConflictException으로 변환하여 상위에 전달
            log_error(f"인수인계 락 획득 실패: ID {handover_id}, 사용자 {user_id}, 오류: {str(e)}")
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
        
        result = self.db.query(self.model_class).filter(
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
        
        log_info(f"날짜 범위 인수인계 조회 결과: {start_date.strftime('%Y-%m-%d')} ~ {end_date.strftime('%Y-%m-%d')}, 총 {len(result)}건")
        return result

    def update_handover(self, handover_id: int, data: Dict) -> Optional[HandoverRecord]:
        """
        인수인계 레코드 업데이트 (락 없이)
        """
        log_info(f"인수인계 업데이트: ID {handover_id}, 필드: {', '.join(data.keys())}")
        return self.update(handover_id, **data)

    def update_handover_with_lock(self, handover_id: int, data: Dict, user_id: str) -> Optional[HandoverRecord]:
        """
        인수인계 레코드 업데이트 (행 수준 락 사용)
        """
        log_info(f"인수인계 업데이트(락): ID {handover_id}, 사용자 {user_id}, 필드: {', '.join(data.keys())}")
        
        # 버전 증가 처리
        if "version" not in data and self.get_by_id(handover_id):
            data["version"] = self.get_by_id(handover_id).version + 1
            
        return self.update_with_lock(handover_id, user_id, **data)

    def delete_handover(self, handover_id: int) -> bool:
        """
        인수인계 레코드 삭제 (락 없이)
        """
        log_info(f"인수인계 삭제: ID {handover_id}")
        return self.delete(handover_id)
        
    def delete_handover_with_lock(self, handover_id: int, user_id: str) -> bool:
        """
        인수인계 레코드 삭제 (행 수준 락 사용)
        """
        log_info(f"인수인계 삭제(락): ID {handover_id}, 사용자 {user_id}")
        return self.delete_with_lock(handover_id, user_id) 