from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from datetime import datetime

from app.config.database import get_db
from app.config.settings import get_settings
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_info, log_error
from app.models.dashboard_model import Dashboard
from app.schemas.dashboard_schema import StatusUpdate

settings = get_settings()


async def get_token_from_header(request: Request) -> str:
    """요청 헤더에서 토큰 추출"""
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 토큰이 필요합니다",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return authorization.split(" ")[1]


async def verify_token(token: str = Depends(get_token_from_header)) -> TokenData:
    """토큰 검증 및 페이로드 추출"""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )

        # 토큰 만료 검증
        exp = payload.get("exp")
        if not exp or datetime.utcnow().timestamp() > exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="토큰이 만료되었습니다"
            )

        return TokenData(
            user_id=payload.get("sub"),
            department=payload.get("department"),
            role=payload.get("role"),
        )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다"
        )


async def check_admin_access(current_user: TokenData = Depends(verify_token)):
    """관리자 권한 체크"""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="관리자만 접근할 수 있습니다"
        )
    return current_user


async def validate_status_change(
    status_update: StatusUpdate, dashboard: Dashboard, is_admin: bool = False
) -> bool:
    """상태 변경 가능 여부 검증"""
    # 관리자는 모든 상태 변경 가능
    if is_admin:
        return True

    # 배차 정보 확인
    if not dashboard.driver_name or not dashboard.driver_contact:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="배차 담당자가 할당되지 않아 상태를 변경할 수 없습니다",
        )

    # 일반 사용자의 상태 변경 규칙
    allowed_transitions = {
        "WAITING": ["IN_PROGRESS", "CANCEL"],
        "IN_PROGRESS": ["COMPLETE", "ISSUE", "CANCEL"],
        "COMPLETE": [],
        "ISSUE": [],
        "CANCEL": [],
    }

    if status_update.status not in allowed_transitions.get(dashboard.status, []):
        status_text_map = {
            "WAITING": "대기",
            "IN_PROGRESS": "진행",
            "COMPLETE": "완료",
            "ISSUE": "이슈",
            "CANCEL": "취소",
        }
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{status_text_map[dashboard.status]} 상태에서는 "
            f"{status_text_map[status_update.status]}(으)로 변경할 수 없습니다",
        )

    return True


async def get_current_user_department(
    token_data: TokenData = Depends(verify_token),
) -> str:
    """현재 사용자 부서 정보 추출"""
    return token_data.department


async def get_current_user(
    token_data: TokenData = Depends(verify_token),
) -> TokenData:
    """현재 사용자 정보 추출"""
    return token_data
