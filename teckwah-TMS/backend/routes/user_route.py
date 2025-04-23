"""
사용자 관리 관련 라우터
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Request,
    Query,
    Path,
    Body,
)
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from backend.utils.database import get_db
from backend.services.user_service import UserService
from backend.schemas.user_schema import UserCreate, UserUpdate, UserResponse
from backend.schemas.common_schema import (
    SuccessResponse,
    ErrorResponse,
    PaginationParams,
)
from backend.utils.security import get_current_user, get_admin_user
from backend.utils.logger import logger

router = APIRouter()


@router.get("/list", response_model=SuccessResponse)
async def get_users(
    request: Request = None,
    role: Optional[str] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    page: Optional[int] = Query(1, ge=1),
    limit: Optional[int] = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    사용자 목록 조회 (관리자 전용)
    - page: 페이지 번호 (기본값: 1)
    - limit: 페이지당 항목 수 (기본값: 10)
    - role, department: 필터링 조건
    - search: 사용자 ID 검색
    """
    try:
        # 관리자 권한 확인
        user_data = get_admin_user(get_current_user(request))

        # 페이지네이션 계산
        skip = (page - 1) * limit

        # 사용자 목록 조회
        users, total = UserService.get_users(
            db, skip=skip, limit=limit, role=role, department=department, search=search
        )

        # 응답 데이터
        return SuccessResponse(
            success=True,
            message="사용자 목록 조회 성공",
            data={
                "items": [
                    UserResponse.model_validate(user).model_dump() for user in users
                ],
                "total": total,
                "page": page,
                "limit": limit,
            },
        ).model_dump()

    except HTTPException as e:
        return ErrorResponse(success=False, message=e.detail).model_dump()
    except Exception as e:
        logger.error(f"사용자 목록 조회 중 오류: {str(e)}")
        return ErrorResponse(
            success=False, message="사용자 목록 조회 중 오류가 발생했습니다"
        ).model_dump()


@router.post("", response_model=SuccessResponse)
async def create_user(
    user_data: UserCreate, request: Request = None, db: Session = Depends(get_db)
):
    """
    새 사용자 생성 (관리자 전용)
    """
    try:
        # 관리자 권한 확인
        admin_data = get_admin_user(get_current_user(request))

        # 사용자 생성
        try:
            new_user = UserService.create_user(db, user_data)
        except ValueError as e:
            return ErrorResponse(success=False, message=str(e)).model_dump()

        # 응답 데이터
        return SuccessResponse(
            success=True,
            message="사용자 생성 성공",
            data=UserResponse.model_validate(new_user).model_dump(),
        ).model_dump()

    except HTTPException as e:
        return ErrorResponse(success=False, message=e.detail).model_dump()
    except Exception as e:
        logger.error(f"사용자 생성 중 오류: {str(e)}")
        return ErrorResponse(
            success=False, message=f"사용자 생성 중 오류가 발생했습니다: {str(e)}"
        ).model_dump()


@router.delete("/{user_id}", response_model=SuccessResponse)
async def delete_user(
    user_id: str = Path(...), request: Request = None, db: Session = Depends(get_db)
):
    """
    사용자 삭제 (관리자 전용)
    - user_id: 사용자 ID
    """
    try:
        # 관리자 권한 확인
        admin_data = get_admin_user(get_current_user(request))
        admin_id = admin_data.get("user_id")

        # 자기 자신을 삭제하려는 경우 방지
        if user_id == admin_id:
            return ErrorResponse(
                success=False, message="자기 자신을 삭제할 수 없습니다"
            ).model_dump()

        # 사용자 삭제
        success = UserService.delete_user(db, user_id)

        if not success:
            return ErrorResponse(
                success=False, message="사용자를 찾을 수 없습니다"
            ).model_dump()

        # 응답 데이터
        return SuccessResponse(success=True, message="사용자 삭제 성공").model_dump()

    except HTTPException as e:
        return ErrorResponse(success=False, message=e.detail).model_dump()
    except Exception as e:
        logger.error(f"사용자 삭제 중 오류: {str(e)}")
        return ErrorResponse(
            success=False, message="사용자 삭제 중 오류가 발생했습니다"
        ).model_dump()
