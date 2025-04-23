"""
인수인계 관련 서비스
"""

from typing import Dict, List, Optional, Tuple, Any, Union
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, and_, or_, text
from datetime import datetime

from backend.models.handover import Handover
from backend.schemas.handover import HandoverCreate, HandoverUpdate
from backend.utils.logger import logger
from backend.utils.lock import acquire_lock, release_lock, check_lock_status


class HandoverService:
    """인수인계 관련 서비스 클래스"""
    
    TABLE_NAME = "handover"
    
    @staticmethod
    def get_handover(db: Session, handover_id: int, user_id: str) -> Optional[Dict[str, Any]]:
        """인수인계 상세 정보를 조회합니다."""
        handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()
        
        if not handover:
            return None
        
        # ORM 객체를 딕셔너리로 변환
        handover_dict = {c.name: getattr(handover, c.name) for c in handover.__table__.columns}
        
        # 락 정보 추가
        lock_status = check_lock_status(db, HandoverService.TABLE_NAME, handover_id, user_id)
        handover_dict["locked_info"] = lock_status
        
        return handover_dict
    
    @staticmethod
    def get_handovers(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        is_notice: Optional[bool] = None
    ) -> Tuple[List[Handover], int, List[Handover]]:
        """인수인계 목록을 조회합니다."""
        # 공지사항 쿼리
        notices_query = db.query(Handover).filter(Handover.is_notice == True)
        notices = notices_query.order_by(desc(Handover.create_at)).all()
        
        # 인수인계 쿼리
        query = db.query(Handover)
        
        # 필터 적용
        if is_notice is not None:
            query = query.filter(Handover.is_notice == is_notice)
        
        # 전체 수 계산
        total = query.count()
        
        # 페이지네이션 및 정렬 적용
        handovers = query.order_by(desc(Handover.create_at)).offset(skip).limit(limit).all()
        
        return handovers, total, notices
    
    @staticmethod
    def create_handover(db: Session, handover_data: HandoverCreate, user_id: str) -> Handover:
        """새 인수인계를 생성합니다."""
        try:
            # 현재 시간 설정
            now = datetime.now()
            
            # 새 인수인계 생성
            new_handover = Handover(
                title=handover_data.title,
                content=handover_data.content,
                is_notice=handover_data.is_notice,
                update_by=user_id,
                create_at=now,
                update_at=now,
                is_locked=False
            )
            
            db.add(new_handover)
            db.commit()
            db.refresh(new_handover)
            logger.info(f"새 인수인계 생성 완료: {handover_data.title} (ID: {new_handover.handover_id})")
            return new_handover
        
        except Exception as e:
            db.rollback()
            logger.error(f"인수인계 생성 중 오류: {str(e)}")
            raise
    
    @staticmethod
    def update_handover(
        db: Session, 
        handover_id: int, 
        handover_data: HandoverUpdate, 
        user_id: str
    ) -> Optional[Handover]:
        """인수인계 정보를 수정합니다."""
        # 락 확인
        lock_info = check_lock_status(db, HandoverService.TABLE_NAME, handover_id, user_id)
        if not lock_info.get("editable", False):
            logger.warning(f"락 없이 인수인계 수정 시도: ID {handover_id}, 사용자 {user_id}")
            raise ValueError(lock_info.get("message", "이 인수인계를 수정할 권한이 없습니다"))
        
        handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()
        if not handover:
            return None
        
        # 작성자가 아니고 관리자도 아닌 경우 수정 불가
        if handover.update_by != user_id:
            # 여기서는 단순히 확인만 함. 실제 권한 체크는 컨트롤러에서 관리자 여부 확인
            logger.warning(f"본인 작성 글이 아닌 인수인계 수정 시도: ID {handover_id}, 작성자 {handover.update_by}, 수정 시도 사용자 {user_id}")
        
        try:
            # 수정 가능한 필드 목록
            updatable_fields = ['title', 'content', 'is_notice']
            
            # 필드 업데이트
            for field in updatable_fields:
                if hasattr(handover_data, field) and getattr(handover_data, field) is not None:
                    setattr(handover, field, getattr(handover_data, field))
            
            # 수정자 및 수정 시간 업데이트
            handover.update_by = user_id
            handover.update_at = datetime.now()
            
            db.commit()
            db.refresh(handover)
            logger.info(f"인수인계 정보 수정 완료: ID {handover_id} ({handover.title})")
            
            # 수정 완료 후 락 해제
            release_lock(db, HandoverService.TABLE_NAME, handover_id, user_id)
            return handover
            
        except Exception as e:
            db.rollback()
            logger.error(f"인수인계 정보 수정 중 오류: {str(e)}")
            raise
    
    @staticmethod
    def delete_handover(db: Session, handover_id: int, user_id: str) -> bool:
        """인수인계를 삭제합니다."""
        # 락 획득 시도
        success, lock_info = acquire_lock(db, HandoverService.TABLE_NAME, handover_id, user_id)
        if not success:
            logger.warning(f"락 획득 실패로 인수인계 삭제 불가: ID {handover_id}, 사용자 {user_id}")
            raise ValueError(lock_info.get("message", "이 인수인계를 삭제할 권한이 없습니다"))
        
        handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()
        if not handover:
            return False
        
        try:
            db.delete(handover)
            db.commit()
            logger.info(f"인수인계 삭제 완료: ID {handover_id} ({handover.title})")
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"인수인계 삭제 중 오류: {str(e)}")
            raise
        finally:
            # 성공하든 실패하든 락 해제 시도
            release_lock(db, HandoverService.TABLE_NAME, handover_id, user_id)
    
    @staticmethod
    def lock_handover(db: Session, handover_id: int, user_id: str) -> Dict[str, Any]:
        """인수인계에 편집 락을 설정합니다."""
        success, lock_info = acquire_lock(db, HandoverService.TABLE_NAME, handover_id, user_id)
        
        if success:
            logger.info(f"인수인계 락 획득 성공: ID {handover_id}, 사용자 {user_id}")
        else:
            logger.warning(f"인수인계 락 획득 실패: ID {handover_id}, 사용자 {user_id}")
        
        return {
            "success": success,
            "message": lock_info.get("message", "락 상태 확인 실패"),
            "lock_status": {
                "editable": lock_info.get("editable", False),
                "locked_by": lock_info.get("locked_by", None),
                "locked_at": lock_info.get("locked_at", None)
            }
        }
    
    @staticmethod
    def unlock_handover(db: Session, handover_id: int, user_id: str) -> Dict[str, Any]:
        """인수인계의 편집 락을 해제합니다."""
        success, lock_info = release_lock(db, HandoverService.TABLE_NAME, handover_id, user_id)
        
        if success:
            logger.info(f"인수인계 락 해제 성공: ID {handover_id}, 사용자 {user_id}")
        else:
            logger.warning(f"인수인계 락 해제 실패: ID {handover_id}, 사용자 {user_id}")
        
        return {
            "success": success,
            "message": lock_info.get("message", "락 해제 상태 확인 실패")
        }
