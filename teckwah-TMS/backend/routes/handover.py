"""
인수인계 관련 라우트
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from backend.utils.logger import logger
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime

from backend.database import get_db
from backend.models.handover import Handover, HandoverCreate, HandoverResponse
from backend.middleware.auth import get_current_user, admin_required
from backend.models.user import UserRole
from backend.utils.lock import acquire_lock, release_lock, validate_lock, check_lock_status

router = APIRouter()


@router.get("/", response_model=Dict[str, Any])
async def get_handovers(
    is_notice: Optional[bool] = Query(None, description="공지사항 여부"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(10, ge=1, le=100, description="페이지당 항목 수"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    인수인계 목록 조회
    개선: 공지사항과 일반 인수인계 분리 조회
    """
    # 요청 로깅
    logger.info(f"인수인계 목록 조회 시작: user_id={current_user['user_id']}, is_notice={is_notice}, page={page}, limit={limit}")
    try:
        # 서비스 로직: 공지사항 목록 쿼리
        logger.info("공지사항 목록 쿼리 실행 중...")
        notice_query = db.query(Handover).filter(Handover.is_notice == True)
        notice_total = notice_query.count()
        logger.info(f"공지사항 총 개수: {notice_total}개")
        notice_query = notice_query.order_by(Handover.create_at.desc())
    
        # 서비스 로직: 공지사항 페이지네이션
        notice_page = 1 if is_notice is None or is_notice else page
        logger.info(f"공지사항 페이지: {notice_page}, 페이지당 항목 수: {limit}")
        notice_query = notice_query.offset((notice_page - 1) * limit).limit(limit)
        notices = notice_query.all()
        logger.info(f"공지사항 조회 결과: {len(notices)}개 항목")
        
        # 서비스 로직: 일반 인수인계 목록 쿼리
        logger.info("일반 인수인계 목록 쿼리 실행 중...")
        handover_query = db.query(Handover).filter(Handover.is_notice == False)
        handover_total = handover_query.count()
        logger.info(f"일반 인수인계 총 개수: {handover_total}개")
        handover_query = handover_query.order_by(Handover.create_at.desc())
    
        # 서비스 로직: 일반 인수인계 페이지네이션
        handover_page = 1 if is_notice else page
        logger.info(f"일반 인수인계 페이지: {handover_page}, 페이지당 항목 수: {limit}")
        handover_query = handover_query.offset((handover_page - 1) * limit).limit(limit)
        handovers = handover_query.all()
        logger.info(f"일반 인수인계 조회 결과: {len(handovers)}개 항목")
        
        # 서비스 로직: 각 항목의 락 상태 확인 및 추가
        logger.info("각 항목의 락 상태 확인 중...")
        for item in notices + handovers:
            lock_status = check_lock_status(db, Handover, item.handover_id, current_user["user_id"])
            setattr(item, "locked_info", lock_status)
        logger.info(f"락 상태 확인 완료: {len(notices) + len(handovers)}개 항목")

        # 응답 준비: is_notice 파라미터가 있으면 해당하는 목록만 반환
        logger.info(f"응답 준비 중: is_notice={is_notice}")
        if is_notice is not None:
            if is_notice:
                response_data = {
                    "success": True,
                    "message": "공지사항 목록 조회 성공",
                    "data": {
                        "items": notices,
                        "total": notice_total,
                        "page": notice_page,
                        "limit": limit,
                    },
                }
                logger.info(f"공지사항 목록 조회 완료: {len(notices)}개 항목 반환")
                return response_data
            else:
                response_data = {
                    "success": True,
                    "message": "인수인계 목록 조회 성공",
                    "data": {
                        "items": handovers,
                        "total": handover_total,
                        "page": handover_page,
                        "limit": limit,
                    },
                }
                logger.info(f"일반 인수인계 목록 조회 완료: {len(handovers)}개 항목 반환")
                return response_data
        
        # 기본: 공지사항과 인수인계 모두 반환
        response_data = {
            "success": True,
            "message": "인수인계/공지사항 목록 조회 성공",
            "data": {
                "notices": {
                    "items": notices,
                    "total": notice_total,
                    "page": 1,
                    "limit": limit,
                },
                "handovers": {
                    "items": handovers,
                    "total": handover_total,
                    "page": 1,
                    "limit": limit,
                },
            },
        }
        logger.info(f"전체 목록 조회 완료: 공지사항 {len(notices)}개, 일반 인수인계 {len(handovers)}개 항목 반환")
        return response_data
    except Exception as e:
        logger.error(f"인수인계 목록 조회 중 오류 발생: {str(e)}")
        # 사용자 친화적 오류 메시지 반환
        return {
            "success": False, 
            "message": "인수인계 목록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            "error_code": "HANDOVER_LIST_ERROR"
        }


