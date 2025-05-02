"""
인수인계 관련 서비스 - 페이지네이션 함수 분리 및 로깅/시간 형식 적용
"""

from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, or_
from fastapi import HTTPException, status
import logging
from main.models.handover_model import Handover
from main.utils.pagination import paginate_query

logger = logging.getLogger(__name__)


def get_handover_list_paginated(
    db: Session,
    page: int = 1,
    page_size: int = 30,
    is_notice: bool = False,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    인수인계 목록 조회 (페이지네이션 적용)
    초기 페이지 로드(/handover SSR)에서 사용됩니다.

    Args:
        db: 데이터베이스 세션
        page: 페이지 번호
        page_size: 페이지 크기
        is_notice: 공지사항 여부 (True: 공지, False: 인수인계)

    Returns:
        Tuple[List[Dict[str, Any]], Dict[str, Any]]:
            (해당 페이지 인수인계/공지 목록, 페이지네이션 정보)
    """
    logger.info(
        f"페이지네이션 인수인계/공지 목록 조회 시작: page={page}, size={page_size}, notice={is_notice}"
    )
    try:
        # 기본 쿼리 생성
        query = db.query(Handover).filter(Handover.is_notice == is_notice)
        logger.debug(f"쿼리 생성 완료: is_notice={is_notice}")

        # 페이지네이션 적용
        handovers, pagination_info = paginate_query(
            query.order_by(desc(Handover.update_at)), page, page_size
        )
        logger.info(
            f"페이지네이션 적용 완료: {len(handovers)}건 조회됨 (페이지 {page}/{pagination_info.get('total_pages', 0)}) "
        )

        # 응답 데이터 가공 (시간 형식 YYYY-MM-DD HH:MM 적용)
        handover_list = []
        for handover in handovers:
            handover_list.append(
                {
                    "handover_id": handover.handover_id,
                    "title": handover.title,
                    "content": handover.content,
                    "is_notice": handover.is_notice,
                    "update_by": handover.update_by,
                    "update_at": (
                        handover.update_at.strftime("%Y-%m-%d %H:%M")
                        if handover.update_at
                        else None
                    ),
                }
            )
        logger.debug(f"데이터 가공 완료: {len(handover_list)}건")

        return handover_list, pagination_info

    except Exception as e:
        logger.error(
            f"페이지네이션 인수인계/공지 목록 조회 중 오류 발생: {str(e)}",
            exc_info=True,
        )
        # 오류 시 빈 목록과 기본 페이지네이션 정보 반환
        empty_pagination = {
            "totalCount": 0,
            "page": page,
            "pageSize": page_size,
            "totalPages": 0,
        }
        return [], empty_pagination


def get_handover_list_all(db: Session, is_notice: bool = False) -> List[Dict[str, Any]]:
    """
    인수인계 목록 전체 조회 (페이지네이션 없음)
    API 엔드포인트 (/api/handover/list) 에서 사용됩니다.

    Args:
        db: 데이터베이스 세션
        is_notice: 공지사항 여부 (True: 공지, False: 인수인계)

    Returns:
        List[Dict[str, Any]]: 전체 인수인계/공지 목록
    """
    logger.info(f"전체 인수인계/공지 목록 조회 시작: notice={is_notice}")
    try:
        # 기본 쿼리 생성
        query = db.query(Handover).filter(Handover.is_notice == is_notice)
        logger.debug(f"쿼리 생성 완료: is_notice={is_notice}")

        # 전체 목록 조회 (최신순)
        all_handovers = query.order_by(desc(Handover.update_at)).all()
        logger.info(f"전체 목록 조회 완료: {len(all_handovers)}건")

        # 응답 데이터 가공 (시간 형식 YYYY-MM-DD HH:MM 적용)
        handover_list = []
        for handover in all_handovers:
            handover_list.append(
                {
                    "handover_id": handover.handover_id,
                    "title": handover.title,
                    "content": handover.content,
                    "is_notice": handover.is_notice,
                    "update_by": handover.update_by,
                    "update_at": (
                        handover.update_at.strftime("%Y-%m-%d %H:%M")
                        if handover.update_at
                        else None
                    ),
                }
            )
        logger.debug(f"데이터 가공 완료: {len(handover_list)}건")

        return handover_list

    except Exception as e:
        logger.error(
            f"전체 인수인계/공지 목록 조회 중 오류 발생: {str(e)}", exc_info=True
        )
        return []


def get_notice_list(
    db: Session, page: int = 1, page_size: int = 5
) -> List[Dict[str, Any]]:
    """
    공지사항 목록 조회 (is_notice=True) - 페이지네이션 적용됨
    get_handover_list_paginated 를 사용하도록 수정
    """
    logger.info(
        f"공지사항 목록 조회 호출 (페이지네이션): page={page}, size={page_size}"
    )
    try:
        # 페이지네이션 함수 호출
        notices, _ = get_handover_list_paginated(db, page, page_size, is_notice=True)
        return notices
    except Exception as e:
        logger.error(f"공지사항 목록 조회 중 오류 발생: {str(e)}", exc_info=True)
        raise e


def get_handover_by_id(db: Session, handover_id: int) -> Optional[Handover]:
    """
    인수인계 상세 조회
    """
    logger.info(f"인수인계 상세 조회 시작: id={handover_id}")
    try:
        handover = (
            db.query(Handover).filter(Handover.handover_id == handover_id).first()
        )
        if handover:
            logger.info(f"인수인계 조회 성공: id={handover_id}")
        else:
            logger.warning(f"인수인계 조회 결과 없음: id={handover_id}")
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
) -> Handover:
    """
    인수인계 생성
    """
    logger.info(
        f"인수인계 생성 시작: title='{title}', notice={is_notice}, writer={writer_id}"
    )
    try:
        now = datetime.now()
        handover = Handover(
            title=title,
            content=content,
            is_notice=is_notice,
            update_by=writer_id,
            create_by=writer_id,
            update_at=now,
        )
        db.add(handover)
        db.commit()
        db.refresh(handover)
        logger.info(f"인수인계 생성 성공: ID {handover.handover_id}")
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
    updated_by: str,
) -> Handover:
    """
    인수인계 수정 (행 단위 락 확인 포함)
    """
    from main.utils.lock import acquire_lock, release_lock

    logger.info(f"인수인계 수정 시도: id={handover_id}, user={updated_by}")

    lock_success, lock_info = acquire_lock(db, "handover", handover_id, updated_by)
    if not lock_success:
        logger.warning(f"인수인계 수정 실패 (락 획득 불가): ID {handover_id}")
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=lock_info.get("message", "다른 사용자가 편집 중입니다."),
        )

    try:
        handover = get_handover_by_id(db, handover_id)
        if not handover:
            release_lock(db, "handover", handover_id, updated_by)
            logger.warning(f"인수인계 수정 실패 (찾을 수 없음): ID {handover_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="수정할 인수인계를 찾을 수 없습니다.",
            )

        handover.title = title
        handover.content = content
        handover.is_notice = is_notice
        handover.update_at = datetime.now()
        handover.update_by = updated_by

        db.commit()
        db.refresh(handover)
        logger.info(f"인수인계 수정 성공: ID {handover.handover_id}")
        return handover

    except HTTPException as http_exc:
        # HTTP 예외는 그대로 전달 (404 등)
        raise http_exc
    except Exception as e:
        db.rollback()
        logger.error(f"인수인계 수정 중 오류 발생: {str(e)}", exc_info=True)
        raise e
    finally:
        # 성공/실패 여부와 관계없이 락 해제 시도
        try:
            release_lock(db, "handover", handover_id, updated_by)
            logger.debug(f"인수인계 락 해제됨: ID {handover_id}")
        except Exception as lock_e:
            logger.error(f"인수인계 수정 후 락 해제 실패: {lock_e}", exc_info=True)


def delete_handover(db: Session, handover_id: int, user_id: str) -> bool:
    """
    인수인계 삭제 (락 확인 포함)
    """
    from main.utils.lock import acquire_lock, release_lock

    logger.info(f"인수인계 삭제 시도: id={handover_id}, user={user_id}")

    # 락 획득 시도
    lock_success, lock_info = acquire_lock(db, "handover", handover_id, user_id)
    if not lock_success:
        logger.warning(f"인수인계 삭제 실패 (락 획득 불가): ID {handover_id}")
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=lock_info.get("message", "다른 사용자가 편집 중입니다."),
        )

    try:
        handover = get_handover_by_id(db, handover_id)
        if not handover:
            release_lock(db, "handover", handover_id, user_id)
            logger.warning(f"인수인계 삭제 실패 (찾을 수 없음): ID {handover_id}")
            return False

        db.delete(handover)
        db.commit()
        logger.info(f"인수인계 삭제 성공: ID {handover_id}")
        return True

    except Exception as e:
        db.rollback()
        # 실패 시 락 해제 시도
        try:
            release_lock(db, "handover", handover_id, user_id)
            logger.debug(f"인수인계 삭제 실패 후 락 해제됨: ID {handover_id}")
        except Exception as lock_e:
            logger.error(f"인수인계 삭제 실패 및 락 해제 실패: {lock_e}", exc_info=True)

        logger.error(f"인수인계 삭제 중 오류 발생: {str(e)}", exc_info=True)
        raise e


def check_handover_lock_status(
    db: Session, handover_id: int, user_id: str
) -> Dict[str, Any]:
    """
    인수인계 항목의 락 상태를 확인합니다.

    Args:
        db: 데이터베이스 세션
        handover_id: 확인할 인수인계 ID
        user_id: 현재 사용자 ID

    Returns:
        Dict[str, Any]: 락 상태 정보 (editable, message, locked_by, locked_at 등)
    """
    from main.utils.lock import check_lock_status

    logger.info(f"인수인계 락 상태 확인: id={handover_id}, user={user_id}")
    try:
        # 공통 락 상태 확인 함수 호출
        lock_status = check_lock_status(db, "handover", handover_id, user_id)
        logger.debug(f"인수인계 락 상태: editable={lock_status.get('editable')}")
        return lock_status
    except Exception as e:
        logger.error(f"인수인계 락 상태 확인 중 오류: {str(e)}", exc_info=True)
        return {
            "editable": False,
            "message": "락 상태 확인 중 오류가 발생했습니다",
            "locked_by": None,
            "locked_at": None,
        }


def check_lock_status(db: Session, handover_id: int, user_id: str) -> Dict[str, Any]:
    """
    인수인계 항목의 락 상태를 확인합니다.
    route에서 check_lock_status as check_handover_lock_status로 임포트 호환성을 위한 함수

    Args:
        db: 데이터베이스 세션
        handover_id: 확인할 인수인계 ID
        user_id: 현재 사용자 ID

    Returns:
        Dict[str, Any]: 락 상태 정보 (editable, message, locked_by, locked_at 등)
    """
    return check_handover_lock_status(db, handover_id, user_id)
