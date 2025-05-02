"""
인수인계 관련 라우터 - 명세 기반 수정 (v5)
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
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
from main.utils.database import get_db
from main.utils.security import get_current_user, get_admin_user
from main.utils.lock import check_lock_status
from main.schema.handover_schema import HandoverCreate, HandoverUpdate
from main.service.handover_service import (
    get_handover_list_paginated,
    get_handover_list_all,
    get_notice_list,
    get_handover_by_id,
    create_handover,
    update_handover,
    delete_handover,
    check_lock_status as check_handover_lock_status,
)

logger = logging.getLogger(__name__)

# 라우터 생성 (페이지 / API 분리)
page_router = APIRouter(prefix="/handover", dependencies=[Depends(get_current_user)])
api_router = APIRouter(prefix="/api/handover", dependencies=[Depends(get_current_user)])


# === 페이지 렌더링 라우트 ===
@page_router.get("/new", include_in_schema=False)
async def handover_create_page(request: Request):
    """설명서 3.4 (페이지): 인수인계 생성 페이지"""
    current_user = request.session.get("user")
    logger.info(f"인수인계 생성 페이지 로드 시작: user={current_user.get('user_id')}")
    # ADMIN만 공지사항 작성 가능함을 프론트에서 처리하거나, 여기서 플래그 전달
    can_create_notice = current_user.get("user_role") == "ADMIN"
    return templates.TemplateResponse(
        "handover_form.html",
        {
            "request": request,
            "current_user": current_user,
            "can_create_notice": can_create_notice,
            "handover": None,
            "is_edit": False,
        },
    )


@page_router.get("/", include_in_schema=False)  # 경로: /handover/
async def handover_page(
    request: Request,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(30, ge=1, le=100, description="페이지 크기"),
):
    """설명서 3.1: 인수인계 목록 페이지 (SSR)"""
    current_user = request.session.get("user")
    logger.info(
        f"인수인계 페이지 로드 시작: user={current_user.get('user_id')}, page={page}, size={page_size}"
    )

    try:
        # 공지사항 조회 (예: 상단 5개)
        notices = get_notice_list(db=db, page=1, page_size=5)
        logger.info(f"공지사항 조회 완료: {len(notices)}건")

        # 인수인계 목록 첫 페이지 조회 (is_notice=False)
        handovers, pagination_info = get_handover_list_paginated(
            db=db, page=page, page_size=page_size, is_notice=False
        )
        logger.info(f"인수인계 첫 페이지 조회 완료: {len(handovers)}건")

        # 전달할 파이썬 객체 생성
        initial_data_obj = {
            "handovers": handovers,
            "pagination": pagination_info,
            "notices": notices,
        }

        # JSON 문자열로 미리 변환
        initial_data_json_str = "{}"  # 기본값
        try:
            # EnhancedJSONEncoder가 정의되어 있다고 가정 (dashboard_route.py 와 유사하게)
            # 만약 없다면 여기 추가 필요
            from .dashboard_route import (
                EnhancedJSONEncoder,
            )  # dashboard_route에서 가져오기 시도

            initial_data_json_str = json.dumps(
                initial_data_obj, cls=EnhancedJSONEncoder
            )
        except ImportError:
            # EnhancedJSONEncoder가 없거나 가져올 수 없을 때 기본 인코더 사용
            logger.warning(
                "EnhancedJSONEncoder를 찾을 수 없어 기본 JSON 인코더를 사용합니다."
            )
            initial_data_json_str = json.dumps(initial_data_obj)
        except Exception as json_err:
            logger.error(
                f"인수인계 초기 데이터 JSON 직렬화 오류: {json_err}", exc_info=True
            )

        context = {
            "request": request,
            "initial_data_json": initial_data_json_str,  # JSON 문자열 전달
            "current_user": current_user,
        }
        return templates.TemplateResponse("handover.html", context)

    except Exception as e:
        logger.error(f"인수인계 페이지 렌더링 중 오류: {str(e)}", exc_info=True)
        context = {
            "request": request,
            "error_message": "페이지 로드 중 오류 발생",
            "current_user": current_user,
        }
        return templates.TemplateResponse("error.html", context, status_code=500)


@page_router.get("/{handover_id}", include_in_schema=False)  # 경로: /handover/{id}
async def get_handover_detail_page(
    request: Request,
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
):
    """설명서 3.3: 인수인계 상세 페이지"""
    current_user = request.session.get("user")
    logger.info(
        f"인수인계 상세 페이지 로드 시작: id={handover_id}, user={current_user.get('user_id')}"
    )
    try:
        handover = get_handover_by_id(db, handover_id)
        if not handover:
            logger.warning(f"상세 조회 실패 (없음): id={handover_id}")
            raise HTTPException(status_code=404, detail="인수인계를 찾을 수 없습니다.")

        # 락 상태 확인
        lock_info = check_handover_lock_status(
            db, handover_id, current_user.get("user_id")
        )
        logger.debug(f"락 상태 확인 완료: editable={lock_info.get('editable')}")

        # 라벨 정보 추가 (is_notice 사용, priority 제거 또는 수정)
        type_labels = {"NOTICE": "공지", "HANDOVER": "인수인계"}
        # is_notice 값 (True/False)에 따라 라벨 설정
        handover.type_label = (
            type_labels["NOTICE"] if handover.is_notice else type_labels["HANDOVER"]
        )

        # priority 관련 속성이 모델에 있는지 확인 후 처리
        # 예: priority_labels = {"HIGH": "높음", ...}
        # if hasattr(handover, 'priority'):
        #     handover.priority_label = priority_labels.get(handover.priority, handover.priority)
        # else:
        #     handover.priority_label = "-" # 모델에 priority 없으면 기본값

        # 컨텍스트에 모델 객체 직접 전달
        context = {
            "request": request,
            "handover": handover,  # 모델 객체 전달
            "lock_info": lock_info,
            "current_user": current_user,
            # is_confirmed, user_confirmed_at 등 필요한 다른 변수 추가
        }
        return templates.TemplateResponse("handover_detail.html", context)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"인수인계 상세 페이지 로드 오류: {str(e)}", exc_info=True)
        # 오류 컨텍스트에 current_user 추가
        context = {
            "request": request,
            "error_message": "상세 정보 로드 중 오류 발생",
            "current_user": current_user,
        }
        return templates.TemplateResponse("error.html", context, status_code=500)


@page_router.get("/{handover_id}/edit", include_in_schema=False)
async def handover_edit_page(
    request: Request,
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """설명서 3.6: 인수인계 수정 페이지 로드 및 락 확인"""
    logger.info(
        f"인수인계 수정 페이지 로드 시작: id={handover_id}, user={current_user.get('user_id')}"
    )

    try:
        # 인수인계 정보 조회
        handover = get_handover_by_id(db, handover_id)
        if not handover:
            logger.warning(f"수정 대상 인수인계 없음: id={handover_id}")
            raise HTTPException(
                status_code=404, detail="수정할 인수인계를 찾을 수 없습니다."
            )

        # 락 상태 확인
        lock_info = check_handover_lock_status(
            db, handover_id, current_user.get("user_id")
        )

        # 락 걸려 있으면 상세 페이지로 리다이렉트 (메시지 포함)
        if not lock_info.get("editable", False):
            locked_by_user = lock_info.get("locked_by", "다른 사용자")
            error_message = f"{locked_by_user}님이 현재 수정 중입니다."
            logger.warning(
                f"락으로 인해 수정 페이지 접근 불가: id={handover_id}, locked_by={locked_by_user}"
            )
            # 상세 페이지 URL 생성 (주의: RedirectResponse는 request.url_for 직접 사용 불가)
            detail_page_url = request.url_for(
                "get_handover_detail_page", handover_id=handover_id
            )
            # 쿼리 파라미터로 오류 메시지 전달 (URL 인코딩 필요)
            from urllib.parse import quote

            redirect_url = f"{detail_page_url}?error={quote(error_message)}"
            return RedirectResponse(
                url=redirect_url, status_code=status.HTTP_303_SEE_OTHER
            )

        # 템플릿 렌더링 (handover_form.html 사용)
        context = {
            "request": request,
            "handover": handover,  # 수정할 데이터 전달
            "current_user": current_user,
            "is_edit": True,  # 수정 모드임을 명시
            "can_create_notice": current_user.get("user_role")
            == "ADMIN",  # 공지사항 수정 권한
            # lock_info는 필요시 전달
        }
        return templates.TemplateResponse("handover_form.html", context)

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"인수인계 수정 페이지 로드 오류: {str(e)}", exc_info=True)
        context = {
            "request": request,
            "error_message": "페이지 로드 중 오류 발생",
            "current_user": current_user,
        }
        return templates.TemplateResponse("error.html", context, status_code=500)


# === API 엔드포인트 라우트 ===


@api_router.get("/list")  # 경로: /api/handover/list
async def get_handover_list_api(
    # request: Request, # Depends에서 처리
    db: Session = Depends(get_db),
    is_notice: Optional[bool] = Query(False, description="True: 공지, False: 인수인계"),
    current_user: Dict[str, Any] = Depends(
        get_current_user
    ),  # 의존성 주입 파라미터 추가
):
    """설명서 3.2: 인수인계 목록 조회 API (JSON)"""
    # current_user = request.session.get("user") # Depends 사용으로 변경
    # if not current_user: ... (Depends가 처리)
    # logger에서 사용자 ID 접근 방식 변경 필요
    # logger.info(f"전체 인수인계/공지 목록 API 호출: notice={is_notice}, user={current_user.get('user_id')}") -> Depends 주입 변수 사용
    # current_user: Dict[str, Any] = Depends(get_current_user) # 파라미터로 이동
    logger.info(
        f"전체 인수인계/공지 목록 API 호출: notice={is_notice}, user={current_user.get('user_id')}"
    )  # 이제 정상 동작

    try:
        all_items = get_handover_list_all(db=db, is_notice=is_notice)
        logger.info(f"전체 목록 조회 완료: {len(all_items)}건")
        return {"success": True, "message": "목록 조회 성공", "data": all_items}
    except Exception as e:
        logger.error(f"전체 인수인계/공지 목록 API 오류: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "목록 조회 중 오류 발생"},
        )


@api_router.post("", status_code=status.HTTP_302_FOUND)  # 경로: /api/handover
async def create_handover_form(
    # request: Request, # Form 데이터 직접 받기
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),  # 사용자 정보 주입
    title: str = Form(...),
    content: str = Form(...),
    is_notice: bool = Form(False),
):
    """설명서 3.4 (처리): 인수인계 생성 처리"""
    # current_user = request.session.get("user") # Depends 사용
    logger.info(
        f"인수인계 생성 요청(Form): title='{title}', notice={is_notice}, user={current_user.get('user_id')}"
    )
    try:
        if is_notice and current_user.get("role") != "ADMIN":
            logger.warning(
                f"권한 없는 공지사항 생성 시도: user={current_user.get('user_id')}"
            )
            raise HTTPException(
                status_code=403, detail="공지사항 생성 권한이 없습니다."
            )

        new_handover = create_handover(
            db=db,
            title=title,
            content=content,
            is_notice=is_notice,
            writer_id=current_user.get("user_id"),
        )
        logger.info(f"인수인계 생성 성공(Form): id={new_handover.handover_id}")
        # 성공 시 상세 페이지로 리다이렉트 (/handover/{id} 경로 사용)
        return RedirectResponse(
            url=f"/handover/{new_handover.handover_id}",
            status_code=status.HTTP_302_FOUND,
        )
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"인수인계 생성(Form) 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="인수인계 생성 중 오류 발생")


@api_router.post("/{handover_id}", status_code=status.HTTP_302_FOUND)
async def update_handover_form(
    request: Request,
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    title: str = Form(...),
    content: str = Form(...),
    is_notice: bool = Form(False),
):
    """설명서 3.5: 인수인계 수정 처리"""
    from main.utils.lock import acquire_lock, release_lock

    user_id = current_user.get("user_id")
    user_role = current_user.get("user_role")
    logger.info(f"인수인계 수정 요청(Form): id={handover_id}, user={user_id}")

    # 락 획득 시도
    lock_success, lock_info = acquire_lock(db, "handover", handover_id, user_id)
    if not lock_success:
        logger.warning(f"인수인계 수정 실패 (락 획득 불가): ID {handover_id}")
        error_message = lock_info.get("message", "현재 다른 사용자가 편집 중입니다.")
        edit_url = request.url_for("handover_edit_page", handover_id=handover_id)
        return RedirectResponse(
            url=f"{edit_url}?error={quote(error_message)}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    try:
        # 공지사항 변경 권한 확인 (수정 전 데이터 필요)
        original_handover = get_handover_by_id(db, handover_id)
        if not original_handover:
            raise HTTPException(status_code=404, detail="인수인계를 찾을 수 없습니다.")

        if is_notice and not original_handover.is_notice and user_role != "ADMIN":
            logger.warning(
                f"권한 없는 공지사항 변경 시도: id={handover_id}, user={user_id}"
            )
            raise HTTPException(
                status_code=403, detail="공지사항 설정 권한이 없습니다."
            )

        # 서비스 호출 (update_handover에는 락 처리 없다고 가정)
        updated_handover = update_handover(
            db=db,
            handover_id=handover_id,
            title=title,
            content=content,
            is_notice=is_notice,
            updated_by=user_id,
        )
        logger.info(f"인수인계 수정 성공(Form): id={updated_handover.handover_id}")

        # 성공 시 상세 페이지로 리다이렉트
        success_message = quote("인수인계 정보가 성공적으로 수정되었습니다.")
        detail_url = request.url_for(
            "get_handover_detail_page", handover_id=handover_id
        )
        return RedirectResponse(
            url=f"{detail_url}?success={success_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    except HTTPException as http_exc:
        # 롤백은 DB 에러 시 자동으로 처리되거나 서비스 레벨에서 명시적으로 처리
        logger.warning(
            f"인수인계 수정 실패 (HTTPException): id={handover_id}, status={http_exc.status_code}, detail={http_exc.detail}"
        )
        # 실패 시 오류 메시지와 함께 수정 페이지로 리다이렉트
        error_message = quote(http_exc.detail or "인수인계 수정 중 오류 발생")
        edit_url = request.url_for("handover_edit_page", handover_id=handover_id)
        return RedirectResponse(
            url=f"{edit_url}?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )
    except Exception as e:
        logger.error(f"인수인계 수정(Form) 오류: {str(e)}", exc_info=True)
        error_message = quote("인수인계 수정 중 서버 오류 발생")
        edit_url = request.url_for("handover_edit_page", handover_id=handover_id)
        return RedirectResponse(
            url=f"{edit_url}?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )
    finally:
        # 락 해제
        release_lock(db, "handover", handover_id, user_id)


@api_router.post("/{handover_id}/delete", status_code=status.HTTP_302_FOUND)
async def delete_handover_form(
    request: Request,
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """설명서 3.6: 인수인계 삭제 처리"""
    from main.utils.lock import acquire_lock, release_lock

    user_id = current_user.get("user_id")
    user_role = current_user.get("user_role")
    logger.info(f"인수인계 삭제 요청(Form): id={handover_id}, user={user_id}")

    # 락 획득 시도
    lock_success, lock_info = acquire_lock(db, "handover", handover_id, user_id)
    if not lock_success:
        logger.warning(f"인수인계 삭제 실패 (락 획득 불가): ID {handover_id}")
        error_message = lock_info.get("message", "현재 다른 사용자가 편집 중입니다.")
        detail_url = request.url_for(
            "get_handover_detail_page", handover_id=handover_id
        )
        return RedirectResponse(
            url=f"{detail_url}?error={quote(error_message)}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    try:
        # 삭제 권한 확인 (ADMIN 또는 작성자)
        handover = get_handover_by_id(db, handover_id)
        if not handover:
            raise HTTPException(
                status_code=404, detail="삭제할 인수인계를 찾을 수 없습니다."
            )

        # 모델에 created_by 또는 writer_id 필드가 있어야 함 (update_by 대신)
        # 여기서는 update_by 를 작성자로 가정 (명세 확인 필요)
        is_author = handover.update_by == user_id
        if not (user_role == "ADMIN" or is_author):
            logger.warning(
                f"권한 없는 인수인계 삭제 시도: id={handover_id}, user={user_id}"
            )
            raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

        # 서비스 호출 (delete_handover에는 락 처리 없다고 가정)
        success = delete_handover(db=db, handover_id=handover_id, user_id=user_id)

        if success:
            logger.info(f"인수인계 삭제 성공(Form): id={handover_id}")
            # 성공 시 목록 페이지로 리다이렉트
            success_message = quote("인수인계가 성공적으로 삭제되었습니다.")
            list_url = request.url_for("handover_page")
            return RedirectResponse(
                url=f"{list_url}?success={success_message}",
                status_code=status.HTTP_303_SEE_OTHER,
            )
        else:
            logger.error(f"인수인계 삭제 서비스 실패 (False 반환): id={handover_id}")
            raise HTTPException(
                status_code=500, detail="인수인계 삭제 처리 중 오류 발생"
            )

    except HTTPException as http_exc:
        logger.warning(
            f"인수인계 삭제 실패 (HTTPException): id={handover_id}, status={http_exc.status_code}, detail={http_exc.detail}"
        )
        # 실패 시 상세 페이지로 리다이렉트
        error_message = quote(http_exc.detail or "인수인계 삭제 중 오류 발생")
        detail_url = request.url_for(
            "get_handover_detail_page", handover_id=handover_id
        )
        return RedirectResponse(
            url=f"{detail_url}?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )
    except Exception as e:
        logger.error(f"인수인계 삭제(Form) 오류: {str(e)}", exc_info=True)
        error_message = quote("인수인계 삭제 중 서버 오류 발생")
        detail_url = request.url_for(
            "get_handover_detail_page", handover_id=handover_id
        )
        return RedirectResponse(
            url=f"{detail_url}?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )
    finally:
        # 락 해제
        release_lock(db, "handover", handover_id, user_id)


@api_router.get("/lock/{handover_id}", response_model=Dict)
async def check_handover_lock_api(
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """설명서 3.7: 인수인계 락 상태 확인 API"""
    logger.info(
        f"인수인계 락 상태 확인 API: id={handover_id}, user={current_user.get('user_id')}"
    )
    try:
        lock_status = check_handover_lock_status(
            db, handover_id, current_user.get("user_id")
        )
        logger.info(f"락 상태 확인 API 완료: editable={lock_status.get('editable')}")
        return lock_status
    except Exception as e:
        logger.error(f"락 상태 확인 API 오류: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "락 상태 확인 중 오류 발생"},
        )