@router.post("/", response_model=Dict[str, Any])
async def create_handover(
    handover: HandoverCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    새 인수인계 생성
    """
    # 공지사항인 경우 관리자 권한 체크
    if handover.is_notice and current_user["user_role"] != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="공지사항은 관리자만 작성할 수 있습니다",
        )
    
    now = datetime.now()

    new_handover = Handover(
        title=handover.title,
        content=handover.content,
        update_by=current_user["user_id"],
        is_notice=handover.is_notice,
        create_at=now,
        update_at=now,
    )

    db.add(new_handover)
    db.commit()
    db.refresh(new_handover)

    notice_str = "공지사항" if handover.is_notice else "일반 인수인계"
    logger.info(
        f"{notice_str} 생성: ID {new_handover.handover_id}, 작성자: {current_user['user_id']}"
    )

    return {"success": True, "message": f"{notice_str} 생성 성공", "data": new_handover}


@router.get("/{handover_id}", response_model=Dict[str, Any])
async def get_handover(
    handover_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    특정 인수인계 조회
    """
    handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()

    if not handover:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="인수인계/공지사항을 찾을 수 없습니다"
        )
    
    # 락 상태 확인
    lock_status = check_lock_status(db, Handover, handover_id, current_user["user_id"])

    return {
        "success": True, 
        "message": "인수인계/공지사항 조회 성공", 
        "data": handover,
        "lock_status": lock_status
    }


@router.post("/{handover_id}/lock", response_model=Dict[str, Any])
async def lock_handover(
    handover_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    인수인계 락 획득
    """
    handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()

    if not handover:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="인수인계/공지사항을 찾을 수 없습니다"
        )
    
    # 권한 체크: 공지사항은 관리자만, 일반 인수인계는 본인만 편집 가능
    if handover.is_notice and current_user["user_role"] != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="공지사항은 관리자만 편집할 수 있습니다",
        )
    
    if not handover.is_notice and handover.update_by != current_user["user_id"] and current_user["user_role"] != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인이 작성한 인수인계만 편집할 수 있습니다",
        )
    
    # 락 획득 시도
    lock_acquired = acquire_lock(db, Handover, handover_id, current_user["user_id"])
    
    if not lock_acquired:
        # 현재 락 상태 확인
        lock_status = check_lock_status(db, Handover, handover_id, current_user["user_id"])
        return {
            "success": False,
            "message": lock_status["message"],
            "lock_status": lock_status
        }
    
    return {
        "success": True,
        "message": "인수인계/공지사항 락 획득 성공",
        "lock_status": {"locked": True, "editable": True, "message": "현재 사용자가 편집 중입니다"}
    }


@router.post("/{handover_id}/unlock", response_model=Dict[str, Any])
async def unlock_handover(
    handover_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    인수인계 락 해제
    """
    handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()

    if not handover:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="인수인계/공지사항을 찾을 수 없습니다"
        )
    
    # 락 해제 시도
    lock_released = release_lock(db, Handover, handover_id, current_user["user_id"])
    
    if not lock_released:
        # 현재 락 상태 확인
        lock_status = check_lock_status(db, Handover, handover_id, current_user["user_id"])
        return {
            "success": False,
            "message": "락을 해제할 권한이 없습니다",
            "lock_status": lock_status
        }
    
    return {
        "success": True,
        "message": "인수인계/공지사항 락 해제 성공",
        "lock_status": {"locked": False, "editable": True, "message": "편집 가능합니다"}
    }


@router.put("/{handover_id}", response_model=Dict[str, Any])
async def update_handover(
    handover_id: int,
    handover_update: HandoverCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    인수인계 수정
    """
    # 락 검증
    validate_lock(db, Handover, handover_id, current_user["user_id"])
    
    handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()

    if not handover:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="인수인계/공지사항을 찾을 수 없습니다"
        )
    
    # 권한 체크: 공지사항은 관리자만, 일반 인수인계는 본인만 편집 가능
    if handover.is_notice and current_user["user_role"] != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="공지사항은 관리자만 편집할 수 있습니다",
        )
    
    if not handover.is_notice and handover.update_by != current_user["user_id"] and current_user["user_role"] != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인이 작성한 인수인계만 편집할 수 있습니다",
        )
    
    # 공지사항 여부 변경 시 관리자 권한 체크
    if handover_update.is_notice != handover.is_notice and current_user["user_role"] != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="공지사항 설정은 관리자만 변경할 수 있습니다",
        )
    
    # 필드 업데이트
    handover.title = handover_update.title
    handover.content = handover_update.content
    handover.is_notice = handover_update.is_notice
    handover.update_by = current_user["user_id"]
    handover.update_at = datetime.now()
    
    db.commit()
    db.refresh(handover)
    
    notice_str = "공지사항" if handover.is_notice else "인수인계"
    logger.info(
        f"{notice_str} 수정: ID {handover_id}, 수정자: {current_user['user_id']}"
    )
    
    return {"success": True, "message": f"{notice_str} 수정 성공", "data": handover}


@router.delete("/{handover_id}", response_model=Dict[str, Any])
async def delete_handover(
    handover_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    인수인계 삭제
    권한 제한: 관리자는 모든 항목, 일반 사용자는 본인 작성 항목만 삭제 가능
    """
    # 락 검증
    validate_lock(db, Handover, handover_id, current_user["user_id"])
    
    handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()

    if not handover:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="인수인계를 찾을 수 없습니다"
        )

    # 권한 검사
    if (
        current_user["user_role"] != UserRole.ADMIN
        and handover.update_by != current_user["user_id"]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="본인이 작성한 항목만 삭제할 수 있습니다",
        )
    
    # 공지사항은 관리자만 삭제 가능
    if handover.is_notice and current_user["user_role"] != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="공지사항은 관리자만 삭제할 수 있습니다",
        )

    db.delete(handover)
    db.commit()

    notice_str = "공지사항" if handover.is_notice else "인수인계"
    logger.info(
        f"{notice_str} 삭제: ID {handover_id}, 삭제자: {current_user['user_id']}"
    )

    return {"success": True, "message": f"{notice_str} 삭제 성공"}
