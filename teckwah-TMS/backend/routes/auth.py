"""
인증 관련 라우트
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from backend.utils.logger import logger
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.orm import Session
from typing import Dict, Any
import json

from backend.database import get_db
from backend.models.user import User, UserResponse
from backend.utils.security import verify_password, create_session, delete_session
from backend.middleware.auth import get_current_user

router = APIRouter()
security = HTTPBasic()


from pydantic import BaseModel


# 로그인 요청 데이터 모델
class LoginRequest(BaseModel):
    username: str
    password: str


from backend.utils.response_utils import success_response, error_response


@router.post("/login")
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
    response: Response = None,
):
    """
    로그인 처리 및 세션 생성
    """
    # 핵심 로그: 로그인 시도
    logger.auth(f"로그인 시도: {login_data.username}")

    # DB에서 사용자 조회
    user = db.query(User).filter(User.user_id == login_data.username).first()

    # 인증 실패 시 401 반환
    if not user or not verify_password(login_data.password, user.user_password):
        logger.auth(f"로그인 실패: {login_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다",
        )

    # 세션 생성
    session_id = create_session(user.user_id, user.user_role)
    logger.auth(f"로그인 성공: {user.user_id}, 권한: {user.user_role}")

    # 쿠키 설정 - response 객체가 있는지 여부와 관계없이 항상 설정
    response = Response() if response is None else response
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        max_age=3600 * 24,  # 1일
        secure=False,  # 개발 환경에서는 False, 프로덕션에서는 True
        samesite="lax",
    )

    # 일관된 응답 형식 사용 (camelCase 키 사용)
    return_data = success_response(
        message="로그인 성공",
        data={
            "userId": user.user_id,
            "userRole": user.user_role,
            "userDepartment": user.user_department,
        },
    )

    # 디버깅을 위한 로그 추가
    logger.info(f"로그인 응답 데이터: {return_data}")

    # 응답 객체에 적용
    return Response(
        content=json.dumps(return_data),
        media_type="application/json",
        headers=dict(response.headers),
        status_code=200,
    )


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
