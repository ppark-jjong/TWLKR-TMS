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

# 라우터 생성
router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/handover", include_in_schema=False)
async def handover_page(
    request: Request,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(30, ge=1, le=100, description="페이지 크기"),
):
    """
    인수인계 페이지 렌더링 (첫 페이지 데이터 포함)
    """
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

        context = {
            "request": request,
            "initial_data": {  # JS에서 사용할 초기 데이터
                "handovers": handovers,  # 첫 페이지 목록
                "pagination": pagination_info,  # 페이지 정보
                "notices": notices,  # 공지사항 목록
            },
            "current_user": current_user,
        }
        return templates.TemplateResponse("handover.html", context)

    except Exception as e:
        logger.error(f"인수인계 페이지 렌더링 중 오류: {str(e)}", exc_info=True)
        context = {"request": request, "error_message": "페이지 로드 중 오류 발생"}
        return templates.TemplateResponse("error.html", context, status_code=500)


@router.get("/api/handover/list")
async def get_handover_list_api(
    db: Session = Depends(get_db),
    is_notice: Optional[bool] = Query(False, description="True: 공지, False: 인수인계"),
):
    """
    인수인계 또는 공지 목록 전체 조회 API (JSON, 페이지네이션 없음)
    """
    current_user = db.get("current_user")
    logger.info(
        f"전체 인수인계/공지 목록 API 호출: notice={is_notice}, user={current_user.get('user_id')}"
    )

    try:
        # 전체 목록 조회 서비스 호출
        all_items = get_handover_list_all(db=db, is_notice=is_notice)
        logger.info(f"전체 목록 조회 완료: {len(all_items)}건")

        # 응답 형식에 맞게 success, message 추가 (create_response 유틸리티 활용 권장)
        return {"success": True, "message": "목록 조회 성공", "data": all_items}

    except Exception as e:
        logger.error(f"전체 인수인계/공지 목록 API 오류: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "목록 조회 중 오류 발생"},
        )


@router.get("/handover/{handover_id}", include_in_schema=False)
async def get_handover_detail_page(
    request: Request,
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
):
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

        # 템플릿에 전달할 데이터 가공 (시간 형식 등)
        handover_data = {
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

        context = {
            "request": request,
            "handover": handover_data,
            "lock_info": lock_info,
            "current_user": current_user,
        }
        return templates.TemplateResponse("handover_detail.html", context)
    except HTTPException as http_exc:
        raise http_exc  # 404 등 HTTP 예외는 그대로 전달
    except Exception as e:
        logger.error(f"인수인계 상세 페이지 로드 오류: {str(e)}", exc_info=True)
        context = {"request": request, "error_message": "상세 정보 로드 중 오류 발생"}
        return templates.TemplateResponse("error.html", context, status_code=500)


@router.post("/handover", status_code=status.HTTP_302_FOUND)
async def create_handover_form(
    request: Request,
    db: Session = Depends(get_db),
    title: str = Form(...),
    content: str = Form(...),
    is_notice: bool = Form(False),
):
    current_user = request.session.get("user")
    logger.info(
        f"인수인계 생성 요청(Form): title='{title}', notice={is_notice}, user={current_user.get('user_id')}"
    )
    try:
        # 공지사항 생성 시 ADMIN 권한 확인
        if is_notice and current_user.get("role") != "ADMIN":
            logger.warning(
                f"권한 없는 공지사항 생성 시도: user={current_user.get('user_id')}"
            )
            # 오류 메시지를 포함하여 생성 폼으로 리다이렉트 또는 오류 페이지 표시
            # 여기서는 간단히 403 오류 발생
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
        # 성공 시 상세 페이지로 리다이렉트
        return RedirectResponse(
            url=f"/handover/{new_handover.handover_id}",
            status_code=status.HTTP_302_FOUND,
        )

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"인수인계 생성(Form) 오류: {str(e)}", exc_info=True)
        # 오류 발생 시 생성 폼으로 다시 보내거나 오류 페이지 표시
        # 여기서는 오류 페이지로 리다이렉트 (또는 템플릿 렌더링)
        # request.state.error_message = "인수인계 생성 중 오류가 발생했습니다." # 세션/쿠키 사용 가능
        # return RedirectResponse(url="/handover/new", status_code=status.HTTP_302_FOUND)
        raise HTTPException(status_code=500, detail="인수인계 생성 중 오류 발생")


@router.get("/lock/handover/{handover_id}")
async def check_handover_lock_api(
    request: Request,
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
):
    current_user = request.session.get("user")
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


