"""
인수인계 관련 서비스 레이어
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Dict, Any, List, Optional
from datetime import datetime

from backend.models.handover import Handover, HandoverCreate, HandoverUpdate
from backend.models.user import UserRole
from backend.utils.logger import logger
from backend.utils.lock import check_lock_status


def get_handovers(
    db: Session,
    page: int = 1,
    limit: int = 10,
    current_user_id: str = None
) -> Dict[str, Any]:
    """
    인수인계 목록 조회 서비스
    표준화된 형태로 응답 데이터 구성
    """
    logger.db(f"인수인계 목록 조회 시작 - 페이지: {page}, 사용자: {current_user_id}")
    
    # 공지사항 목록 조회 (별도 쿼리)
    notices = (
        db.query(Handover)
        .filter(Handover.is_notice == True)
        .order_by(desc(Handover.create_at))
        .all()
    )
    
    # 일반 인수인계 목록 조회 (페이지네이션 적용)
    total_count = db.query(func.count(Handover.handover_id)).filter(Handover.is_notice == False).scalar()
    
    items = (
        db.query(Handover)
        .filter(Handover.is_notice == False)
        .order_by(desc(Handover.create_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )
    
    # 락 정보 포함
    for item in items:
        item.locked_info = check_lock_status(db, Handover, item.handover_id, current_user_id)
    
    # 응답 데이터 구성
    logger.db(f"인수인계 목록 조회 완료 - 공지: {len(notices)}건, 인수인계: {len(items)}건 / 전체: {total_count}건")
    
    return {
        "success": True,
        "message": "인수인계 목록 조회 성공",
        "data": {
            "items": items,
            "total": total_count,
            "page": page,
            "limit": limit,
            "notices": notices
        }
    }


def get_handover(
    db: Session,
    handover_id: int,
    current_user_id: str
) -> Dict[str, Any]:
    """
    인수인계 상세 조회 서비스
    """
    logger.db(f"인수인계 상세 조회 - ID: {handover_id}, 사용자: {current_user_id}")
    
    handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()
    
    if not handover:
        logger.warn(f"인수인계 없음 - ID: {handover_id}")
        return {
            "success": False,
            "message": "인수인계를 찾을 수 없습니다",
            "error_code": "NOT_FOUND"
        }
    
    # 락 상태 확인
    lock_status = check_lock_status(db, Handover, handover_id, current_user_id)
    
    return {
        "success": True,
        "message": "인수인계 조회 성공",
        "data": handover,
        "lock_status": lock_status
    }


def create_handover(
    db: Session,
    handover_data: Dict[str, Any],
    current_user_id: str,
    current_user_role: str
) -> Dict[str, Any]:
    """
    인수인계 생성 서비스
    """
    logger.db(f"인수인계 생성 요청 - 사용자: {current_user_id}, 공지 여부: {handover_data.get('is_notice', False)}")
    
    # 공지사항 등록 시 관리자 권한 체크
    if handover_data.get("is_notice", False) and current_user_role != UserRole.ADMIN:
        logger.warn(f"공지사항 등록 권한 없음 - 사용자: {current_user_id}")
        return {
            "success": False,
            "message": "공지사항 등록은 관리자만 가능합니다",
            "error_code": "PERMISSION_DENIED"
        }
    
    # 새 인수인계 생성
    new_handover = Handover(
        title=handover_data["title"],
        content=handover_data["content"],
        is_notice=handover_data.get("is_notice", False),
        create_at=datetime.now(),
        update_by=current_user_id,
        update_at=datetime.now()
    )
    
    db.add(new_handover)
    db.commit()
    db.refresh(new_handover)
    
    logger.db(f"인수인계 생성 완료 - ID: {new_handover.handover_id}, 사용자: {current_user_id}")
    
    return {
        "success": True,
        "message": "인수인계 생성 성공",
        "data": new_handover
    }


def update_handover(
    db: Session,
    handover_id: int,
    handover_data: Dict[str, Any],
    current_user_id: str,
    current_user_role: str
) -> Dict[str, Any]:
    """
    인수인계 수정 서비스
    """
    logger.db(f"인수인계 수정 요청 - ID: {handover_id}, 사용자: {current_user_id}")
    
    handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()
    
    if not handover:
        logger.warn(f"인수인계 없음 - ID: {handover_id}")
        return {
            "success": False,
            "message": "인수인계를 찾을 수 없습니다",
            "error_code": "NOT_FOUND"
        }
    
    # 수정 권한 확인 (작성자 또는 관리자만 가능)
    if handover.update_by != current_user_id and current_user_role != UserRole.ADMIN:
        logger.warn(f"인수인계 수정 권한 없음 - ID: {handover_id}, 요청자: {current_user_id}, 작성자: {handover.update_by}")
        return {
            "success": False,
            "message": "인수인계 수정 권한이 없습니다. 작성자 또는 관리자만 수정할 수 있습니다.",
            "error_code": "PERMISSION_DENIED"
        }
    
    # 공지사항 전환 시 관리자 권한 체크
    if handover.is_notice != handover_data.get("is_notice", handover.is_notice) and current_user_role != UserRole.ADMIN:
        logger.warn(f"공지사항 변경 권한 없음 - 사용자: {current_user_id}")
        return {
            "success": False,
            "message": "공지사항 설정 변경은 관리자만 가능합니다",
            "error_code": "PERMISSION_DENIED"
        }
    
    # 필드 업데이트
    handover.title = handover_data.get("title", handover.title)
    handover.content = handover_data.get("content", handover.content)
    handover.is_notice = handover_data.get("is_notice", handover.is_notice)
    handover.update_at = datetime.now()
    handover.update_by = current_user_id
    
    db.commit()
    db.refresh(handover)
    
    logger.db(f"인수인계 수정 완료 - ID: {handover_id}, 사용자: {current_user_id}")
    
    return {
        "success": True,
        "message": "인수인계 수정 성공",
        "data": handover
    }


def delete_handover(
    db: Session,
    handover_id: int,
    current_user_id: str,
    current_user_role: str
) -> Dict[str, Any]:
    """
    인수인계 삭제 서비스
    """
    logger.db(f"인수인계 삭제 요청 - ID: {handover_id}, 사용자: {current_user_id}")
    
    handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()
    
    if not handover:
        logger.warn(f"인수인계 없음 - ID: {handover_id}")
        return {
            "success": False,
            "message": "인수인계를 찾을 수 없습니다",
            "error_code": "NOT_FOUND"
        }
    
    # 삭제 권한 확인 (작성자 또는 관리자만 가능)
    if handover.update_by != current_user_id and current_user_role != UserRole.ADMIN:
        logger.warn(f"인수인계 삭제 권한 없음 - ID: {handover_id}, 요청자: {current_user_id}, 작성자: {handover.update_by}")
        return {
            "success": False,
            "message": "인수인계 삭제 권한이 없습니다. 작성자 또는 관리자만 삭제할 수 있습니다.",
            "error_code": "PERMISSION_DENIED"
        }
    
    # 삭제 실행
    db.delete(handover)
    db.commit()
    
    logger.db(f"인수인계 삭제 완료 - ID: {handover_id}, 사용자: {current_user_id}")
    
    return {
        "success": True,
        "message": "인수인계 삭제 성공",
        "data": None
    }
