"""
인수인계 관련 라우트 - 서비스 레이어 패턴 적용
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from backend.utils.logger import logger
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

from backend.database import get_db
from backend.models.handover import (
    Handover,  # SQLAlchemy 모델
    HandoverCreate,
    HandoverUpdate,
    HandoverResponse,  # 추가
    HandoverListResponse,  # 추가
    GetHandoverResponse,  # 추가
    GetHandoverResponseData,  # 추가
)
from backend.models.dashboard import (
    LockResponse,
    BasicSuccessResponse,
)  # Dashboard 모델 재사용
from backend.middleware.auth import get_current_user, admin_required
from backend.models.user import UserRole
from backend.utils.lock import (
    acquire_lock,
    release_lock,
    validate_lock,
    check_lock_status,
)
from backend.services.handover_service import (
    get_handovers as service_get_handovers,
    get_handover as service_get_handover,
    create_handover as service_create_handover,
    update_handover as service_update_handover,
    delete_handover as service_delete_handover,
)

router = APIRouter()


@router.get("/", response_model=HandoverListResponse)
async def get_handovers(
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(10, ge=1, le=100, description="페이지당 항목 수"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HandoverListResponse:
    """
    인수인계 목록 조회 (response_model 사용) + 디버깅 로그 추가
    """
    logger.api(
        f"인수인계 목록 조회 - 사용자: {current_user['user_id']}, 페이지: {page}"
    )
    # 서비스가 HandoverListResponse 객체를 반환한다고 가정
    response_obj = service_get_handovers(
        db=db, page=page, limit=limit, current_user_id=current_user["user_id"]
    )

    # --- 서비스 반환 객체 로깅 ---
    logger.debug(f"서비스 get_handovers 반환 객체 타입: {type(response_obj)}")
    if isinstance(response_obj, HandoverListResponse) and response_obj.data:
        logger.debug(
            f"  Data: Items={len(response_obj.data.items)}, Notices={len(response_obj.data.notices)}, Total={response_obj.data.total}"
        )
    else:
        logger.warning(
            f"서비스 반환 객체가 HandoverListResponse가 아니거나 data가 비어있음: {response_obj}"
        )
    # ---------------------------

    # FastAPI가 response_model 기준으로 검증 후 반환
    try:
        return response_obj
    except Exception as e:
        logger.error(f"HandoverListResponse 검증/처리 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="인수인계 목록 응답 처리 중 오류 발생"
        )


@router.get("/{handover_id}", response_model=GetHandoverResponse)
async def get_handover(
    handover_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GetHandoverResponse:
    """
    특정 인수인계 조회 (response_model 사용) + 디버깅 로그 추가
    """
    logger.api(
        f"인수인계 상세 조회 - ID: {handover_id}, 사용자: {current_user['user_id']}"
    )
    # 서비스가 딕셔너리를 반환한다고 가정
    response_dict = service_get_handover(
        db=db, handover_id=handover_id, current_user_id=current_user["user_id"]
    )

    # --- 서비스 반환 딕셔너리 로깅 ---
    logger.debug(f"서비스 get_handover 반환 딕셔너리: {response_dict}")
    # --------------------------------

    if not response_dict.get("success", False):
        error_code = response_dict.get("error_code")
        detail = response_dict.get("message", "조회 중 오류 발생")
        status_code = (
            status.HTTP_404_NOT_FOUND
            if error_code == "NOT_FOUND"
            else status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        logger.error(f"인수인계 조회 서비스 오류: code={error_code}, detail={detail}")
        raise HTTPException(status_code=status_code, detail=detail)

    # --- Pydantic 모델 변환 전 데이터 로깅 ---
    handover_data_dict = response_dict.get("data", {})
    logger.debug(f"GetHandoverResponseData 생성을 위한 data 부분: {handover_data_dict}")
    # --------------------------------------

    try:
        # GetHandoverResponse 모델 생성
        final_response = GetHandoverResponse(
            success=response_dict["success"],
            message=response_dict["message"],
            data=GetHandoverResponseData(**handover_data_dict),  # data 부분 언패킹
        )
        # --- 최종 응답 객체 로깅 ---
        logger.debug(
            f"생성된 GetHandoverResponse: success={final_response.success}, message={final_response.message}, handover_id={getattr(final_response.data, 'handover_id', 'N/A')}"
        )
        # -------------------------
        return final_response
    except Exception as e:
        logger.error(
            f"GetHandoverResponse 생성 실패 (ID: {handover_id}): {e}", exc_info=True
        )
        logger.error(f"실패 당시 response_dict: {response_dict}")
        raise HTTPException(
            status_code=500, detail=f"인수인계 상세 응답 생성 중 오류 발생: {e}"
        )


@router.post("/", response_model=HandoverResponse)
async def create_handover(
    handover: HandoverCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HandoverResponse:  # 반환 타입 수정
    """
    새 인수인계 생성 (response_model 사용) + 디버깅 로그 추가
    """
    logger.api(
        f"인수인계 생성 - 사용자: {current_user['user_id']}, 공지여부: {handover.is_notice}"
    )
    response_dict = service_create_handover(
        db=db,
        handover_data=handover.dict(by_alias=True),
        current_user_id=current_user["user_id"],
        current_user_role=current_user["user_role"],
    )
    if not response_dict["success"]:
        if response_dict["error_code"] == "PERMISSION_DENIED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=response_dict["message"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="생성 중 오류 발생",
            )

    # --- 서비스 반환 데이터 로깅 ---
    created_handover_data = response_dict.get(
        "data"
    )  # 서비스가 Handover 객체 또는 Dict 반환 가정
    logger.debug(
        f"서비스 create_handover 반환 데이터 타입: {type(created_handover_data)}"
    )
    logger.debug(
        f"  Data (일부): ID={getattr(created_handover_data, 'handover_id', 'N/A')}, Title={getattr(created_handover_data, 'title', 'N/A')}"
    )
    # -----------------------------

    try:
        # 서비스가 SQLAlchemy 객체를 반환하면 FastAPI가 자동 변환
        if isinstance(created_handover_data, Handover):
            logger.debug(
                "SQLAlchemy 객체 반환. FastAPI가 HandoverResponse로 자동 변환 시도."
            )
            return created_handover_data
        # 서비스가 Dict를 반환하면 명시적 변환
        elif isinstance(created_handover_data, dict):
            logger.debug("Dict 객체 반환. HandoverResponse로 변환 시도.")
            return HandoverResponse(**created_handover_data)
        else:
            logger.error("서비스 create_handover에서 예기치 않은 타입 반환")
            raise HTTPException(status_code=500, detail="인수인계 생성 응답 처리 오류")

    except Exception as e:
        logger.error(f"HandoverResponse 변환/검증 실패: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="인수인계 생성 응답 처리 중 오류 발생"
        )


@router.put("/{handover_id}", response_model=HandoverResponse)
async def update_handover(
    handover_id: int,
    handover_update: HandoverUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HandoverResponse:  # 반환 타입 수정
    """
    인수인계 수정 (response_model 사용) + 디버깅 로그 추가
    """
    validate_lock(db, "handover", handover_id, current_user["user_id"])
    logger.api(f"인수인계 수정 - ID: {handover_id}, 사용자: {current_user['user_id']}")
    response_dict = service_update_handover(
        db=db,
        handover_id=handover_id,
        handover_data=handover_update.dict(exclude_unset=True, by_alias=True),
        current_user_id=current_user["user_id"],
        current_user_role=current_user["user_role"],
    )
    if not response_dict["success"]:
        if response_dict["error_code"] == "NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=response_dict["message"]
            )
        elif response_dict["error_code"] == "PERMISSION_DENIED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=response_dict["message"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="수정 중 오류 발생",
            )

    # --- 서비스 반환 데이터 로깅 ---
    updated_handover_data = response_dict.get("data")
    logger.debug(
        f"서비스 update_handover 반환 데이터 타입: {type(updated_handover_data)}"
    )
    logger.debug(
        f"  Data (일부): ID={getattr(updated_handover_data, 'handover_id', 'N/A')}, Title={getattr(updated_handover_data, 'title', 'N/A')}"
    )
    # -----------------------------

    try:
        if isinstance(updated_handover_data, Handover):
            logger.debug(
                "SQLAlchemy 객체 반환. FastAPI가 HandoverResponse로 자동 변환 시도."
            )
            return updated_handover_data
        elif isinstance(updated_handover_data, dict):
            logger.debug("Dict 객체 반환. HandoverResponse로 변환 시도.")
            return HandoverResponse(**updated_handover_data)
        else:
            logger.error("서비스 update_handover에서 예기치 않은 타입 반환")
            raise HTTPException(status_code=500, detail="인수인계 수정 응답 처리 오류")

    except Exception as e:
        logger.error(
            f"HandoverResponse 변환/검증 실패 (ID: {handover_id}): {e}", exc_info=True
        )
        raise HTTPException(
            status_code=500, detail="인수인계 수정 응답 처리 중 오류 발생"
        )


@router.delete("/{handover_id}", response_model=BasicSuccessResponse)
async def delete_handover(
    handover_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BasicSuccessResponse:
    """
    인수인계 삭제 (response_model 사용)
    """
    validate_lock(db, "handover", handover_id, current_user["user_id"])
    logger.api(f"인수인계 삭제 - ID: {handover_id}, 사용자: {current_user['user_id']}")
    response_dict = service_delete_handover(
        db=db,
        handover_id=handover_id,
        current_user_id=current_user["user_id"],
        current_user_role=current_user["user_role"],
    )
    if not response_dict["success"]:
        if response_dict["error_code"] == "NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=response_dict["message"]
            )
        elif response_dict["error_code"] == "PERMISSION_DENIED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=response_dict["message"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="삭제 중 오류 발생",
            )

    return BasicSuccessResponse(message=response_dict["message"])


@router.post("/{handover_id}/lock", response_model=LockResponse)
async def lock_handover(
    handover_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LockResponse:
    """
    인수인계 락 획득 (response_model 사용)
    """
    logger.api(
        f"인수인계 락 획득 - ID: {handover_id}, 사용자: {current_user['user_id']}"
    )

    handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()
    if not handover:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="항목을 찾을 수 없습니다"
        )

    if handover.is_notice and current_user["user_role"] != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="공지사항은 관리자만 편집 가능",
        )
    if (
        not handover.is_notice
        and handover.update_by != current_user["user_id"]
        and current_user["user_role"] != UserRole.ADMIN
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="본인 작성 항목만 편집 가능"
        )

    lock_acquired = acquire_lock(db, "handover", handover_id, current_user["user_id"])
    if not lock_acquired:
        lock_status_data = check_lock_status(
            db, "handover", handover_id, current_user["user_id"]
        )
        return LockResponse(
            success=False,
            message=lock_status_data["message"],
            lock_status=lock_status_data,
        )

    return LockResponse(
        success=True,
        message="인수인계/공지사항 락 획득 성공",
        lock_status={
            "locked": True,
            "editable": True,
            "message": "현재 사용자가 편집 중입니다",
        },
    )


@router.post("/{handover_id}/unlock", response_model=LockResponse)
async def unlock_handover(
    handover_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LockResponse:
    """
    인수인계 락 해제 (response_model 사용)
    """
    logger.api(
        f"인수인계 락 해제 - ID: {handover_id}, 사용자: {current_user['user_id']}"
    )

    handover = db.query(Handover).filter(Handover.handover_id == handover_id).first()
    if not handover:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="항목을 찾을 수 없습니다"
        )

    lock_released = release_lock(db, "handover", handover_id, current_user["user_id"])
    if not lock_released:
        lock_status_data = check_lock_status(
            db, "handover", handover_id, current_user["user_id"]
        )
        return LockResponse(
            success=False,
            message="락을 해제할 권한이 없습니다",
            lock_status=lock_status_data,
        )

    return LockResponse(
        success=True,
        message="인수인계/공지사항 락 해제 성공",
        lock_status={"locked": False, "editable": True, "message": "편집 가능합니다"},
    )