# === 인수인계 수정 처리 (Form) ===
@router.post("/handover/{handover_id}", status_code=status.HTTP_302_FOUND)
async def update_handover_form(
    request: Request,
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    # current_user: Dict[str, Any] = Depends(get_current_user), # 데코레이터에서 처리
    title: str = Form(...),
    content: str = Form(...),
    is_notice: bool = Form(False),
):
    current_user = request.session.get("user")
    user_id = current_user.get("user_id")
    user_role = current_user.get("role")
    logger.info(f"인수인계 수정 요청(Form): id={handover_id}, user={user_id}")

    try:
        # 서비스 함수 내부에서 락 획득 및 권한 확인 진행됨
        # 공지사항으로 변경 시 ADMIN 권한 추가 확인
        if is_notice:
            original_handover = get_handover_by_id(db, handover_id)
            if (
                original_handover
                and not original_handover.is_notice
                and user_role != "ADMIN"
            ):
                logger.warning(
                    f"권한 없는 공지사항 변경 시도: id={handover_id}, user={user_id}"
                )
                raise HTTPException(
                    status_code=403, detail="공지사항 설정 권한이 없습니다."
                )

        updated_handover = update_handover(
            db=db,
            handover_id=handover_id,
            title=title,
            content=content,
            is_notice=is_notice,
            updated_by=user_id,  # 서비스 함수는 updated_by 인자를 받음
        )
        logger.info(f"인수인계 수정 성공(Form): id={updated_handover.handover_id}")
        # 성공 시 상세 페이지로 리다이렉트
        return RedirectResponse(
            url=f"/handover/{handover_id}", status_code=status.HTTP_302_FOUND
        )

    except HTTPException as http_exc:
        # 서비스에서 발생한 HTTPException (404, 423, 403 등) 처리
        # 필요시 오류 메시지를 포함하여 수정 폼으로 리다이렉트 또는 오류 페이지 표시
        logger.warning(
            f"인수인계 수정 실패 (HTTPException): id={handover_id}, status={http_exc.status_code}, detail={http_exc.detail}"
        )
        raise http_exc  # 또는 오류 처리 페이지로 리다이렉트
    except Exception as e:
        logger.error(f"인수인계 수정(Form) 오류: {str(e)}", exc_info=True)
        # 일반 오류 발생 시 처리
        raise HTTPException(status_code=500, detail="인수인계 수정 중 오류 발생")


# === 인수인계 삭제 처리 (Form) ===
@router.post("/handover/{handover_id}/delete", status_code=status.HTTP_302_FOUND)
async def delete_handover_form(
    request: Request,
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    # current_user: Dict[str, Any] = Depends(get_current_user)
):
    current_user = request.session.get("user")
    user_id = current_user.get("user_id")
    user_role = current_user.get("role")
    logger.info(f"인수인계 삭제 요청(Form): id={handover_id}, user={user_id}")

    try:
        # 삭제 전 인수인계 정보 확인 (작성자 확인 위해)
        handover = get_handover_by_id(db, handover_id)
        if not handover:
            logger.warning(f"삭제 대상 인수인계 없음: id={handover_id}")
            raise HTTPException(
                status_code=404, detail="삭제할 인수인계를 찾을 수 없습니다."
            )

        # 삭제 권한 확인 (ADMIN 또는 본인)
        if user_role != "ADMIN" and handover.update_by != user_id:
            logger.warning(
                f"권한 없는 인수인계 삭제 시도: id={handover_id}, user={user_id}"
            )
            raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

        # 서비스 함수 호출 (서비스 내에서 락 처리)
        success = delete_handover(db=db, handover_id=handover_id, user_id=user_id)

        if success:
            logger.info(f"인수인계 삭제 성공(Form): id={handover_id}")
            # 성공 시 목록 페이지로 리다이렉트
            return RedirectResponse(url="/handover", status_code=status.HTTP_302_FOUND)
        else:
            # 서비스에서 False를 반환한 경우 (이론상 발생 어려움, 예외로 처리됨)
            logger.error(f"인수인계 삭제 서비스 실패 (False 반환): id={handover_id}")
            raise HTTPException(
                status_code=500, detail="인수인계 삭제 처리 중 오류 발생"
            )

    except HTTPException as http_exc:
        logger.warning(
            f"인수인계 삭제 실패 (HTTPException): id={handover_id}, status={http_exc.status_code}, detail={http_exc.detail}"
        )
        raise http_exc
    except Exception as e:
        logger.error(f"인수인계 삭제(Form) 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="인수인계 삭제 중 오류 발생")
