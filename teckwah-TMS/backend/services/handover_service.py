"""
인수인계 관련 서비스 레이어
"""

from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import ValidationError

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
from backend.schemas.dashboard_schema import LockStatus
from backend.schemas.user_schema import UserRole
from backend.utils.logger import logger
from backend.utils.lock import check_lock_status, validate_lock, release_lock


def get_handovers(
    db: Session, page: int = 1, limit: int = 10, current_user_id: str = None
) -> HandoverListResponse:
    """
    인수인계 목록 조회 서비스 (Pydantic 모델 반환) + 상세 로깅
    """
    logger.debug(
        f"인수인계 목록 조회 서비스 시작: page={page}, limit={limit}, user={current_user_id}"
    )

    # --- DB 조회 (공지사항) ---
    try:
        notices_query = db.query(Handover).filter(Handover.is_notice == True)
        notices = notices_query.order_by(Handover.update_at.desc()).all()
        logger.db(f"  공지사항 DB 조회 성공: {len(notices)} 건")
        if notices:
            logger.debug(f"    첫번째 Notice 객체 타입: {type(notices[0])}")
            logger.debug(
                f"    첫번째 Notice 데이터 (일부): ID={notices[0].handover_id}, Title={notices[0].title}, UpdateBy={notices[0].update_by}"
            )
    except Exception as e:
        logger.error(f"공지사항 DB 조회 실패: {e}", exc_info=True)
        notices = []
    # -----------------------

    # --- DB 조회 (일반 목록) ---
    try:
        items_query = db.query(Handover).filter(Handover.is_notice == False)
        total_count = items_query.count()
        items = (
            items_query.order_by(Handover.update_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )
        logger.db(
            f"  일반 인수인계 DB 조회 성공: {len(items)} 건 조회 (전체 {total_count} 건)"
        )
        if items:
            logger.debug(f"    첫번째 Item 객체 타입: {type(items[0])}")
            logger.debug(
                f"    첫번째 Item 데이터 (일부): ID={items[0].handover_id}, Title={items[0].title}, UpdateBy={items[0].update_by}"
            )
    except Exception as e:
        logger.error(f"일반 인수인계 DB 조회 실패: {e}", exc_info=True)
        items = []
        total_count = 0
    # ------------------------

    # --- HandoverResponse 변환 및 로깅 ---
    notice_responses = []
    if notices:
        for i, notice in enumerate(notices):
            try:
                logger.debug(
                    f"  Notice HandoverResponse 변환 시도 [{i}]: ID={getattr(notice, 'handover_id', 'N/A')}"
                )
                notice_responses.append(HandoverResponse.from_orm(notice))
                logger.debug(f"    Notice HandoverResponse 변환 성공 [{i}]")
            except ValidationError as ve:
                logger.error(
                    f"Notice HandoverResponse.from_orm 유효성 검사 실패 [{i}]: ID={getattr(notice, 'handover_id', 'N/A')}, 오류={ve.errors()}"
                )
                try:
                    item_dict = {
                        c.name: getattr(notice, c.name, None)
                        for c in notice.__table__.columns
                    }
                    logger.error(f"    실패한 ORM 객체 데이터 (Notice): {item_dict}")
                except Exception as e_dict:
                    logger.error(
                        f"    실패한 ORM 객체 dict 변환 중 오류 (Notice): {e_dict}"
                    )
            except Exception as e:
                logger.error(
                    f"Notice HandoverResponse.from_orm 변환 중 일반 오류 [{i}]: ID={getattr(notice, 'handover_id', 'N/A')}, 오류={e}",
                    exc_info=True,
                )

    item_responses = []
    if items:
        for i, item in enumerate(items):
            try:
                logger.debug(
                    f"  Item HandoverResponse 변환 시도 [{i}]: ID={getattr(item, 'handover_id', 'N/A')}"
                )
                item_responses.append(HandoverResponse.from_orm(item))
                logger.debug(f"    Item HandoverResponse 변환 성공 [{i}]")
            except ValidationError as ve:
                logger.error(
                    f"Item HandoverResponse.from_orm 유효성 검사 실패 [{i}]: ID={getattr(item, 'handover_id', 'N/A')}, 오류={ve.errors()}"
                )
                try:
                    item_dict = {
                        c.name: getattr(item, c.name, None)
                        for c in item.__table__.columns
                    }
                    logger.error(f"    실패한 ORM 객체 데이터 (Item): {item_dict}")
                except Exception as e_dict:
                    logger.error(
                        f"    실패한 ORM 객체 dict 변환 중 오류 (Item): {e_dict}"
                    )
            except Exception as e:
                logger.error(
                    f"Item HandoverResponse.from_orm 변환 중 일반 오류 [{i}]: ID={getattr(item, 'handover_id', 'N/A')}, 오류={e}",
                    exc_info=True,
                )
    logger.debug(
        f"  HandoverResponse 변환 완료: Notices={len(notice_responses)}/{len(notices) if notices else 0}, Items={len(item_responses)}/{len(items) if items else 0}"
    )
    # --------------------------------

    # --- 최종 응답 모델 생성 전 데이터 로깅 ---
    response_data_payload = {
        "items": item_responses,
        "total": total_count,
        "page": page,
        "limit": limit,
        "notices": notice_responses,
    }
    logger.debug(
        f"HandoverListResponseData 생성 전 payload (타입 요약): items_len={len(item_responses)}, total={type(total_count)}, notices_len={len(notice_responses)}"
    )
    # ------------------------------------

    try:
        response_data = HandoverListResponseData(**response_data_payload)
        logger.debug(
            f"  생성된 HandoverListResponseData: items_len={len(response_data.items)}, total={response_data.total}, notices_len={len(response_data.notices)}"
        )

        final_response = HandoverListResponse(data=response_data)
        logger.debug(
            f"  최종 반환될 HandoverListResponse: success={final_response.success}, message={final_response.message}, data.total={final_response.data.total}"
        )
        return final_response
    except Exception as e:
        logger.error(f"최종 HandoverListResponse(Data) 생성 실패: {e}", exc_info=True)
        logger.error(f"  실패 시점 payload: {response_data_payload}")
        empty_data = HandoverListResponseData(
            items=[], total=0, page=page, limit=limit, notices=[]
        )
        return HandoverListResponse(
            success=False, message="데이터 처리 중 오류 발생", data=empty_data
        )


def get_handover(db: Session, handover_id: int, current_user_id: str) -> Dict[str, Any]:
    """
    인수인계 상세 조회 서비스 (GetHandoverResponse 구조에 맞는 Dict 반환) + 상세 로깅
    """
    logger.debug(
        f"인수인계 상세 조회 서비스 시작: ID={handover_id}, user={current_user_id}"
    )
    try:
        handover = (
            db.query(Handover).filter(Handover.handover_id == handover_id).first()
        )
        if not handover:
            logger.warn(f"인수인계 없음 - ID: {handover_id}")
            return {
                "success": False,
                "message": "항목을 찾을 수 없습니다",
                "error_code": "NOT_FOUND",
                "data": None,
            }
        logger.db(
            f"  인수인계 DB 조회 성공: ID={handover.handover_id}, Title={handover.title}"
        )

        # --- 락 상태 확인 및 로깅 ---
        lock_status_dict = check_lock_status(
            db, "handover", handover_id, current_user_id
        )
        logger.debug(f"  락 상태 확인 결과: {lock_status_dict}")
        # --------------------------

        # --- HandoverResponse 변환 및 로깅 ---
        handover_response = None
        try:
            handover_response = HandoverResponse.from_orm(handover)
            logger.debug(
                f"  HandoverResponse 변환 성공: ID={handover_response.handover_id}, Title={handover_response.title}"
            )
        except Exception as e:
            logger.error(
                f"HandoverResponse.from_orm 변환 실패 (서비스): ID={handover_id}, 오류={e}",
                exc_info=True,
            )
            # 변환 실패 시에도 오류 반환하지 않고 진행 (라우터에서 처리)
            return {
                "success": False,
                "message": "데이터 변환 오류",
                "error_code": "INTERNAL_ERROR",
            }

        # --- 최종 반환 데이터 구성 및 로깅 ---
        final_data = handover_response.dict(
            by_alias=True
        )  # Pydantic 객체를 dict로 변환
        final_data["lockedInfo"] = lock_status_dict  # 락 정보 추가 (camelCase)
        logger.debug(f"  최종 반환 data 딕셔너리 (키 목록): {list(final_data.keys())}")
        logger.debug(f"    lockedInfo 값: {final_data.get('lockedInfo')}")
        # --------------------------------

        return {
            "success": True,
            "message": "인수인계 조회 성공",
            "data": final_data,
        }

    except Exception as e:
        logger.error(
            f"인수인계 조회 중 오류 발생 (ID: {handover_id}): {e}", exc_info=True
        )
        return {
            "success": False,
            "message": "조회 중 오류 발생",
            "error_code": "INTERNAL_ERROR",
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
