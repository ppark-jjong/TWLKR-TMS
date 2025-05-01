"""
사용자 관리 관련 라우터 - 극도로 단순화
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, Request, Query, Form, status
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
    logging.info(f"users_page 시작: 매개변수={{'page': {page}, 'limit': {limit}, 'role': {role}, 'search_type': {search_type}, 'search_value': {search_value}}}")
    
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
        logging.error(f"사용자 관리 페이지 렌더링 중 오류 발생: {str(e)}", exc_info=True)
        
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


@router.post("/create")
async def create_new_user(
    user_data: UserCreateForm,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),  # 관리자만 접근 가능
):
    """
    사용자 생성 API (관리자 전용)

    Pydantic 모델을 사용하여 JSON 요청 처리
    """
    # 함수 진입점 로깅
    logging.info(f"create_new_user 시작: 사용자 ID={user_data.user_id}, 권한={user_data.user_role}")
    
    try:
        # 비밀번호 해싱
        logging.debug(f"비밀번호 해싱 시작: 사용자 ID={user_data.user_id}")
        hashed_password = hash_password(user_data.user_password)

        # 사용자 생성
        logging.debug(f"DB 생성 시작: 사용자 ID={user_data.user_id}, 부서={user_data.user_department}")
        create_user(
            db=db,
            user_id=user_data.user_id,
            user_password=hashed_password,
            user_role=user_data.user_role,
            user_department=user_data.user_department,
        )
        
        # 함수 종료 로깅
        logging.info(f"create_new_user 완료: 결과=성공, 사용자 ID={user_data.user_id}")

        return {"success": True, "message": "사용자가 성공적으로 생성되었습니다."}
    except Exception as e:
        logging.error(f"사용자 생성 중 오류 발생: {str(e)}", exc_info=True)
        
        # 함수 종료 로깅 (오류 발생)
        logging.info(f"create_new_user 완료: 결과=오류, 메시지={str(e)[:100]}")
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "사용자 생성 중 오류가 발생했습니다.",
            },
        )


@router.post("/role")
async def change_user_role(
    user_id: str = Form(...),
    user_role: str = Form(...),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),  # 관리자만 접근 가능
):
    """
    사용자 권한 변경 API (관리자 전용)
    """
    # 함수 진입점 로깅
    logging.info(f"change_user_role 시작: 사용자 ID={user_id}, 새 권한={user_role}")
    
    try:
        # 사용자 권한 변경
        logging.debug(f"DB 업데이트 시작: 사용자 ID={user_id}, 권한={user_role}")
        update_user_role(db=db, user_id=user_id, user_role=user_role)
        
        # 함수 종료 로깅
        logging.info(f"change_user_role 완료: 결과=성공, 사용자 ID={user_id}, 권한={user_role}")

        return {"success": True, "message": "사용자 권한이 성공적으로 변경되었습니다."}
    except Exception as e:
        logging.error(f"사용자 권한 변경 중 오류 발생: {str(e)}", exc_info=True)
        
        # 함수 종료 로깅 (오류 발생)
        logging.info(f"change_user_role 완료: 결과=오류, 메시지={str(e)[:100]}")
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "사용자 권한 변경 중 오류가 발생했습니다.",
            },
        )


# 사용자 삭제 요청을 위한 Pydantic 모델
from pydantic import BaseModel, Field


class UserDeleteRequest(BaseModel):
    user_id: str = Field(..., description="사용자 ID", alias="userId")

    class Config:
        by_alias = True
        populate_by_name = True


@router.post("/delete")
async def delete_user_account(
    user_data: UserDeleteRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),  # 관리자만 접근 가능
):
    """
    사용자 삭제 API (관리자 전용)

    JSON 요청 형식 사용
    """
    # 함수 진입점 로깅
    logging.info(f"delete_user_account 시작: 사용자 ID={user_data.user_id}")
    
    try:
        # 사용자 삭제
        logging.debug(f"DB 삭제 시작: 사용자 ID={user_data.user_id}")
        delete_user(db=db, user_id=user_data.user_id)
        
        # 함수 종료 로깅
        logging.info(f"delete_user_account 완료: 결과=성공, 사용자 ID={user_data.user_id}")

        return {"success": True, "message": "사용자가 성공적으로 삭제되었습니다."}
    except Exception as e:
        logging.error(f"사용자 삭제 중 오류 발생: {str(e)}", exc_info=True)
        
        # 함수 종료 로깅 (오류 발생)
        logging.info(f"delete_user_account 완료: 결과=오류, 메시지={str(e)[:100]}")
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "사용자 삭제 중 오류가 발생했습니다.",
            },
        )
