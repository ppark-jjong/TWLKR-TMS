"""
인증 관련 라우트
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from backend.utils.logger import logger
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session
from typing import Dict, Any

from backend.database import get_db
from backend.models.user import User, UserResponse
from backend.utils.security import verify_password, create_session, delete_session
from backend.middleware.auth import get_current_user

router = APIRouter()
security = HTTPBasic()


@router.post("/login")
async def login(
    credentials: HTTPBasicCredentials = Depends(security),
    db: Session = Depends(get_db),
    response: Response = None,
):
    """
    로그인 처리 및 세션 생성
    """
    # DB에서 사용자 조회
    user = db.query(User).filter(User.user_id == credentials.username).first()

    # 인증 실패 시 401 반환
    if not user or not verify_password(credentials.password, user.user_password):
        logger.warning(f"로그인 실패: {credentials.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다",
            headers={"WWW-Authenticate": "Basic"},
        )

    # 세션 생성
    session_id = create_session(user.user_id, user.user_role)
    logger.info(f"로그인 성공: {user.user_id}, 권한: {user.user_role}")

    # 쿠키 설정
    if response:  # response가 None이 아닌 경우에만 쿠키 설정
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            max_age=3600 * 24,  # 1일
            secure=False,  # 개발 환경에서는 False, 프로덕션에서는 True
            samesite="lax",
        )

    # 응답 반환
    return {
        "success": True,
        "message": "로그인 성공",
        "data": {
            "user_id": user.user_id,
            "user_role": user.user_role,
            "user_department": user.user_department,
        },
    }


@router.post("/logout")
async def logout(
    current_user: Dict[str, Any] = Depends(get_current_user),
    response: Response = None,
):
    """
    로그아웃 처리 및 세션 삭제
    """
    # 세션 삭제
    delete_session(current_user["session_id"])
    logger.info(f"로그아웃: {current_user['user_id']}")

    # 쿠키 삭제
    if response:  # response가 None이 아닌 경우에만 쿠키 삭제
        response.delete_cookie(key="session_id")

    # 응답 반환
    return {"success": True, "message": "로그아웃 성공"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    현재 로그인한 사용자 정보 조회
    """
    # DB에서 사용자 조회
    user = db.query(User).filter(User.user_id == current_user["user_id"]).first()

    # 사용자가 없으면 404 반환
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다",
        )

    # 사용자 정보 반환
    return user
