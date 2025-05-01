"""
사용자 관리 관련 라우터 - 극도로 단순화
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, Request, Query, Form, status, Path
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import logging

from main.core.templating import templates
from main.utils.database import get_db
from main.utils.security import get_admin_user, hash_password  # 관리자 전용 페이지
from main.service.user_service import (
    get_user_list,
    create_user,
    update_user_role,
    delete_user,
)

logger = logging.getLogger(__name__)

# 라우터 생성 (관리자 전용)
router = APIRouter()


@router.get("")
async def users_page(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),  # 관리자만 접근 가능
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    role: str = Query(None),
    search_type: str = Query(None),
    search_value: str = Query(None),
):
    """
    사용자 관리 페이지 렌더링 (관리자 전용)
    """
    # 함수 진입점 로깅
    logging.info(
        f"users_page 시작: 매개변수={{'page': {page}, 'limit': {limit}, 'role': {role}, 'search_type': {search_type}, 'search_value': {search_value}}}"
    )

    try:
        # 필터 정보 생성
        filter_data = {
            "role": role or "all",
            "search_type": search_type or "user_id",
            "search_value": search_value or "",
        }

        # 중간 포인트 로깅 - DB 쿼리 전
        logging.debug(f"DB 쿼리 시작: 사용자 목록 조회 (필터: {filter_data})")

        # 사용자 목록 조회
        users, pagination = get_user_list(
            db=db,
            page=page,
            page_size=limit,
            role=role,
            search_type=search_type,
            search_value=search_value,
        )

        # 중간 포인트 로깅 - DB 쿼리 결과
        logging.info(f"사용자 관리 페이지 접근: 사용자 {len(users)}개 조회됨")

        # 함수 종료 로깅
        logging.info(f"users_page 완료: 결과=성공, 데이터={len(users)}건")

        # 템플릿 렌더링
        return templates.TemplateResponse(
            "users.html",
            {
                "request": request,
                "user": current_user,
                "users": users,
                "current_page": page,
                "total_pages": pagination["total_pages"],
                "filter": filter_data,  # 필터 정보 추가
            },
        )
    except Exception as e:
        logging.error(
            f"사용자 관리 페이지 렌더링 중 오류 발생: {str(e)}", exc_info=True
        )

        # 함수 종료 로깅 (오류 발생)
        logging.info(f"users_page 완료: 결과=오류, 메시지={str(e)[:100]}")

        # 오류 발생 시 에러 페이지 렌더링
        return templates.TemplateResponse(
            "error.html",
            {
                "request": request,
                "error_message": "사용자 목록을 불러오는 중 오류가 발생했습니다.",
            },
            status_code=500,
        )


from main.schema.user_schema import UserCreateForm


@router.post("")
async def create_new_user(
    request: Request,
    user_data: UserCreateForm,
    db: Session = Depends(get_db),
    current_admin: Dict[str, Any] = Depends(get_admin_user),
):
    """
    사용자 생성 API (관리자 전용, JSON 요청)
    """
    logging.info(
        f"사용자 생성 API 호출: userId={user_data.user_id}, role={user_data.user_role}, by={current_admin.get('user_id')}"
    )
    try:
        hashed_password = hash_password(user_data.user_password)
        create_user(
            db=db,
            user_id=user_data.user_id,
            user_password=hashed_password,
            user_role=user_data.user_role,
            user_department=user_data.user_department,
        )
        logging.info(f"사용자 생성 성공: userId={user_data.user_id}")
        return {"success": True, "message": "사용자가 성공적으로 생성되었습니다."}
    except Exception as e:
        logging.error(f"사용자 생성 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="사용자 생성 중 오류가 발생했습니다."
        )


@router.post("/{user_id_to_delete}/delete")
async def delete_user_account(
    user_id_to_delete: str = Path(..., description="삭제할 사용자 ID", alias="userId"),
    db: Session = Depends(get_db),
    current_admin: Dict[str, Any] = Depends(get_admin_user),
):
    """
    사용자 삭제 API (관리자 전용, 경로 파라미터 사용)
    """
    logging.info(
        f"사용자 삭제 API 호출: targetUserId={user_id_to_delete}, by={current_admin.get('user_id')}"
    )

    # 자기 자신 삭제 방지 (선택적)
    if user_id_to_delete == current_admin.get("user_id"):
        logging.warning(f"자기 자신 삭제 시도: user={user_id_to_delete}")
        raise HTTPException(status_code=400, detail="자기 자신은 삭제할 수 없습니다.")

    try:
        delete_user(db=db, user_id=user_id_to_delete)
        logging.info(f"사용자 삭제 성공: targetUserId={user_id_to_delete}")
        return {"success": True, "message": "사용자가 성공적으로 삭제되었습니다."}
    except Exception as e:
        logging.error(f"사용자 삭제 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="사용자 삭제 중 오류가 발생했습니다."
        )
