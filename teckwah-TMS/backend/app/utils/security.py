"""
보안 관련 유틸리티 함수
"""
import bcrypt
from app.utils.logger import logger
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from app.config import get_settings

settings = get_settings()

# 비밀번호 해싱 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 세션 스토어 (메모리 기반)
# 실제 프로덕션에서는 Redis 등 외부 저장소 사용 권장
sessions: Dict[str, Dict[str, Any]] = {}

def get_password_hash(password: str) -> str:
    """
    비밀번호를 해시화
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    비밀번호 검증
    """
    return pwd_context.verify(plain_password, hashed_password)

def create_session(user_id: str, user_role: str) -> str:
    """
    세션 생성 및 세션 ID 반환
    """
    import uuid
    session_id = str(uuid.uuid4())
    
    # 세션 만료 시간 설정
    expires = datetime.now() + timedelta(hours=settings.SESSION_EXPIRE_HOURS)
    
    # 세션 저장
    sessions[session_id] = {
        "user_id": user_id,
        "user_role": user_role,
        "expires": expires
    }
    
    return session_id

def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """
    세션 ID로 세션 정보 조회
    """
    session = sessions.get(session_id)
    
    if not session:
        return None
    
    # 만료 검사
    if session["expires"] < datetime.now():
        # 만료된 세션 삭제
        del sessions[session_id]
        return None
    
    return session

def delete_session(session_id: str) -> None:
    """
    세션 삭제 (로그아웃)
    """
    if session_id in sessions:
        del sessions[session_id]

def cleanup_expired_sessions() -> None:
    """
    만료된 세션 정리 (주기적으로 호출 필요)
    """
    now = datetime.now()
    expired_sessions = [
        session_id for session_id, session in sessions.items()
        if session["expires"] < now
    ]
    
    for session_id in expired_sessions:
        del sessions[session_id]
    
    if expired_sessions:
        logger.info(f"만료된 세션 {len(expired_sessions)}개 정리 완료")
