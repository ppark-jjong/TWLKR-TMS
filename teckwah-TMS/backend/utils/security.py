"""
보안 관련 유틸리티 함수
"""

import bcrypt
from backend.utils.logger import logger
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from backend.config import get_settings

settings = get_settings()

# 비밀번호 해싱 설정
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 세션 스토어 (메모리 기반)
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
    
    # 세션 저장 - 추가 정보 포함
    sessions[session_id] = {
        "user_id": user_id,
        "user_role": user_role,
        "expires": expires,
        "created_at": datetime.now(),
        "last_activity": datetime.now(),
        "ip_address": None,  # 요청 컨텍스트에서 설정 필요
        "user_agent": None,  # 요청 컨텍스트에서 설정 필요
    }
    
    # 같은 사용자의 다른 세션 관리 (선택적)
    # 동일 사용자 ID의 기존 세션 확인
    user_sessions = [sid for sid, session in sessions.items() 
                    if session["user_id"] == user_id and sid != session_id]
    
    if user_sessions:
        logger.info(f"사용자 {user_id}의 기존 세션 {len(user_sessions)}개 발견")
        # 필요에 따라 기존 세션 유지 또는 만료 처리
        # 예: 한 사용자당 하나의 세션만 허용하는 경우
        # for old_session_id in user_sessions:
        #     del sessions[old_session_id]
        #     logger.info(f"사용자 {user_id}의 기존 세션 {old_session_id[:8]} 만료 처리")
    
    logger.info(f"세션 생성 완료: 사용자={user_id}, 권한={user_role}, 세션ID={session_id[:8]}")
    logger.info(f"세션 만료 시간: {expires}, 유효 기간: {settings.SESSION_EXPIRE_HOURS}시간")
    
    # 현재 활성 세션 수 로깅
    logger.info(f"현재 활성 세션 수: {len(sessions)}")
    
    return session_id


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """
    세션 ID로 세션 정보 조회
    """
    session = sessions.get(session_id)
    
    if not session:
        logger.warning(f"세션 없음: {session_id[:8]}")
        return None
    
    # 만료 검사
    if session["expires"] < datetime.now():
        # 만료된 세션 삭제
        del sessions[session_id]
        logger.warning(f"세션 만료됨: {session_id[:8]}, 사용자={session['user_id']}")
        return None
    
    # 세션 활동 시간 갱신
    session["last_activity"] = datetime.now()
    
    return session


def delete_session(session_id: str) -> None:
    """
    세션 삭제 (로그아웃)
    """
    if session_id in sessions:
        user_id = sessions[session_id]["user_id"]
        del sessions[session_id]
        logger.info(f"세션 삭제 (로그아웃): {session_id[:8]}, 사용자={user_id}")
    else:
        logger.warning(f"존재하지 않는 세션 삭제 시도: {session_id[:8]}")


def update_session_metadata(session_id: str, request: Request) -> None:
    """
    세션 메타데이터 업데이트 (IP, User-Agent 등)
    """
    if session_id in sessions:
        sessions[session_id]["ip_address"] = request.client.host if request.client else None
        sessions[session_id]["user_agent"] = request.headers.get("user-agent")
        logger.debug(f"세션 메타데이터 업데이트: {session_id[:8]}, IP={request.client.host if request.client else 'unknown'}")


def get_active_sessions() -> List[Dict[str, Any]]:
    """
    현재 활성 세션 목록 반환 (관리 및 모니터링용)
    """
    now = datetime.now()
    active_sessions = []
    
    for session_id, session in sessions.items():
        if session["expires"] > now:
            session_info = {
                "session_id": session_id[:8] + "...",  # 보안을 위해 일부만 표시
                "user_id": session["user_id"],
                "user_role": session["user_role"],
                "created_at": session["created_at"],
                "expires": session["expires"],
                "ip_address": session.get("ip_address"),
                "last_activity": session.get("last_activity"),
            }
            active_sessions.append(session_info)
    
    return active_sessions


def cleanup_expired_sessions() -> None:
    """
    만료된 세션 정리 (주기적으로 호출 필요)
    """
    now = datetime.now()
    expired_sessions = [
        (session_id, sessions[session_id]["user_id"])
        for session_id, session in sessions.items()
        if session["expires"] < now
    ]
    
    for session_id, user_id in expired_sessions:
        del sessions[session_id]
        logger.info(f"만료된 세션 자동 정리: {session_id[:8]}, 사용자={user_id}")
    
    if expired_sessions:
        logger.info(f"만료된 세션 {len(expired_sessions)}개 정리 완료, 남은 세션 수: {len(sessions)}")
    
    # 비활성 세션 체크 (선택적)
    inactive_threshold = datetime.now() - timedelta(hours=1)  # 1시간 이상 비활성
    inactive_sessions = [
        session_id
        for session_id, session in sessions.items()
        if session.get("last_activity", session["created_at"]) < inactive_threshold
    ]
    
    if inactive_sessions:
        logger.info(f"비활성 세션 수: {len(inactive_sessions)}개 (1시간 이상 비활성)")
