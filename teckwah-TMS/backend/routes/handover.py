"""
인수인계 관련 라우터
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query, Path, Body
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime

from backend.database import get_db
from backend.services.handover_service import HandoverService
from backend.schemas.handover import (
    HandoverCreate, 
    HandoverUpdate, 
    HandoverResponse, 
    HandoverList
)
from backend.schemas.common import SuccessResponse, ErrorResponse, PaginationParams
from backend.schemas.dashboard import LockResponse
from backend.utils.security import get_current_user, get_admin_user
from backend.utils.logger import logger

router = APIRouter()


@router.get("/{handover_id}", response_model=SuccessResponse)
async def get_handover(
    handover_id: int = Path(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    인수인계 상세 정보 조회
    - handover_id: 인수인계 ID
    """
    try:
        # 인증된 사용자 정보 가져오기
        user_data = get_current_user(request)
        user_id = user_data.get("user_id")
        
        # 인수인계 조회
        handover = HandoverService.get_handover(db, handover_id, user_id)
        
        if not handover:
            return ErrorResponse(
                success=False,
                message="인수인계를 찾을 수 없습니다"
            ).model_dump()
        
        # 응답 데이터
        return SuccessResponse(
            success=True,
            message="인수인계 조회 성공",
            data=handover
        ).model_dump()
        
    except HTTPException as e:
        return ErrorResponse(
            success=False,
            message=e.detail
        ).model_dump()
    except Exception as e:
        logger.error(f"인수인계 조회 중 오류: {str(e)}")
        return ErrorResponse(
            success=False,
            message="인수인계 조회 중 오류가 발생했습니다"
        ).model_dump()


