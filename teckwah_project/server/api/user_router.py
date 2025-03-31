# teckwah_project/server/api/user_router.py
from fastapi import APIRouter, Depends, HTTPException, Body, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import constr

from server.config.database import get_db
from server.api.deps import get_current_admin_user
from server.schemas.auth_schema import TokenData, UserResponse
from server.schemas.common_schema import ApiResponse
from server.schemas.user_schema import UserCreate, UserUpdate, UserListResponse
from server.services.user_service import UserService
from server.repositories.user_repository import UserRepository
from server.utils.error import error_handler, ForbiddenException, NotFoundException
from server.utils.constants import MESSAGES

router = APIRouter()


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    """UserService 의존성 주입"""
    repository = UserRepository(db)
    return UserService(repository)


@router.get("", response_model=ApiResponse[UserListResponse])
@error_handler("사용자 목록 조회")
async def get_users(
    token_data: TokenData = Depends(get_current_admin_user),
    user_service: UserService = Depends(get_user_service),
):
    """사용자 목록 조회 API - 관리자 전용

    모든 사용자 목록을 조회합니다.
    """
    users = await user_service.get_all_users()
    return ApiResponse(
        success=True,
        message="사용자 목록을 조회했습니다",
        data=users,
    )


@router.post("", response_model=ApiResponse[UserResponse])
@error_handler("사용자 생성")
async def create_user(
    user_data: UserCreate,
    token_data: TokenData = Depends(get_current_admin_user),
    user_service: UserService = Depends(get_user_service),
):
    """사용자 생성 API - 관리자 전용

    새로운 사용자를 생성합니다.
    """
    user = await user_service.create_user(user_data)
    return ApiResponse(
        success=True,
        message="사용자가 생성되었습니다",
        data=user,
    )


@router.put("/{user_id}", response_model=ApiResponse[UserResponse])
@error_handler("사용자 정보 수정")
async def update_user(
    user_id: constr(min_length=3, max_length=50) = Path(...),
    user_data: UserUpdate = Body(...),
    token_data: TokenData = Depends(get_current_admin_user),
    user_service: UserService = Depends(get_user_service),
):
    """사용자 정보 수정 API - 관리자 전용

    기존 사용자의 정보를 수정합니다.
    """
    try:
        user = await user_service.update_user(user_id, user_data)
        return ApiResponse(
            success=True,
            message="사용자 정보가 수정되었습니다",
            data=user,
        )
    except NotFoundException:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")


@router.delete("/{user_id}", response_model=ApiResponse)
@error_handler("사용자 삭제")
async def delete_user(
    user_id: constr(min_length=3, max_length=50) = Path(...),
    token_data: TokenData = Depends(get_current_admin_user),
    user_service: UserService = Depends(get_user_service),
):
    """사용자 삭제 API - 관리자 전용

    사용자를 삭제합니다.
    """
    # 자신을 삭제하려는 경우 방지
    if user_id == token_data.user_id:
        raise ForbiddenException("자신의 계정은 삭제할 수 없습니다")

    result = await user_service.delete_user(user_id)
    if not result:
        raise NotFoundException("사용자를 찾을 수 없습니다")

    return ApiResponse(
        success=True,
        message="사용자가 삭제되었습니다",
        data={},
    ) 