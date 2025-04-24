"""
사용자 관리 관련 라우터
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query, Path, status, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from main.core.templating import templates
from main.utils.database import get_db
from main.utils.security import get_admin_user, hash_password  # 관리자 전용 페이지
from main.utils.logger import logger
from main.schema.user_schema import (
    UserCreate,
    UserUpdate,
    UserResponse
)
from main.service.user_service import (
    get_user_list,
    get_user_by_id,
    create_user,
    update_user,
    update_user_status,
    reset_user_password
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
    role: Optional[str] = None,
    search_type: Optional[str] = None,
    search_value: Optional[str] = None,
):
    """
    사용자 관리 페이지 렌더링 (관리자 전용)
    """
    try:
        # 사용자 목록 조회
        users, pagination = get_user_list(
            db=db,
            page=page,
            page_size=limit,
            role=role if role and role != "all" else None,
            search_type=search_type,
            search_value=search_value
        )
        
        logger.info(f"사용자 관리 페이지 접근: 사용자 {len(users)}개 조회됨")
        
        # 필터 상태 저장 (UI에서 선택된 필터 유지)
        filter_state = {
            "role": role or "all",
            "search_type": search_type or "user_id",
            "search_value": search_value or ""
        }
        
        # 템플릿 렌더링
        return templates.TemplateResponse(
            "users.html",
            {
                "request": request,
                "user": current_user,
                "users": users,
                "current_page": page,
                "total_pages": pagination["total_pages"],
                "filter": filter_state
            }
        )
    except Exception as e:
        logger.error(f"사용자 관리 페이지 렌더링 중 오류 발생: {str(e)}", exc_info=True)
        # 오류 발생 시 에러 페이지 렌더링
        return templates.TemplateResponse(
            "error.html",
            {
                "request": request,
                "error_message": "사용자 목록을 불러오는 중 오류가 발생했습니다.",
                "error_detail": str(e),
            },
            status_code=500
        )

@router.get("/api/users/{user_id}")
async def get_user_detail(
    request: Request,
    user_id: str = Path(...),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),  # 관리자만 접근 가능
):
    """
    사용자 상세 조회 API (관리자 전용)
    """
    try:
        user = get_user_by_id(db, user_id)
        
        if not user:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"success": False, "message": "사용자를 찾을 수 없습니다."}
            )
            
        # 응답 데이터 구성 (비밀번호 제외)
        user_data = {
            "user_id": user.user_id,
            "user_name": user.user_name,
            "user_role": user.user_role,
            "user_department": user.user_department,
            "user_status": user.user_status,
            "created_at": user.created_at.strftime("%Y-%m-%d %H:%M") if user.created_at else None,
            "updated_at": user.updated_at.strftime("%Y-%m-%d %H:%M") if user.updated_at else None,
            "updated_by": user.updated_by
        }
        
        return {"success": True, "data": user_data}
    except Exception as e:
        logger.error(f"사용자 상세 조회 중 오류 발생: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "사용자 상세 조회 중 오류가 발생했습니다."}
        )

@router.post("/api/users")
async def create_new_user(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),  # 관리자만 접근 가능
):
    """
    사용자 생성 API (관리자 전용)
    """
    try:
        # 아이디 중복 확인
        existing_user = get_user_by_id(db, user_data.user_id)
        if existing_user:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"success": False, "message": "이미 존재하는 사용자 ID입니다."}
            )
            
        # 비밀번호 해싱
        hashed_password = hash_password(user_data.user_password)
        
        # 사용자 생성
        new_user = create_user(
            db=db,
            user_id=user_data.user_id,
            user_name=user_data.user_name,
            user_password=hashed_password,
            user_role=user_data.user_role,
            user_department=user_data.user_department,
            created_by=current_user.get("user_id")
        )
        
        logger.info(f"새 사용자 생성: {user_data.user_id} (권한: {user_data.user_role}, 부서: {user_data.user_department})")
        
        return {
            "success": True, 
            "message": "사용자가 성공적으로 생성되었습니다.",
            "user_id": new_user.user_id
        }
    except Exception as e:
        logger.error(f"사용자 생성 중 오류 발생: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "사용자 생성 중 오류가 발생했습니다."}
        )

@router.put("/api/users/{user_id}")
async def update_user_info(
    request: Request,
    user_id: str = Path(...),
    user_data: UserUpdate = None,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),  # 관리자만 접근 가능
):
    """
    사용자 정보 수정 API (관리자 전용)
    """
    try:
        # 기존 사용자 조회
        user = get_user_by_id(db, user_id)
        
        if not user:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"success": False, "message": "사용자를 찾을 수 없습니다."}
            )
            
        # 비밀번호 처리 (변경 요청 시에만)
        password_hash = None
        if user_data.user_password:
            password_hash = hash_password(user_data.user_password)
            
        # 사용자 정보 업데이트
        updated_user = update_user(
            db=db,
            user_id=user_id,
            user_name=user_data.user_name,
            user_password=password_hash,  # None이면 변경 안함
            user_role=user_data.user_role,
            user_department=user_data.user_department,
            updated_by=current_user.get("user_id")
        )
        
        logger.info(f"사용자 정보 수정: {user_id} (이름: {user_data.user_name}, 권한: {user_data.user_role}, 부서: {user_data.user_department})")
        
        return {
            "success": True, 
            "message": "사용자 정보가 성공적으로 수정되었습니다.",
            "user_id": updated_user.user_id
        }
    except Exception as e:
        logger.error(f"사용자 정보 수정 중 오류 발생: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "사용자 정보 수정 중 오류가 발생했습니다."}
        )

@router.post("/api/users/{user_id}/reset-password")
async def reset_user_pwd(
    request: Request,
    user_id: str = Path(...),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),  # 관리자만 접근 가능
):
    """
    사용자 비밀번호 초기화 API (관리자 전용)
    """
    try:
        # 기본 초기화 비밀번호
        default_password = "TMS12345"
        
        # 비밀번호 해싱
        hashed_password = hash_password(default_password)
        
        # 비밀번호 초기화
        success = reset_user_password(
            db=db,
            user_id=user_id,
            new_password=hashed_password,
            updated_by=current_user.get("user_id")
        )
        
        if not success:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"success": False, "message": "사용자를 찾을 수 없습니다."}
            )
            
        logger.info(f"사용자 비밀번호 초기화: {user_id}")
        
        return {
            "success": True, 
            "message": "비밀번호가 성공적으로 초기화되었습니다.",
            "default_password": default_password
        }
    except Exception as e:
        logger.error(f"비밀번호 초기화 중 오류 발생: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "비밀번호 초기화 중 오류가 발생했습니다."}
        )

@router.post("/api/users/{user_id}/toggle-status")
async def toggle_user_status(
    request: Request,
    user_id: str = Path(...),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),  # 관리자만 접근 가능
):
    """
    사용자 상태 변경 API (활성화/비활성화, 관리자 전용)
    """
    try:
        # 사용자 상태 변경
        user = update_user_status(
            db=db,
            user_id=user_id,
            updated_by=current_user.get("user_id")
        )
        
        if not user:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"success": False, "message": "사용자를 찾을 수 없습니다."}
            )
            
        new_status = "활성화" if user.user_status == "ACTIVE" else "비활성화"
        logger.info(f"사용자 상태 변경: {user_id} ({new_status})")
        
        return {
            "success": True, 
            "message": f"사용자 상태가 {new_status}로 변경되었습니다.",
            "user_id": user.user_id,
            "user_status": user.user_status
        }
    except Exception as e:
        logger.error(f"사용자 상태 변경 중 오류 발생: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "사용자 상태 변경 중 오류가 발생했습니다."}
        )
