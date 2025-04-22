"""
인수인계 관련 서비스 레이어
"""

from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Dict, Any, List, Optional
from datetime import datetime

from backend.models.handover import (
    Handover,
    HandoverCreate,
    HandoverUpdate,
    HandoverResponse,
    HandoverListResponse,
    HandoverListResponseData,
    GetHandoverResponseData,
    GetHandoverResponse,
)
from backend.models.dashboard import LockStatus
from backend.models.user import UserRole
from backend.utils.logger import logger
from backend.utils.lock import check_lock_status


def get_handovers(
    db: Session, page: int = 1, limit: int = 10, current_user_id: str = None
) -> HandoverListResponse:
    """
    인수인계 목록 조회 서비스 (Pydantic 모델 반환)
    """
    logger.db(f"인수인계 목록 조회 시작 - 페이지: {page}, 사용자: {current_user_id}")

    # 공지사항 목록 조회 및 변환
    notices_db = (
        db.query(Handover)
        .filter(Handover.is_notice == True)
        .order_by(desc(Handover.create_at))
        .all()
    )
    notices_response = [HandoverResponse.from_orm(notice) for notice in notices_db]

    # 일반 인수인계 쿼리
    query = db.query(Handover).filter(Handover.is_notice == False)
    total_count = query.count()
    items_db = (
        query.order_by(desc(Handover.create_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    # 일반 인수인계 변환 (락 정보 포함)
    items_response = []
    for item in items_db:
        items_response.append(HandoverResponse.from_orm(item))

    logger.db(
        f"인수인계 목록 조회 완료 - 공지: {len(notices_response)}건, 인수인계: {len(items_response)}건 / 전체: {total_count}건"
    )

    # 응답 데이터 구성
    response_data = HandoverListResponseData(
        items=items_response,
        total=total_count,
        page=page,
        limit=limit,
        notices=notices_response,
    )

    return HandoverListResponse(data=response_data)


def get_handover(db: Session, handover_id: int, current_user_id: str) -> Dict[str, Any]:
    """
    인수인계 상세 조회 서비스 (GetHandoverResponse 구조에 맞는 Dict 반환)
    """
    logger.db(f"인수인계 상세 조회 - ID: {handover_id}, 사용자: {current_user_id}")
    handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()

    if not handover:
        logger.warn(f"인수인계 없음 - ID: {handover_id}")
        # 실패 시에도 표준 응답 구조 사용 권장
        return {
            "success": False,
            "message": "인수인계를 찾을 수 없습니다",
            "error_code": "NOT_FOUND",
            "data": None,
        }

    lock_status_dict = check_lock_status(db, Handover, handover_id, current_user_id)

    # Handover 객체를 HandoverResponse 기준으로 직렬화 (camelCase)
    handover_data_dict = HandoverResponse.from_orm(handover).dict(by_alias=True)

    # GetHandoverResponseData 구조에 맞게 lockedInfo 추가
    response_data_dict = {
        **handover_data_dict,
        "lockedInfo": lock_status_dict,  # camelCase 키 사용
    }

    # 라우트에서 GetHandoverResponse로 변환하기 용이한 Dict 구조 반환
    return {
        "success": True,
        "message": "인수인계 조회 성공",
        "data": response_data_dict,
    }


def create_handover(
    db: Session,
    handover_data: Dict[str, Any],
    current_user_id: str,
    current_user_role: str,
) -> Dict[str, Any]:
    """
    인수인계 생성 서비스 (라우트에서 Pydantic 변환)
    """
    logger.db(
        f"인수인계 생성 요청 - 사용자: {current_user_id}, 공지 여부: {handover_data.get('isNotice', False)}"
    )

    if handover_data.get("isNotice", False) and current_user_role != UserRole.ADMIN:
        logger.warn(f"공지사항 등록 권한 없음 - 사용자: {current_user_id}")
        return {
            "success": False,
            "message": "공지사항 등록은 관리자만 가능합니다",
            "error_code": "PERMISSION_DENIED",
        }

    new_handover = Handover(
        title=handover_data["title"],
        content=handover_data["content"],
        is_notice=handover_data.get("isNotice", False),
        create_at=datetime.now(),
        update_by=current_user_id,
        update_at=datetime.now(),
    )

    db.add(new_handover)
    db.commit()
    db.refresh(new_handover)
    logger.db(
        f"인수인계 생성 완료 - ID: {new_handover.handover_id}, 사용자: {current_user_id}"
    )

    return {"success": True, "message": "인수인계 생성 성공", "data": new_handover}


def update_handover(
    db: Session,
    handover_id: int,
    handover_data: Dict[str, Any],
    current_user_id: str,
    current_user_role: str,
) -> Dict[str, Any]:
    """
    인수인계 수정 서비스 (라우트에서 Pydantic 변환)
    """
    logger.db(f"인수인계 수정 요청 - ID: {handover_id}, 사용자: {current_user_id}")
    handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()
    if not handover:
        logger.warn(f"인수인계 없음 - ID: {handover_id}")
        return {
            "success": False,
            "message": "인수인계를 찾을 수 없습니다",
            "error_code": "NOT_FOUND",
        }

    if handover.update_by != current_user_id and current_user_role != UserRole.ADMIN:
        logger.warn(
            f"인수인계 수정 권한 없음 - ID: {handover_id}, 요청자: {current_user_id}, 작성자: {handover.update_by}"
        )
        return {
            "success": False,
            "message": "인수인계 수정 권한이 없습니다. 작성자 또는 관리자만 수정할 수 있습니다.",
            "error_code": "PERMISSION_DENIED",
        }

    is_notice_update = handover_data.get("isNotice", handover.is_notice)
    if handover.is_notice != is_notice_update and current_user_role != UserRole.ADMIN:
        logger.warn(f"공지사항 변경 권한 없음 - 사용자: {current_user_id}")
        return {
            "success": False,
            "message": "공지사항 설정 변경은 관리자만 가능합니다",
            "error_code": "PERMISSION_DENIED",
        }

    handover.title = handover_data.get("title", handover.title)
    handover.content = handover_data.get("content", handover.content)
    handover.is_notice = is_notice_update
    handover.update_at = datetime.now()
    handover.update_by = current_user_id

    db.commit()
    db.refresh(handover)
    logger.db(f"인수인계 수정 완료 - ID: {handover_id}, 사용자: {current_user_id}")

    return {"success": True, "message": "인수인계 수정 성공", "data": handover}


def delete_handover(
    db: Session, handover_id: int, current_user_id: str, current_user_role: str
) -> Dict[str, Any]:
    """
    인수인계 삭제 서비스 (라우트에서 처리)
    """
    logger.db(f"인수인계 삭제 요청 - ID: {handover_id}, 사용자: {current_user_id}")
    handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()
    if not handover:
        logger.warn(f"인수인계 없음 - ID: {handover_id}")
        return {
            "success": False,
            "message": "인수인계를 찾을 수 없습니다",
            "error_code": "NOT_FOUND",
        }

    if handover.update_by != current_user_id and current_user_role != UserRole.ADMIN:
        logger.warn(
            f"인수인계 삭제 권한 없음 - ID: {handover_id}, 요청자: {current_user_id}, 작성자: {handover.update_by}"
        )
        return {
            "success": False,
            "message": "인수인계 삭제 권한이 없습니다. 작성자 또는 관리자만 삭제할 수 있습니다.",
            "error_code": "PERMISSION_DENIED",
        }

    db.delete(handover)
    db.commit()
    logger.db(f"인수인계 삭제 완료 - ID: {handover_id}, 사용자: {current_user_id}")

    return {"success": True, "message": "인수인계 삭제 성공", "data": None}
