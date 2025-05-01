"""
인수인계 관련 라우터
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
)
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session
import logging

from main.core.templating import templates
from main.utils.database import get_db
from main.utils.security import get_current_user, get_admin_user
from main.utils.lock import check_lock_status
from main.schema.handover_schema import HandoverCreate, HandoverUpdate, HandoverResponse
from main.service.handover_service import (
    get_handover_list,
    get_notice_list,
    get_handover_by_id,
    create_handover,
    update_handover,
    delete_handover,
)

# 라우터 생성
router = APIRouter()


@router.get("")
async def handover_page(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    인수인계 페이지 렌더링
    """
    try:
        # 함수 진입점 로깅
        logging.info(f"handover_page 시작: URL={request.url}")
        
        # 세션에서 사용자 정보 확인 (dashboard_route.py와 동일한 패턴)
        user = request.session.get("user")
        logging.debug(f"인수인계 페이지 접근 - 세션 정보: {user}")

        # 인증 확인
        if not user:
            logging.warning("인증되지 않은 사용자의 인수인계 페이지 접근 시도")
            return RedirectResponse(
                url="/login?return_to=/handover", status_code=status.HTTP_303_SEE_OTHER
            )

        logging.info(f"인수인계 페이지 접근: {user.get('user_id', 'N/A')}")

        # 템플릿 렌더링 (데이터는 JavaScript에서 API로 가져옴)
        return templates.TemplateResponse(
            "handover.html", {"request": request, "user": user}
        )
    except Exception as e:
        logging.error(f"인수인계 페이지 렌더링 중 오류 발생: {str(e)}", exc_info=True)
        # 오류 발생 시 에러 페이지 렌더링
        return templates.TemplateResponse(
            "error.html",
            {
                "request": request,
                "error_message": "인수인계 페이지를 불러오는 중 오류가 발생했습니다.",
                "error_detail": (
                    str(e)
                    if request.session.get("user", {}).get("user_role") == "ADMIN"
                    else ""
                ),
            },
            status_code=500,
        )


@router.get("/list")
async def get_handover_list_api(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    is_notice: bool = Query(None),
    keyword: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    """
    인수인계 목록 조회 API (JSON)
    """
    # 함수 진입점 로깅
    logging.info(f"get_handover_list_api 시작: is_notice={is_notice}, keyword={keyword}, page={page}, page_size={page_size}")
    
    try:
        result = {}

        # 공지사항 요청 시
        if is_notice is True:
            # 중간 포인트 로깅
            logging.debug(f"공지사항 목록 조회 시작: 검색어={keyword or '없음'}")
            
            notices = get_notice_list(
                db=db, page=page, page_size=page_size, search_term=keyword
            )

            # 공지사항 응답 데이터 가공
            notices_data = []
            for notice in notices:
                notice_dict = {
                    "handoverId": notice.handover_id,
                    "title": notice.title,
                    "content": notice.content,
                    "createBy": notice.create_by,
                    "updateBy": notice.update_by,
                    "updateAt": (
                        notice.update_at.strftime("%Y-%m-%d %H:%M")
                        if notice.update_at
                        else None
                    ),
                    "isNotice": notice.is_notice,
                }
                notices_data.append(notice_dict)
            
            # 함수 종료 로깅
            logging.info(f"공지사항 목록 조회 완료: 결과={len(notices_data)}건")

            return {
                "success": True,
                "message": "공지사항 목록 조회 성공",
                "data": notices_data,
            }

        # 일반 인수인계 목록 요청 시
        else:
            # 중간 포인트 로깅
            logging.debug(f"인수인계 목록 조회 시작: 검색어={keyword or '없음'}")
            
            handovers, pagination = get_handover_list(
                db=db,
                page=page,
                page_size=page_size,
                search_term=keyword,
                is_notice=False,
            )

            # 인수인계 응답 데이터 가공
            handovers_data = []
            for handover in handovers:
                # 편집 권한 계산: 작성자 또는 관리자
                can_edit = (
                    current_user.get("user_id") == handover.create_by
                    or current_user.get("user_role") == "ADMIN"
                )

                handover_dict = {
                    "handoverId": handover.handover_id,
                    "title": handover.title,
                    "content": handover.content,
                    "createBy": handover.create_by,
                    "updateBy": handover.update_by,
                    "updateAt": (
                        handover.update_at.strftime("%Y-%m-%d %H:%M")
                        if handover.update_at
                        else None
                    ),
                    "isNotice": handover.is_notice,
                    "canEdit": can_edit,
                }
                handovers_data.append(handover_dict)
            
            # 함수 종료 로깅
            logging.info(f"인수인계 목록 조회 완료: 결과={len(handovers_data)}건, 총={pagination.get('total', 0)}건")

            return {
                "success": True,
                "message": "인수인계 목록 조회 성공",
                "data": handovers_data,
                "pagination": pagination,
            }
    except Exception as e:
        logging.error(f"인수인계 목록 조회 중 오류 발생: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "인수인계 목록을 불러오는 중 오류가 발생했습니다.",
            },
        )


