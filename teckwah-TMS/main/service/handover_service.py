"""
인수인계 관련 서비스 - 리팩토링 버전
"""

from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status
import logging
from main.models.handover_model import Handover
from main.utils.pagination import paginate_query
from main.utils.lock import (
    check_lock_status as check_common_lock_status,
)  # 이름 충돌 방지

logger = logging.getLogger(__name__)


def _handover_to_dict(handover: Handover) -> Dict[str, Any]:
    """Handover 모델 객체를 API 응답용 딕셔너리로 변환"""
    return {
        "handover_id": handover.handover_id,
        "title": handover.title,
        "content": handover.content,
        "is_notice": handover.is_notice,
        "create_by": handover.create_by,
        "update_by": handover.update_by,
        "update_at": handover.update_at,  # datetime 객체 그대로 반환
        "is_locked": handover.is_locked,
    }


def get_handover_list_paginated(
    db: Session,
    page: int = 1,
    page_size: int = 30,
    is_notice: bool = False,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """페이지네이션된 인수인계/공지 목록 조회"""
    try:
        query = db.query(Handover).filter(Handover.is_notice == is_notice)
        handovers_raw, pagination_info = paginate_query(
            query.order_by(desc(Handover.update_at)), page, page_size
        )
        # 모델 객체 리스트를 딕셔너리 리스트로 변환
        handover_list = [_handover_to_dict(h) for h in handovers_raw]
        return handover_list, pagination_info
    except Exception as e:
        logger.error(f"페이지네이션 목록 조회 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="목록 조회 중 오류 발생")


def get_handover_list_all(db: Session, is_notice: bool = False) -> List[Dict[str, Any]]:
    """전체 인수인계/공지 목록 조회"""
    try:
        query = db.query(Handover).filter(Handover.is_notice == is_notice)
        all_handovers = query.order_by(desc(Handover.update_at)).all()
        return [_handover_to_dict(h) for h in all_handovers]
    except Exception as e:
        logger.error(f"전체 목록 조회 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="목록 조회 중 오류 발생")


def get_notice_list(
    db: Session, page: int = 1, page_size: int = 5
) -> List[Dict[str, Any]]:
    """공지사항 목록 조회 (페이지네이션 적용)"""
    notices, _ = get_handover_list_paginated(db, page, page_size, is_notice=True)
    return notices


def get_handover_by_id(db: Session, handover_id: int) -> Optional[Handover]:
    """ID로 인수인계 상세 조회 (모델 객체 반환)"""
    try:
        return db.query(Handover).filter(Handover.handover_id == handover_id).first()
    except Exception as e:
        logger.error(f"ID로 상세 조회 오류 ({handover_id}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="데이터 조회 중 오류 발생")


def create_handover(
    db: Session,
    title: str,
    content: str,
    is_notice: bool,
    writer_id: str,
) -> Handover:
    """인수인계 생성"""
    try:
        now = datetime.now()
        handover = Handover(
            title=title,
            content=content,
            is_notice=is_notice,
            create_by=writer_id,
            update_by=writer_id,
            update_at=now,
            is_locked=False,
        )
        db.add(handover)
        db.flush()  # ID 등 생성 값 확인
        logger.info(f"인수인계 생성 완료: ID {handover.handover_id}")
        return handover
    except Exception as e:
        # db.rollback() # 트랜잭션은 데코레이터에서 처리
        logger.error(f"인수인계 생성 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="인수인계 생성 중 오류 발생")


def update_handover(
    db: Session,
    handover_id: int,
    title: str,
    content: str,
    is_notice: bool,
    updated_by: str,
) -> Handover:
    """인수인계 수정"""
    # 락 처리는 라우터 또는 별도 미들웨어에서 수행 가정
    try:
        handover = get_handover_by_id(db, handover_id)
        if not handover:
            raise HTTPException(
                status_code=404, detail="수정할 인수인계를 찾을 수 없습니다."
            )

        # 변경된 필드만 업데이트 (더 효율적인 방법)
        update_data = {
            "title": title,
            "content": content,
            "is_notice": is_notice,
            "update_at": datetime.now(),
            "update_by": updated_by,
            "is_locked": False,  # 수정 완료 후 락 해제 (락 처리 로직 위치에 따라 조정)
        }
        for key, value in update_data.items():
            setattr(handover, key, value)

        db.flush()  # 변경사항 반영
        logger.info(f"인수인계 수정 완료 (커밋 전): ID {handover.handover_id}")
        return handover
    except HTTPException as http_exc:
        # db.rollback() # 트랜잭션은 데코레이터에서 처리
        raise http_exc
    except Exception as e:
        # db.rollback()
        logger.error(f"인수인계 수정 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="인수인계 수정 중 오류 발생")


def delete_handover(db: Session, handover_id: int, user_id: str) -> bool:
    """인수인계 삭제"""
    # 락 처리 및 권한 확인은 라우터 또는 별도 미들웨어에서 수행 가정
    try:
        handover = get_handover_by_id(db, handover_id)
        if not handover:
            return False  # 또는 404 예외 발생

        db.delete(handover)
        db.flush()
        logger.info(f"인수인계 삭제 완료 (커밋 전): ID {handover_id}")
        return True
    except Exception as e:
        # db.rollback()
        logger.error(f"인수인계 삭제 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="인수인계 삭제 중 오류 발생")


def check_handover_lock_status(
    db: Session, handover_id: int, user_id: str
) -> Dict[str, Any]:
    """인수인계 락 상태 확인"""
    logger.info(f"인수인계 락 상태 확인: id={handover_id}, user={user_id}")
    try:
        return check_common_lock_status(db, "handover", handover_id, user_id)
    except Exception as e:
        logger.error(f"인수인계 락 상태 확인 중 오류: {e}", exc_info=True)
        # 실패 시 기본 응답 반환
        return {
            "editable": False,
            "message": "락 상태 확인 중 오류가 발생했습니다",
            "locked_by": None,
            "locked_at": None,
        }


# 이전 라우터 호환성을 위한 함수 (제거 예정 또는 유지)
# check_lock_status 함수는 이제 사용되지 않음
# def check_lock_status(db: Session, handover_id: int, user_id: str) -> Dict[str, Any]:
#    return check_handover_lock_status(db, handover_id, user_id)
