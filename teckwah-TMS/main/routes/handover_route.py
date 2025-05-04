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
from main.schema.handover_schema import HandoverListResponse, HandoverCreate

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
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    logger.info(f"인수인계 목록 페이지 로드: user={current_user.get('user_id')}")
    error_message = request.query_params.get("error")
    success_message = request.query_params.get("success")

    try:
        context = {
            "request": request,
            "current_user": current_user,
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
@db_transaction  # DB 조회 필요
async def handover_edit_page(
    request: Request,
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("user_id")
    logger.info(f"인수인계 수정 페이지 요청: id={handover_id}, user={user_id}")
    detail_url = request.url_for("handover_detail_page", handover_id=handover_id)

    try:
        # 인수인계 정보 로드
        handover_model = get_handover_by_id(db, handover_id)
        if not handover_model:
            error_message = quote("수정할 인수인계를 찾을 수 없습니다.")
            return RedirectResponse(
                f"/handover?error={error_message}",
                status_code=status.HTTP_303_SEE_OTHER,
            )

        # 권한 확인: 작성자 또는 ADMIN만 수정 가능
        if (
            handover_model.create_by != user_id
            and current_user.get("user_role") != "ADMIN"
        ):
            error_message = quote("이 인수인계를 수정할 권한이 없습니다.")
            return RedirectResponse(
                f"{detail_url}?error={error_message}",
                status_code=status.HTTP_303_SEE_OTHER,
            )

        # 락 획득 시도
        lock_acquired, lock_info = acquire_lock(db, "handover", handover_id, user_id)

        if not lock_acquired:
            # 락 획득 실패 시 상세 페이지로 리다이렉트
            error_message = quote(
                lock_info.get("message", "현재 다른 사용자가 수정 중입니다")
            )
            return RedirectResponse(
                f"{detail_url}?error={error_message}",
                status_code=status.HTTP_303_SEE_OTHER,
            )

        # 락 획득 성공 시 수정 페이지 렌더링
        logger.info(
            f"인수인계 수정 페이지 락 획득 성공: id={handover_id}, user={user_id}"
        )

        # 인수인계 데이터
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

    except Exception as e:
        logger.error(f"인수인계 수정 페이지 로드 중 오류: {str(e)}", exc_info=True)
        error_message = quote("페이지 로드 중 오류가 발생했습니다.")
        return RedirectResponse(
            f"{detail_url}?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )


# === API 엔드포인트 라우트 ===


@api_router.get("/list", response_model=HandoverListResponse)
async def get_handover_list_api(
    db: Session = Depends(get_db),
    is_notice: Optional[bool] = Query(
        None,
        description="null: 전체, True: 공지, False: 인수인계",
    ),
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
    is_notice: str = Form("false"),  # 폼에서 체크박스 값을 "true"/"false" 문자열로 처리
):
    user_id = current_user.get("user_id")
    logger.info(f"인수인계 생성 API 요청: user={user_id}, title='{title}'")

    try:
        # 문자열 "true"/"false"를 불리언으로 변환
        is_notice_bool = is_notice.lower() == "true"

        # 관리자가 아니면 공지사항 생성 불가
        if is_notice_bool and current_user.get("user_role") != "ADMIN":
            raise HTTPException(
                status_code=403, detail="관리자만 공지사항을 생성할 수 있습니다."
            )

        handover_data = HandoverCreate(
            title=title,
            content=content,
            is_notice=is_notice_bool,
            created_by=user_id,
        )

        new_handover = create_handover(
            db=db,
            title=title,
            content=content,
            is_notice=is_notice_bool,
            writer_id=user_id,
        )
        success_message = quote("인수인계가 성공적으로 생성되었습니다.")
        return RedirectResponse(
            f"/handover/{new_handover.handover_id}?success={success_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    except HTTPException as http_exc:
        # 권한 오류 등 예상된 오류 처리
        logger.warning(f"인수인계 생성 API 오류: {http_exc.detail}")
        error_message = quote(http_exc.detail)
        return RedirectResponse(
            f"/handover/new?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )
    except Exception as e:
        logger.error(f"인수인계 생성 중 예외 발생: {e}", exc_info=True)
        error_message = quote("인수인계 생성 중 오류가 발생했습니다.")
        return RedirectResponse(
            f"/handover/new?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
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
    is_notice: str = Form("false"),  # 폼에서 체크박스 값을 "true"/"false" 문자열로 처리
):
    user_id = current_user.get("user_id")
    user_role = current_user.get("user_role")
    logger.info(f"인수인계 수정 API 요청: id={handover_id}, user={user_id}")

    detail_url = request.url_for("handover_detail_page", handover_id=handover_id)
    edit_url = request.url_for("handover_edit_page", handover_id=handover_id)
    lock_held = False

    try:
        # 수정 전 락 상태 확인 (본인이 락을 가지고 있는지)
        lock_info = check_lock_status(db, "handover", handover_id, user_id)
        if (
            not lock_info.get("editable", False)
            or lock_info.get("locked_by") != user_id
        ):
            raise HTTPException(
                status_code=423,  # Locked
                detail=lock_info.get(
                    "message", "수정 권한이 없거나 락이 만료되었습니다."
                ),
            )
        lock_held = True

        # 인수인계 존재 확인 (락 확인 후)
        original_handover = get_handover_by_id(db, handover_id)
        if not original_handover:
            raise HTTPException(
                status_code=404, detail="수정할 인수인계를 찾을 수 없습니다."
            )

        # 권한 확인 (작성자 또는 ADMIN만 수정 가능)
        if user_id != original_handover.create_by and user_role != "ADMIN":
            raise HTTPException(
                status_code=403, detail="인수인계를 수정할 권한이 없습니다."
            )

        # 문자열 "true"/"false"를 불리언으로 변환
        is_notice_bool = is_notice.lower() == "true"

        # 일반 사용자가 공지사항으로 변경 시도하는 경우 방지
        if is_notice_bool and not original_handover.is_notice and user_role != "ADMIN":
            raise HTTPException(
                status_code=403, detail="관리자만 공지사항으로 변경할 수 있습니다."
            )

        # 서비스 호출
        update_data = {
            "title": title,
            "content": content,
            "is_notice": is_notice_bool,
        }

        # 서비스 레이어 호출 (업데이트 수행)
        update_handover(db, handover_id, update_data)
        logger.info(f"인수인계 수정 완료 (커밋 전): ID {handover_id}")

        # 수정 성공 후 락 해제
        release_lock(db, "handover", handover_id, user_id)
        lock_held = False

        success_message = quote("인수인계 정보가 성공적으로 수정되었습니다.")
        return RedirectResponse(
            f"/handover/{handover_id}?success={success_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    except HTTPException as http_exc:
        # HTTP 예외는 그대로 반환
        logger.warning(f"인수인계 수정 API 오류: {http_exc.detail}")
        error_message = quote(http_exc.detail)
        return RedirectResponse(
            f"{edit_url}?error={error_message}",  # 실패 시 edit 페이지로 리다이렉트
            status_code=status.HTTP_303_SEE_OTHER,
        )
    except Exception as e:
        # 예상치 못한 오류 처리
        logger.error(f"인수인계 수정 중 예외 발생: {str(e)}", exc_info=True)
        error_message = quote("인수인계 수정 중 오류가 발생했습니다.")
        return RedirectResponse(
            f"{edit_url}?error={error_message}",  # 실패 시 edit 페이지로 리다이렉트
            status_code=status.HTTP_303_SEE_OTHER,
        )
    finally:
        # 예외 발생 시에도 락을 보유하고 있었다면 해제 시도
        if lock_held:
            try:
                release_lock(db, "handover", handover_id, user_id)
                logger.info(
                    f"인수인계 수정 API 예외 처리 중 락 해제: id={handover_id}, user={user_id}"
                )
            except Exception as release_err:
                logger.error(
                    f"인수인계 수정 API 예외 처리 중 락 해제 실패: {release_err}"
                )


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
        # 권한 확인 로직 복구: 작성자 또는 ADMIN
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