@router.get("/handovers/{handover_id}")
async def get_handover_detail(
    request: Request,
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    인수인계 상세 조회 API
    """
    # 함수 진입점 로깅
    logging.info(f"get_handover_detail 시작: handover_id={handover_id}, 사용자={current_user.get('user_id')}")
    
    try:
        # 중간 포인트 로깅
        logging.debug(f"DB 쿼리 시작: 인수인계 ID={handover_id} 상세 조회")
        
        handover = get_handover_by_id(db, handover_id)

        if not handover:
            logging.warning(f"존재하지 않는 인수인계 조회 시도: ID={handover_id}")
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"success": False, "message": "인수인계를 찾을 수 없습니다."},
            )

        # 응답 데이터 구성
        handover_data = {
            "id": handover.handover_id,
            "title": handover.title,
            "content": handover.content,
            "is_notice": handover.is_notice,
            "writer_id": handover.update_by,
            "updated_at": (
                handover.update_at.strftime("%Y-%m-%d %H:%M")
                if handover.update_at
                else None
            ),
            # 편집 권한 확인 (작성자 또는 관리자만 가능)
            "can_edit": current_user.get("user_id") == handover.update_by
            or current_user.get("user_role") == "ADMIN",
            # 삭제 권한 확인 (관리자만 가능)
            "can_delete": current_user.get("user_role") == "ADMIN",
        }
        
        # 함수 종료 로깅
        logging.info(f"get_handover_detail 완료: handover_id={handover_id}, 결과=성공")

        return {"success": True, "data": handover_data}
    except Exception as e:
        logging.error(f"인수인계 상세 조회 중 오류 발생: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "인수인계 상세 조회 중 오류가 발생했습니다.",
            },
        )


@router.post("/handovers")
async def create_handover_item(
    request: Request,
    handover_data: HandoverCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    인수인계 생성 API
    """
    # 함수 진입점 로깅
    logging.info(f"create_handover_item 시작: 사용자={current_user.get('user_id')}, is_notice={handover_data.is_notice}")
    
    try:
        # 공지사항 등록 시 관리자 권한 확인
        if handover_data.is_notice and current_user.get("user_role") != "ADMIN":
            logging.warning(f"권한 없는 공지사항 등록 시도: 사용자={current_user.get('user_id')}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"success": False, "message": "공지사항 등록 권한이 없습니다."},
            )

        # 인수인계 생성
        logging.debug(f"DB 생성 시작: 제목='{handover_data.title}'")
        
        new_handover = create_handover(
            db=db,
            title=handover_data.title,
            content=handover_data.content,
            is_notice=handover_data.is_notice,
            writer_id=current_user.get("user_id"),
            writer_name=current_user.get("user_name", current_user.get("user_id")),
        )
        
        # 함수 종료 로깅
        logging.info(f"create_handover_item 완료: 결과=성공, ID={new_handover.handover_id}")

        return {
            "success": True,
            "message": "인수인계가 성공적으로 등록되었습니다.",
            "id": new_handover.handover_id,
        }
    except Exception as e:
        logging.error(f"인수인계 생성 중 오류 발생: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "인수인계 등록 중 오류가 발생했습니다.",
            },
        )


