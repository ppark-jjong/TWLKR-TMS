"""
인증 관련 라우터
"""

from fastapi import APIRouter, Depends, Cookie, Response, Request, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from backend.database import get_db
from backend.services.user_service import UserService
from backend.schemas.user import UserLogin, UserResponse, SessionData
from backend.utils.security import (
    create_session, 
    get_session, 
    delete_session, 
    get_current_user
)
from backend.utils.logger import logger

router = APIRouter()


@router.post("/login")
async def login(
    login_data: UserLogin,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    사용자 로그인 처리
    - 성공 시 세션 쿠키 설정
    """
    # 사용자 인증
    user = UserService.verify_user(db, login_data.user_id, login_data.user_password)
    
    if not user:
        logger.warning(f"로그인 실패: {login_data.user_id}")
        return {
            "success": False,
            "message": "아이디 또는 비밀번호가 올바르지 않습니다"
        }
    
    # 세션 생성
    session_data = {
        "user_id": user.user_id,
        "user_role": user.user_role,
        "user_department": user.user_department
    }
    
    session_id = create_session(session_data)
    
    # 쿠키 설정
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=False,  # HTTPS 사용 시 True로 변경
        samesite="lax",
        max_age=24 * 3600  # 24시간
    )
    
    logger.info(f"로그인 성공: {login_data.user_id}")
    
    # 응답 데이터
    return {
        "success": True,
        "message": "로그인 성공",
        "data": UserResponse(
            userId=user.user_id,
            userDepartment=user.user_department,
            userRole=user.user_role
        ).model_dump()
    }


@router.post("/logout")
async def logout(
    response: Response,
    session_id: Optional[str] = Cookie(None)
):
    """
    사용자 로그아웃 처리
    - 세션 삭제 및 쿠키 제거
    """
    # 세션 존재 확인
    session_data = get_session(session_id)
    
    if session_data:
        # 세션 삭제
        delete_session(session_id)
        logger.info(f"로그아웃: {session_data.get('user_id')}")
    
    # 쿠키 제거
    response.delete_cookie(key="session_id")
    
    return {
        "success": True,
        "message": "로그아웃 성공"
    }


@router.get("/me")
async def get_current_user_info(
    request: Request,
    session_id: Optional[str] = Cookie(None)
):
    """
    현재 로그인한 사용자 정보 조회
    - 세션 유효성 검사
    """
    # 세션 존재 확인
    session_data = get_session(session_id)
    
    if not session_data:
        logger.warning("인증 실패: 세션 없음")
        return {
            "success": False,
            "message": "인증이 필요합니다"
        }
    
    # 사용자 정보 반환
    logger.info(f"인증된 사용자: {session_data.get('user_id')}")
    
    return {
        "success": True,
        "message": "인증 성공",
        "data": {
            "userId": session_data.get("user_id"),
            "userRole": session_data.get("user_role"),
            "userDepartment": session_data.get("user_department")
        }
    }
