import os
import uuid
from datetime import datetime, timedelta
from fastapi import HTTPException, status, Depends, Request
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.models.user_model import User
from app.repositories.user_repository import UserRepository
from app.repositories.session_repository import SessionRepository
from app.models.session_model import Session as SessionModel
from app.schemas.auth_schema import UserResponse
from fastapi.responses import Response

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SESSION_EXPIRE_HOURS = int(os.getenv("SESSION_EXPIRE_HOURS", 4))

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.session_repo = SessionRepository(db)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    async def login(self, user_id: str, password: str) -> dict:
        user = self.user_repo.get_by_id(user_id)
        if not user or not self.verify_password(password, user.user_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
        session_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=SESSION_EXPIRE_HOURS)
        new_session = SessionModel(session_id=session_id, user_id=user.user_id, expires_at=expires_at)
        self.session_repo.create_session(new_session)
        return {"user": UserResponse(user_id=user.user_id, user_department=user.user_department, user_role=user.user_role), "session_id": session_id}

    async def logout(self, session_id: str):
        if not self.session_repo.delete_session(session_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않은 세션입니다.")

def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="세션이 존재하지 않습니다.")
    session_repo = SessionRepository(db)
    session_obj = session_repo.get_session_by_id(session_id)
    if not session_obj:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 세션입니다.")
    if session_obj.expires_at < datetime.utcnow():
        session_repo.delete_session(session_id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="세션이 만료되었습니다.")
    user = UserRepository(db).get_by_id(session_obj.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="존재하지 않는 사용자입니다.")
    return user
