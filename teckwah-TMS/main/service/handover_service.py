"""
인수인계 관련 서비스
"""

from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, or_
from fastapi import HTTPException, status

from main.utils.logger import logger
from main.models.handover_model import Handover  # 모델 임포트


def get_handover_list(
    db: Session, 
    page: int = 1, 
    page_size: int = 10,
    is_notice: bool = False
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    인수인계 목록 조회 (페이지네이션)
    """
    try:
        # 전체 건수 조회
        total = db.query(func.count(Handover.id)).filter(Handover.is_notice == is_notice).scalar()
        
        # 페이지네이션 계산
        total_pages = (total + page_size - 1) // page_size  # 올림 나눗셈
        offset = (page - 1) * page_size
        
        # 인수인계 목록 조회 (최신순)
        handovers = db.query(Handover)\
            .filter(Handover.is_notice == is_notice)\
            .order_by(desc(Handover.created_at))\
            .offset(offset)\
            .limit(page_size)\
            .all()
            
        # 응답 데이터 가공
        handover_list = []
        for handover in handovers:
            handover_list.append({
                "id": handover.id,
                "title": handover.title,
                "content": handover.content,
                "is_notice": handover.is_notice,
                "writer_id": handover.writer_id,
                "writer": handover.writer,
                "created_at": handover.created_at.strftime("%Y-%m-%d %H:%M"),
                "updated_at": handover.updated_at.strftime("%Y-%m-%d %H:%M") if handover.updated_at else None,
                "updated_by": handover.updated_by
            })
            
        # 페이지네이션 정보
        pagination = {
            "total": total,
            "total_pages": total_pages,
            "current": page,
            "page_size": page_size
        }
        
        return handover_list, pagination
        
    except Exception as e:
        logger.error(f"인수인계 목록 조회 중 오류 발생: {str(e)}", exc_info=True)
        raise e


def get_notice_list(
    db: Session, 
    page: int = 1, 
    page_size: int = 5
) -> List[Dict[str, Any]]:
    """
    공지사항 목록 조회 (is_notice=True)
    """
    try:
        # 공지사항 목록 조회 (최신순)
        handovers, _ = get_handover_list(db, page, page_size, is_notice=True)
        return handovers
    except Exception as e:
        logger.error(f"공지사항 목록 조회 중 오류 발생: {str(e)}", exc_info=True)
        raise e


def get_handover_by_id(db: Session, handover_id: int) -> Optional[Handover]:
    """
    인수인계 상세 조회
    """
    try:
        handover = db.query(Handover).filter(Handover.id == handover_id).first()
        return handover
    except Exception as e:
        logger.error(f"인수인계 상세 조회 중 오류 발생: {str(e)}", exc_info=True)
        raise e


def create_handover(
    db: Session, 
    title: str, 
    content: str, 
    is_notice: bool,
    writer_id: str,
    writer: str
) -> Handover:
    """
    인수인계 생성
    """
    try:
        # 새 인수인계 생성
        now = datetime.now()
        handover = Handover(
            title=title,
            content=content,
            is_notice=is_notice,
            writer_id=writer_id,
            writer=writer,
            created_at=now
        )
        
        # DB에 저장
        db.add(handover)
        db.commit()
        db.refresh(handover)
        
        logger.info(f"인수인계 생성: ID {handover.id}, 작성자 {writer_id}")
        
        return handover
    except Exception as e:
        db.rollback()
        logger.error(f"인수인계 생성 중 오류 발생: {str(e)}", exc_info=True)
        raise e


def update_handover(
    db: Session, 
    handover_id: int, 
    title: str, 
    content: str, 
    is_notice: bool,
    updated_by: str
) -> Handover:
    """
    인수인계 수정
    """
    try:
        # 인수인계 조회
        handover = get_handover_by_id(db, handover_id)
        
        if not handover:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="인수인계를 찾을 수 없습니다."
            )
            
        # 인수인계 정보 업데이트
        handover.title = title
        handover.content = content
        handover.is_notice = is_notice
        handover.updated_at = datetime.now()
        handover.updated_by = updated_by
        
        # DB에 저장
        db.commit()
        db.refresh(handover)
        
        logger.info(f"인수인계 수정: ID {handover.id}, 수정자 {updated_by}")
        
        return handover
    except HTTPException:
        # HTTP 예외는 그대로 전달
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"인수인계 수정 중 오류 발생: {str(e)}", exc_info=True)
        raise e


def delete_handover(db: Session, handover_id: int) -> bool:
    """
    인수인계 삭제
    """
    try:
        # 인수인계 조회
        handover = get_handover_by_id(db, handover_id)
        
        if not handover:
            return False
            
        # DB에서 삭제
        db.delete(handover)
        db.commit()
        
        logger.info(f"인수인계 삭제: ID {handover_id}")
        
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"인수인계 삭제 중 오류 발생: {str(e)}", exc_info=True)
        raise e
