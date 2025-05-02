"""
인수인계 관련 라우터 - 리팩토링 버전
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from urllib.parse import quote
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Query,
    Path,
    status,
    Form,
)
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session
import logging
import json

from main.core.templating import templates
from main.utils.database import get_db, db_transaction
from main.utils.security import get_current_user, get_admin_user
from main.utils.lock import acquire_lock, release_lock, check_lock_status

# 서비스 함수 이름 변경에 따른 임포트 조정
from main.service.handover_service import (
    get_handover_list_paginated,
    get_handover_list_all,
    get_notice_list,
    get_handover_by_id,
    create_handover,
    update_handover,
    delete_handover,
    check_handover_lock_status,  # 이름 변경됨
    _handover_to_dict,  # 내부 변환 함수 임포트
)
from main.utils.json_util import CustomJSONEncoder

# 스키마 임포트 추가
from main.schema.handover_schema import HandoverListResponse

logger = logging.getLogger(__name__)

# 라우터 생성 (페이지 / API 분리)
page_router = APIRouter(prefix="/handover", dependencies=[Depends(get_current_user)])
api_router = APIRouter(prefix="/api/handover", dependencies=[Depends(get_current_user)])

# === 페이지 렌더링 라우트 ===


@page_router.get("/new", name="handover_create_page")
async def handover_create_page(
    request: Request, current_user: Dict[str, Any] = Depends(get_current_user)
):
    logger.info(f"인수인계 생성 페이지 로드: user={current_user.get('user_id')}")
    can_create_notice = current_user.get("user_role") == "ADMIN"
    context = {
        "request": request,
        "current_user": current_user,
        "can_create_notice": can_create_notice,
        "handover": None,
        "is_edit": False,
    }
    return templates.TemplateResponse("handover_form.html", context)


@page_router.get("/", name="handover_list_page")
async def handover_page(
    request: Request,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    logger.info(f"인수인계 목록 페이지 로드: user={current_user.get('user_id')}")
    error_message = request.query_params.get("error")
    success_message = request.query_params.get("success")

    try:
        notices, _ = get_handover_list_paginated(
            db=db, page=1, page_size=5, is_notice=True
        )
        handovers, pagination_info = get_handover_list_paginated(
            db=db, page=page, page_size=page_size, is_notice=False
        )

        # 페이지네이션 정보 키 표준화
        pagination_data = {
            "total_items": pagination_info.get("total_items", 0),
            "total_pages": pagination_info.get("total_pages", 0),
            "current_page": pagination_info.get("current_page", 1),
            "page_size": pagination_info.get("page_size", page_size),
        }

        initial_data_obj = {
            "handovers": handovers,
            "pagination": pagination_data,
            "notices": notices,
            "current_user": current_user,
            "error_message": error_message,
            "success_message": success_message,
        }

        context = {
            "request": request,
            "initial_data_json": json.dumps(initial_data_obj, cls=CustomJSONEncoder),
            "current_user": current_user,
            "notices": notices,
            "handovers": handovers,
            "pagination": pagination_data,
            "error_message": error_message,
            "success_message": success_message,
        }
        return templates.TemplateResponse("handover.html", context)

    except Exception as e:
        logger.error(f"인수인계 페이지 로드 오류: {e}", exc_info=True)
        context = {
            "request": request,
            "error_message": "페이지 로드 중 오류 발생",
            "current_user": current_user,
        }
        return templates.TemplateResponse("error.html", context, status_code=500)


@page_router.get("/{handover_id}", name="handover_detail_page")
async def get_handover_detail_page(
    request: Request,
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    logger.info(
        f"인수인계 상세 페이지 로드: id={handover_id}, user={current_user.get('user_id')}"
    )
    error_message = request.query_params.get("error")
    success_message = request.query_params.get("success")

    try:
        handover_model = get_handover_by_id(db, handover_id)
        if not handover_model:
            raise HTTPException(status_code=404, detail="인수인계를 찾을 수 없습니다.")

        handover_data = _handover_to_dict(handover_model)  # 모델 -> 딕셔너리 변환
        lock_info = check_handover_lock_status(
            db, handover_id, current_user.get("user_id")
        )

        # 라벨 정보 추가
        type_labels = {"NOTICE": "공지", "HANDOVER": "인수인계"}
        handover_data["type_label"] = type_labels.get(
            "NOTICE" if handover_data["is_notice"] else "HANDOVER"
        )

        context = {
            "request": request,
            "handover": handover_data,
            "lock_info": lock_info,
            "current_user": current_user,
            "error_message": error_message,
            "success_message": success_message,
        }
        return templates.TemplateResponse("handover_detail.html", context)

    except HTTPException as http_exc:
        logger.warning(
            f"인수인계 상세 로드 오류 (HTTP): {http_exc.status_code}, {http_exc.detail}"
        )
        error_message_redirect = quote(http_exc.detail)
        return RedirectResponse(
            f"/handover?error={error_message_redirect}",
            status_code=status.HTTP_303_SEE_OTHER,
        )
    except Exception as e:
        logger.error(f"인수인계 상세 페이지 로드 오류: {e}", exc_info=True)
        error_message_redirect = quote("상세 정보 로드 중 오류 발생")
        return RedirectResponse(
            f"/handover?error={error_message_redirect}",
            status_code=status.HTTP_303_SEE_OTHER,
        )


@page_router.get("/{handover_id}/edit", name="handover_edit_page")
async def handover_edit_page(
    request: Request,
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    logger.info(
        f"인수인계 수정 페이지 로드: id={handover_id}, user={current_user.get('user_id')}"
    )
    try:
        handover_model = get_handover_by_id(db, handover_id)
        if not handover_model:
            raise HTTPException(
                status_code=404, detail="수정할 인수인계를 찾을 수 없습니다."
            )

        lock_info = check_handover_lock_status(
            db, handover_id, current_user.get("user_id")
        )
        if not lock_info.get("editable", False):
            locked_by = lock_info.get("locked_by", "다른 사용자")
            error_message = f"{locked_by}님이 현재 수정 중입니다."
            detail_url = request.url_for(
                "handover_detail_page", handover_id=handover_id
            )
            return RedirectResponse(
                f"{detail_url}?error={quote(error_message)}",
                status_code=status.HTTP_303_SEE_OTHER,
            )

        handover_data = _handover_to_dict(handover_model)
        can_create_notice = current_user.get("user_role") == "ADMIN"
        context = {
            "request": request,
            "handover": handover_data,
            "current_user": current_user,
            "is_edit": True,
            "can_create_notice": can_create_notice,
        }
        return templates.TemplateResponse("handover_form.html", context)

    except HTTPException as http_exc:
        logger.warning(
            f"인수인계 수정 페이지 로드 오류 (HTTP): {http_exc.status_code}, {http_exc.detail}"
        )
        error_message_redirect = quote(http_exc.detail)
        return RedirectResponse(
            f"/handover?error={error_message_redirect}",
            status_code=status.HTTP_303_SEE_OTHER,
        )
    except Exception as e:
        logger.error(f"인수인계 수정 페이지 로드 오류: {e}", exc_info=True)
        error_message_redirect = quote("페이지 로드 중 오류 발생")
        return RedirectResponse(
            f"/handover?error={error_message_redirect}",
            status_code=status.HTTP_303_SEE_OTHER,
        )


# === API 엔드포인트 라우트 ===


@api_router.get("/list", response_model=HandoverListResponse)  # 응답 모델 사용
async def get_handover_list_api(
    db: Session = Depends(get_db),
    is_notice: Optional[bool] = Query(False, description="True: 공지, False: 인수인계"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    logger.info(
        f"인수인계 목록 API 호출: notice={is_notice}, user={current_user.get('user_id')}"
    )
    try:
        all_items = get_handover_list_all(db=db, is_notice=is_notice)
        # HandoverListResponse 스키마에 맞게 반환
        return HandoverListResponse(
            success=True, message="목록 조회 성공", data=all_items
        )
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"인수인계 목록 API 오류: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="목록 조회 중 오류 발생")


@api_router.post("", status_code=status.HTTP_302_FOUND)
@db_transaction  # 트랜잭션 관리
async def create_handover_action(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    # Form 필드 snake_case
    title: str = Form(...),
    content: str = Form(...),
    is_notice: Optional[bool] = Form(False),  # 체크박스는 값 없을 때 False
):
    user_id = current_user.get("user_id")
    logger.info(f"인수인계 생성 API 요청: user={user_id}, title='{title}'")

    create_url = request.url_for("handover_create_page")
    list_url = request.url_for("handover_list_page")

    try:
        if is_notice and current_user.get("user_role") != "ADMIN":
            raise HTTPException(
                status_code=403, detail="공지사항 생성 권한이 없습니다."
            )

        # HandoverCreate 스키마 사용은 선택적 (여기서는 직접 전달)
        new_handover = create_handover(
            db=db,
            title=title,
            content=content,
            is_notice=is_notice,
            writer_id=user_id,
        )
        success_message = quote("인수인계가 성공적으로 생성되었습니다.")
        detail_url = request.url_for(
            "handover_detail_page", handover_id=new_handover.handover_id
        )
        return RedirectResponse(
            f"{detail_url}?success={success_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    except HTTPException as http_exc:
        logger.warning(f"인수인계 생성 실패 (HTTPException): {http_exc.detail}")
        error_message = quote(http_exc.detail)
        return RedirectResponse(
            f"{create_url}?error={error_message}", status_code=status.HTTP_303_SEE_OTHER
        )
    except Exception as e:
        logger.error(f"인수인계 생성 API 오류: {e}", exc_info=True)
        error_message = quote("인수인계 생성 중 서버 오류 발생")
        return RedirectResponse(
            f"{create_url}?error={error_message}", status_code=status.HTTP_303_SEE_OTHER
        )


@api_router.post("/{handover_id}", status_code=status.HTTP_302_FOUND)
@db_transaction
async def update_handover_action(
    request: Request,
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    # Form 필드 snake_case
    title: str = Form(...),
    content: str = Form(...),
    is_notice: Optional[bool] = Form(False),
):
    user_id = current_user.get("user_id")
    user_role = current_user.get("user_role")
    logger.info(f"인수인계 수정 API 요청: id={handover_id}, user={user_id}")

    detail_url = request.url_for("handover_detail_page", handover_id=handover_id)
    edit_url = request.url_for("handover_edit_page", handover_id=handover_id)

    # 락 획득 (서비스에서 분리)
    lock_acquired = False
    try:
        lock_success, lock_info = acquire_lock(db, "handover", handover_id, user_id)
        if not lock_success:
            raise HTTPException(
                status_code=423,
                detail=lock_info.get("message", "다른 사용자가 편집 중"),
            )
        lock_acquired = True

        # 권한 확인 (공지사항 변경)
        original_handover = get_handover_by_id(db, handover_id)
        if not original_handover:
            raise HTTPException(status_code=404, detail="인수인계를 찾을 수 없습니다.")
        if is_notice and not original_handover.is_notice and user_role != "ADMIN":
            raise HTTPException(
                status_code=403, detail="공지사항 설정 권한이 없습니다."
            )

        # 서비스 호출 (HandoverUpdate 스키마 사용은 선택적)
        updated_handover = update_handover(
            db=db,
            handover_id=handover_id,
            title=title,
            content=content,
            is_notice=is_notice,
            updated_by=user_id,
        )
        success_message = quote("인수인계 정보가 성공적으로 수정되었습니다.")
        return RedirectResponse(
            f"{detail_url}?success={success_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    except HTTPException as http_exc:
        logger.warning(
            f"인수인계 수정 실패 (HTTPException): id={handover_id}, {http_exc.detail}"
        )
        error_message = quote(http_exc.detail)
        # 423 (Locked) 등 특정 오류는 상세 페이지로, 나머지는 수정 페이지로
        redirect_url = detail_url if http_exc.status_code == 423 else edit_url
        return RedirectResponse(
            f"{redirect_url}?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )
    except Exception as e:
        logger.error(f"인수인계 수정 API 오류: {e}", exc_info=True)
        error_message = quote("인수인계 수정 중 서버 오류 발생")
        return RedirectResponse(
            f"{edit_url}?error={error_message}", status_code=status.HTTP_303_SEE_OTHER
        )
    finally:
        if lock_acquired:
            try:
                release_lock(db, "handover", handover_id, user_id)
            except Exception as lock_err:
                logger.error(f"인수인계 수정 락 해제 실패: {lock_err}")


@api_router.post("/{handover_id}/delete", status_code=status.HTTP_302_FOUND)
@db_transaction
async def delete_handover_action(
    request: Request,
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("user_id")
    user_role = current_user.get("user_role")
    logger.info(f"인수인계 삭제 API 요청: id={handover_id}, user={user_id}")

    detail_url = request.url_for("handover_detail_page", handover_id=handover_id)
    list_url = request.url_for("handover_list_page")

    lock_acquired = False
    try:
        # 락 획득
        lock_success, lock_info = acquire_lock(db, "handover", handover_id, user_id)
        if not lock_success:
            raise HTTPException(
                status_code=423,
                detail=lock_info.get("message", "다른 사용자가 편집 중"),
            )
        lock_acquired = True

        # 권한 확인
        handover = get_handover_by_id(db, handover_id)
        if not handover:
            raise HTTPException(
                status_code=404, detail="삭제할 인수인계를 찾을 수 없습니다."
            )
        # 모델의 create_by 필드 사용 (init-db.sql 에 맞게)
        is_author = handover.create_by == user_id
        if not (user_role == "ADMIN" or is_author):
            raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

        # 서비스 호출
        success = delete_handover(db=db, handover_id=handover_id, user_id=user_id)
        if success:
            success_message = quote("인수인계가 성공적으로 삭제되었습니다.")
            return RedirectResponse(
                f"{list_url}?success={success_message}",
                status_code=status.HTTP_303_SEE_OTHER,
            )
        else:
            # 서비스에서 False 반환 시 (이론상 발생 어려움)
            raise HTTPException(
                status_code=500, detail="인수인계 삭제 처리 중 오류 발생"
            )

    except HTTPException as http_exc:
        logger.warning(
            f"인수인계 삭제 실패 (HTTPException): id={handover_id}, {http_exc.detail}"
        )
        error_message = quote(http_exc.detail)
        # 403, 404, 423 등은 상세 페이지로 리다이렉트
        return RedirectResponse(
            f"{detail_url}?error={error_message}", status_code=status.HTTP_303_SEE_OTHER
        )
    except Exception as e:
        logger.error(f"인수인계 삭제 API 오류: {e}", exc_info=True)
        error_message = quote("인수인계 삭제 중 서버 오류 발생")
        return RedirectResponse(
            f"{detail_url}?error={error_message}", status_code=status.HTTP_303_SEE_OTHER
        )
    finally:
        if lock_acquired:
            try:
                release_lock(db, "handover", handover_id, user_id)
            except Exception as lock_err:
                logger.error(f"인수인계 삭제 락 해제 실패: {lock_err}")


@api_router.get("/lock/{handover_id}", response_model=Dict)
async def check_handover_lock_api(
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    logger.info(
        f"인수인계 락 상태 확인 API: id={handover_id}, user={current_user.get('user_id')}"
    )
    try:
        return check_handover_lock_status(db, handover_id, current_user.get("user_id"))
    except Exception as e:
        logger.error(f"락 상태 확인 API 오류: {e}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "락 상태 확인 중 오류 발생"},
        )