@router.put("/handovers/{handover_id}")
async def update_handover_item(
    request: Request,
    handover_id: int = Path(..., ge=1),
    handover_data: HandoverUpdate = None,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    인수인계 수정 API
    """
    # 함수 진입점 로깅
    logging.info(f"update_handover_item 시작: handover_id={handover_id}, 사용자={current_user.get('user_id')}")
    
    try:
        # 기존 인수인계 조회
        logging.debug(f"DB 쿼리 시작: 인수인계 ID={handover_id} 조회")
        
        handover = get_handover_by_id(db, handover_id)

        if not handover:
            logging.warning(f"존재하지 않는 인수인계 수정 시도: ID={handover_id}")
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"success": False, "message": "인수인계를 찾을 수 없습니다."},
            )

        # 수정 권한 확인 (작성자 또는 관리자만 가능)
        if (
            current_user.get("user_id") != handover.update_by
            and current_user.get("user_role") != "ADMIN"
        ):
            logging.warning(f"권한 없는 인수인계 수정 시도: 사용자={current_user.get('user_id')}, 원작성자={handover.update_by}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"success": False, "message": "인수인계 수정 권한이 없습니다."},
            )

        # 공지사항 설정 시 관리자 권한 확인
        if handover_data.is_notice and current_user.get("user_role") != "ADMIN":
            logging.warning(f"권한 없는 공지사항 설정 시도: 사용자={current_user.get('user_id')}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"success": False, "message": "공지사항 설정 권한이 없습니다."},
            )

        # 인수인계 수정
        logging.debug(f"DB 업데이트 시작: ID={handover_id}, 제목='{handover_data.title}'")
        
        updated_handover = update_handover(
            db=db,
            handover_id=handover_id,
            title=handover_data.title,
            content=handover_data.content,
            is_notice=handover_data.is_notice,
            updated_by=current_user.get("user_id"),
        )
        
        # 함수 종료 로깅
        logging.info(f"update_handover_item 완료: 결과=성공, ID={updated_handover.handover_id}")

        return {
            "success": True,
            "message": "인수인계가 성공적으로 수정되었습니다.",
            "id": updated_handover.handover_id,
        }
    except Exception as e:
        logging.error(f"인수인계 수정 중 오류 발생: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "인수인계 수정 중 오류가 발생했습니다.",
            },
        )


@router.get("/lock/{handover_id}")
async def check_handover_lock(
    request: Request,
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    인수인계 락 상태 확인 API
    """
    # 함수 진입점 로깅
    logging.info(f"check_handover_lock 시작: handover_id={handover_id}, 사용자={current_user.get('user_id')}")
    
    try:
        # 락 상태 확인
        logging.debug(f"락 상태 확인: 인수인계 ID={handover_id}")
        
        lock_status = check_lock_status(
            db, "handover", handover_id, current_user.get("user_id")
        )
        
        # 함수 종료 로깅
        logging.info(f"check_handover_lock 완료: ID={handover_id}, 편집가능={lock_status.get('editable', False)}")
        
        return lock_status
    except Exception as e:
        logging.error(f"락 상태 확인 중 오류 발생: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "락 상태 확인 중 오류가 발생했습니다.",
            },
        )


@router.delete("/handovers/{handover_id}")
async def delete_handover_item(
    request: Request,
    handover_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),  # 일반 사용자도 삭제 가능
):
    """
    인수인계 삭제 API (본인 작성 또는 관리자)
    """
    # 함수 진입점 로깅
    logging.info(f"delete_handover_item 시작: handover_id={handover_id}, 사용자={current_user.get('user_id')}")
    
    try:
        # 기존 인수인계 조회
        logging.debug(f"DB 쿼리 시작: 인수인계 ID={handover_id} 조회")
        
        handover = get_handover_by_id(db, handover_id)

        if not handover:
            logging.warning(f"존재하지 않는 인수인계 삭제 시도: ID={handover_id}")
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"success": False, "message": "인수인계를 찾을 수 없습니다."},
            )

        # 삭제 권한 확인 (작성자 또는 관리자만 가능)
        if (
            current_user.get("user_id") != handover.update_by
            and current_user.get("user_role") != "ADMIN"
        ):
            logging.warning(f"권한 없는 인수인계 삭제 시도: 사용자={current_user.get('user_id')}, 원작성자={handover.update_by}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"success": False, "message": "인수인계 삭제 권한이 없습니다."},
            )

        # 인수인계 삭제
        logging.debug(f"DB 삭제 시작: 인수인계 ID={handover_id}")
        
        success = delete_handover(db, handover_id)

        if not success:
            logging.error(f"인수인계 삭제 실패: ID={handover_id}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "success": False,
                    "message": "인수인계 삭제 중 오류가 발생했습니다.",
                },
            )
        
        # 함수 종료 로깅
        logging.info(f"delete_handover_item 완료: 결과=성공, ID={handover_id}")

        return {"success": True, "message": "인수인계가 성공적으로 삭제되었습니다."}
    except Exception as e:
        logging.error(f"인수인계 삭제 중 오류 발생: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "인수인계 삭제 중 오류가 발생했습니다.",
            },
        )
