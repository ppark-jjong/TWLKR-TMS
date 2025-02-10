# backend/app/repositories/session_repository.py
from sqlalchemy.orm import Session as DBSession
from datetime import datetime
from app.models.session_model import Session

class SessionRepository:
    """
    세션 데이터베이스 인터페이스
    - 새 세션 생성, 세션 조회, 세션 삭제 등의 기능 제공
    """
    def __init__(self, db: DBSession):
        self.db = db

    def create_session(self, session: Session) -> Session:
        """새로운 세션 생성"""
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_session_by_id(self, session_id: str) -> Session:
        """세션 ID로 세션 조회"""
        return self.db.query(Session).filter(Session.session_id == session_id).first()

    def delete_session(self, session_id: str) -> bool:
        """세션 ID에 해당하는 세션 삭제"""
        session_obj = self.get_session_by_id(session_id)
        if session_obj:
            self.db.delete(session_obj)
            self.db.commit()
            return True
        return False

    def clear_sessions_by_user(self, user_id: str):
        """특정 사용자에 해당하는 모든 세션 삭제 (예: 강제 로그아웃 등)"""
        sessions = self.db.query(Session).filter(Session.user_id == user_id).all()
        for session_obj in sessions:
            self.db.delete(session_obj)
        self.db.commit()

    def delete_expired_sessions(self):
        """만료된 세션 삭제 (정기 청소 작업에 활용 가능)"""
        now = datetime.utcnow()
        self.db.query(Session).filter(Session.expires_at < now).delete()
        self.db.commit()