@router.get("/list", response_model=HandoverList)
async def get_handovers(
    request: Request = None,
    is_notice: Optional[bool] = Query(None, alias="isNotice"),
    page: Optional[int] = Query(1, ge=1),
    limit: Optional[int] = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    인수인계 목록 조회
    - page: 페이지 번호 (기본값: 1)
    - limit: 페이지당 항목 수 (기본값: 10)
    - is_notice: 공지사항 여부로 필터링
    """
    try:
        # 인증된 사용자 정보 가져오기
        user_data = get_current_user(request)
        
        # 페이지네이션 계산
        skip = (page - 1) * limit
        
        # 인수인계 목록 조회
        handovers, total, notices = HandoverService.get_handovers(
            db,
            skip=skip,
            limit=limit,
            is_notice=is_notice
        )
        
        # 응답 데이터
        return {
            "success": True,
            "message": "인수인계 목록 조회 성공",
            "data": {
                "items": handovers,
                "total": total,
                "page": page,
                "limit": limit,
                "notices": notices
            }
        }
        
    except HTTPException as e:
        return {
            "success": False,
            "message": e.detail
        }
    except Exception as e:
        logger.error(f"인수인계 목록 조회 중 오류: {str(e)}")
        return {
            "success": False,
            "message": "인수인계 목록 조회 중 오류가 발생했습니다"
        }


@router.post("", response_model=SuccessResponse)
async def create_handover(
    handover_data: HandoverCreate,
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    새 인수인계 생성
    """
    try:
        # 인증된 사용자 정보 가져오기
        user_data = get_current_user(request)
        user_id = user_data.get("user_id")
        user_role = user_data.get("user_role")
        
        # 일반 사용자가 공지사항을 생성하려는 경우 권한 체크
        if handover_data.is_notice and user_role != "ADMIN":
            return ErrorResponse(
                success=False,
                message="공지사항 등록 권한이 없습니다"
            ).model_dump()
        
        # 인수인계 생성
        new_handover = HandoverService.create_handover(db, handover_data, user_id)
        
        # 응답 데이터
        return SuccessResponse(
            success=True,
            message="인수인계 생성 성공",
            data=HandoverResponse.model_validate(new_handover).model_dump()
        ).model_dump()
        
    except HTTPException as e:
        return ErrorResponse(
            success=False,
            message=e.detail
        ).model_dump()
    except Exception as e:
        logger.error(f"인수인계 생성 중 오류: {str(e)}")
        return ErrorResponse(
            success=False,
            message=f"인수인계 생성 중 오류가 발생했습니다: {str(e)}"
        ).model_dump()


@router.put("/{handover_id}", response_model=SuccessResponse)
async def update_handover(
    handover_data: HandoverUpdate,
    handover_id: int = Path(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    인수인계 정보 수정
    - handover_id: 인수인계 ID
    """
    try:
        # 인증된 사용자 정보 가져오기
        user_data = get_current_user(request)
        user_id = user_data.get("user_id")
        user_role = user_data.get("user_role")
        
        # 현재 인수인계 정보 확인
        current_handover = HandoverService.get_handover(db, handover_id, user_id)
        if not current_handover:
            return ErrorResponse(
                success=False,
                message="인수인계를 찾을 수 없습니다"
            ).model_dump()
        
        # 관리자가 아니고 작성자도 아닌 경우 권한 체크
        if user_role != "ADMIN" and current_handover.get("update_by") != user_id:
            return ErrorResponse(
                success=False,
                message="이 인수인계를 수정할 권한이 없습니다"
            ).model_dump()
        
        # 일반 사용자가 공지사항으로 변경하려는 경우 권한 체크
        if handover_data.is_notice is True and user_role != "ADMIN" and not current_handover.get("is_notice"):
            return ErrorResponse(
                success=False,
                message="공지사항 등록 권한이 없습니다"
            ).model_dump()
        
        # 인수인계 수정
        updated_handover = HandoverService.update_handover(db, handover_id, handover_data, user_id)
        
        # 응답 데이터
        return SuccessResponse(
            success=True,
            message="인수인계 정보 수정 성공",
            data=HandoverResponse.model_validate(updated_handover).model_dump()
        ).model_dump()
        
    except ValueError as e:
        return ErrorResponse(
            success=False,
            message=str(e)
        ).model_dump()
    except HTTPException as e:
        return ErrorResponse(
            success=False,
            message=e.detail
        ).model_dump()
    except Exception as e:
        logger.error(f"인수인계 수정 중 오류: {str(e)}")
        return ErrorResponse(
            success=False,
            message="인수인계 수정 중 오류가 발생했습니다"
        ).model_dump()


@router.delete("/{handover_id}", response_model=SuccessResponse)
async def delete_handover(
    handover_id: int = Path(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    인수인계 삭제 (관리자 전용)
    - handover_id: 인수인계 ID
    """
    try:
        # 관리자 권한 확인
        user_data = get_admin_user(get_current_user(request))
        user_id = user_data.get("user_id")
        
        # 인수인계 삭제
        success = HandoverService.delete_handover(db, handover_id, user_id)
        
        if not success:
            return ErrorResponse(
                success=False,
                message="인수인계를 찾을 수 없습니다"
            ).model_dump()
        
        # 응답 데이터
        return SuccessResponse(
            success=True,
            message="인수인계 삭제 성공"
        ).model_dump()
        
    except ValueError as e:
        return ErrorResponse(
            success=False,
            message=str(e)
        ).model_dump()
    except HTTPException as e:
        return ErrorResponse(
            success=False,
            message=e.detail
        ).model_dump()
    except Exception as e:
        logger.error(f"인수인계 삭제 중 오류: {str(e)}")
        return ErrorResponse(
            success=False,
            message="인수인계 삭제 중 오류가 발생했습니다"
        ).model_dump()


@router.post("/{handover_id}/lock", response_model=LockResponse)
async def lock_handover(
    handover_id: int = Path(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    인수인계 락 획득
    - handover_id: 인수인계 ID
    """
    try:
        # 인증된 사용자 정보 가져오기
        user_data = get_current_user(request)
        user_id = user_data.get("user_id")
        user_role = user_data.get("user_role")
        
        # 현재 인수인계 정보 확인 (관리자가 아니면 본인 작성글만 락 획득 가능)
        if user_role != "ADMIN":
            current_handover = HandoverService.get_handover(db, handover_id, user_id)
            if not current_handover:
                return {
                    "success": False,
                    "message": "인수인계를 찾을 수 없습니다"
                }
            
            if current_handover.get("update_by") != user_id:
                return {
                    "success": False,
                    "message": "이 인수인계를 수정할 권한이 없습니다",
                    "lockStatus": {
                        "editable": False
                    }
                }
        
        # 인수인계 락 획득
        lock_result = HandoverService.lock_handover(db, handover_id, user_id)
        
        # 응답 데이터
        return lock_result
        
    except HTTPException as e:
        return {
            "success": False,
            "message": e.detail
        }
    except Exception as e:
        logger.error(f"인수인계 락 획득 중 오류: {str(e)}")
        return {
            "success": False,
            "message": "인수인계 락 획득 중 오류가 발생했습니다"
        }


@router.post("/{handover_id}/unlock", response_model=SuccessResponse)
async def unlock_handover(
    handover_id: int = Path(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    인수인계 락 해제
    - handover_id: 인수인계 ID
    """
    try:
        # 인증된 사용자 정보 가져오기
        user_data = get_current_user(request)
        user_id = user_data.get("user_id")
        
        # 인수인계 락 해제
        unlock_result = HandoverService.unlock_handover(db, handover_id, user_id)
        
        # 응답 데이터
        return SuccessResponse(
            success=unlock_result.get("success", False),
            message=unlock_result.get("message", "락 해제 결과")
        ).model_dump()
        
    except HTTPException as e:
        return ErrorResponse(
            success=False,
            message=e.detail
        ).model_dump()
    except Exception as e:
        logger.error(f"인수인계 락 해제 중 오류: {str(e)}")
        return ErrorResponse(
            success=False,
            message="인수인계 락 해제 중 오류가 발생했습니다"
        ).model_dump()
