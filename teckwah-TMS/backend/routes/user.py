"""
사용자 관리 관련 라우트 - 서비스 레이어 패턴 적용
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from backend.utils.logger import logger
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from backend.database import get_db
from backend.models.user import (
    User,  # SQLAlchemy 모델
    UserCreate,
    UserUpdate,
    UserResponse,  # 추가
    UserListResponse,  # 추가
)
from backend.models.dashboard import BasicSuccessResponse  # Dashboard 모델 재사용
from backend.middleware.auth import get_current_user, admin_required
from backend.services.user_service import (
    get_users as service_get_users,
    get_user as service_get_user,
    create_user as service_create_user,
    delete_user as service_delete_user,
)

router = APIRouter()


@router.get(
    "/", response_model=UserListResponse, dependencies=[Depends(admin_required)]
)
async def get_users(
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(1000, ge=1, le=1000, description="페이지당 항목 수"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> UserListResponse:
    """
    사용자 목록 조회 (관리자 전용, response_model 사용)
    """
    logger.api(f"사용자 목록 조회 - 사용자: {current_user['user_id']}, 페이지: {page}")
    response_dict = service_get_users(
        db=db, page=page, limit=limit, current_user_id=current_user["user_id"]
    )

    items_response = []
    problematic_items = []  # 문제 있는 항목 기록용

    # --- 디버깅을 위해 try-except 추가 ---
    raw_items = response_dict["data"]["items"]
    logger.debug(
        f"서비스에서 반환된 raw_items 개수: {len(raw_items)}"
    )  # 서비스 반환 개수 로깅

    for item in raw_items:
        try:
            # User 객체의 필드 값 로깅 (개인정보 주의하며 필요한 필드만)
            logger.debug(
                f"ORM 변환 시도: user_id={item.user_id}, department={item.user_department}, role={item.user_role}"
            )
            user_resp = UserResponse.from_orm(item)
            items_response.append(user_resp)
        except Exception as e:
            # 변환 실패 시 로그 기록 및 문제 항목 저장
            logger.error(
                f"UserResponse.from_orm 변환 실패: user_id={item.user_id}, 오류={e}"
            )
            problematic_items.append({"user_id": item.user_id, "error": str(e)})
            # 실패한 항목은 제외하고 계속 진행 (선택적: 여기서 에러를 발생시킬 수도 있음)
            raise HTTPException(
                status_code=500,
                detail=f"사용자 데이터 변환 오류 발생 (ID: {item.user_id}): {e}",
            )

    if problematic_items:
        # 문제가 있었음을 로그로 남기거나, 특정 응답 반환 가능
        logger.warning(f"일부 사용자 데이터 변환 실패: {len(problematic_items)}건")

    logger.debug(
        f"UserResponse 변환 완료된 items_response 개수: {len(items_response)}"
    )  # 변환된 개수 로깅

    # 변환 성공한 데이터만으로 UserListResponse 생성
    try:
        final_response = UserListResponse(
            items=items_response,  # 변환 성공한 목록 사용
            total=response_dict["data"]["total"],
            page=response_dict["data"]["page"],
            limit=response_dict["data"]["limit"],
        )
        return final_response
    except Exception as e:
        # 최종 UserListResponse 생성 실패 시 로깅 및 에러 발생
        logger.error(f"최종 UserListResponse 생성 실패: {e}")
        raise HTTPException(
            status_code=500, detail=f"사용자 목록 응답 생성 중 오류 발생: {e}"
        )


@router.post("/", response_model=UserResponse, dependencies=[Depends(admin_required)])
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> UserResponse:
    """
    새 사용자 생성 (관리자 전용, response_model 사용)
    """
    logger.api(
        f"사용자 생성 - 사용자 ID: {user.userId}, 요청자: {current_user['user_id']}"
    )
    response_dict = service_create_user(
        db=db,
        user_data=user.dict(by_alias=True),
        current_user_id=current_user["user_id"],
    )
    if not response_dict["success"]:
        if response_dict["error_code"] == "DUPLICATE_ID":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=response_dict["message"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="사용자 생성 중 오류 발생",
            )

    # 서비스가 반환한 딕셔너리를 UserResponse 모델로 변환
    return UserResponse(**response_dict["data"])


@router.delete(
    "/{user_id}",
    response_model=BasicSuccessResponse,
    dependencies=[Depends(admin_required)],
)
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> BasicSuccessResponse:
    """
    사용자 삭제 (관리자 전용, response_model 사용)
    """
    logger.api(f"사용자 삭제 - 대상 ID: {user_id}, 요청자: {current_user['user_id']}")
    response_dict = service_delete_user(
        db=db, user_id=user_id, current_user_id=current_user["user_id"]
    )
    if not response_dict["success"]:
        if response_dict["error_code"] == "NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=response_dict["message"]
            )
        elif response_dict["error_code"] == "SELF_DELETE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=response_dict["message"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="사용자 삭제 중 오류 발생",
            )

    return BasicSuccessResponse(message=response_dict["message"])
