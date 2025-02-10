"""인증 관련 서비스"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Union
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
import os

from app.repositories.user_repository import UserRepository
from app.repositories.token_repository import TokenRepository
from app.utils.logger_util import Logger
from app.schemas.auth_schema import UserResponse, UserDepartment, UserRole
from app.models.user_model import User

from app.models.token_model import RefreshToken

# JWT 설정
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
REFRESH_SECRET_KEY = os.getenv("JWT_REFRESH_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

if not SECRET_KEY or not REFRESH_SECRET_KEY:
    raise ValueError("JWT 시크릿 키가 설정되지 않았습니다.")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.token_repo = TokenRepository(db)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """비밀번호 검증"""
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """비밀번호 해싱"""
        return pwd_context.hash(password)

    async def authenticate_user(self, user_id: str, password: str) -> Optional[Dict]:
        """사용자 인증"""
        try:
            Logger.debug(f"사용자 인증 시도: {user_id}")
            user = self.user_repo.get_by_id(user_id)
            
            if not user:
                Logger.warning(f"존재하지 않는 사용자: {user_id}")
                return None
                
            if not user.verify_password(password):
                Logger.warning(f"잘못된 비밀번호: {user_id}")
                return None

            # 토큰 생성
            access_token = self.create_access_token(user.token_data)
            refresh_token = self.create_refresh_token(user.token_data)
            
            # 리프레시 토큰 저장
            expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
            RefreshToken.create(self.db, user.user_id, refresh_token, expires_at)

            Logger.info(f"사용자 인증 성공: {user_id}")
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "user": user.to_dict()
            }
        except Exception as e:
            Logger.error(f"사용자 인증 중 오류 발생: {str(e)}")
            raise

    def create_access_token(self, data: dict) -> str:
        """액세스 토큰 생성"""
        try:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            to_encode = data.copy()
            to_encode.update({"exp": expire, "type": "access"})
            return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        except Exception as e:
            Logger.error(f"액세스 토큰 생성 중 오류 발생: {str(e)}")
            raise

    def create_refresh_token(self, data: dict) -> str:
        """리프레시 토큰 생성"""
        try:
            expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
            to_encode = data.copy()
            to_encode.update({"exp": expire, "type": "refresh"})
            return jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)
        except Exception as e:
            Logger.error(f"리프레시 토큰 생성 중 오류 발생: {str(e)}")
            raise

    def verify_token(self, token: str, is_refresh: bool = False) -> Optional[str]:
        """토큰 검증"""
        try:
            secret = REFRESH_SECRET_KEY if is_refresh else SECRET_KEY
            payload = jwt.decode(token, secret, algorithms=[ALGORITHM])

            user_id: str = payload.get("sub")
            token_type: str = payload.get("type")
            expected_type = "refresh" if is_refresh else "access"

            if not user_id or token_type != expected_type:
                return None

            return user_id
        except JWTError:
            return None

    def verify_refresh_token(self, refresh_token: str) -> Optional[str]:
        """리프레시 토큰 검증"""
        try:
            # DB에서 토큰 확인
            stored_token = self.token_repo.get_by_token(refresh_token)
            if not stored_token or stored_token.expires_at < datetime.utcnow():
                Logger.warning("저장된 리프레시 토큰이 없거나 만료됨")
                return None

            # 토큰 검증
            user_id = self.verify_token(refresh_token, is_refresh=True)
            if not user_id:
                Logger.warning("리프레시 토큰 검증 실패")
                return None

            return user_id
        except Exception as e:
            Logger.error(f"리프레시 토큰 검증 중 오류 발생: {str(e)}")
            return None

    def delete_refresh_token(self, refresh_token: str) -> bool:
        """리프레시 토큰 삭제 (로그아웃)"""
        try:
            return bool(self.token_repo.delete(refresh_token))
        except Exception as e:
            Logger.error(f"리프레시 토큰 삭제 중 오류 발생: {str(e)}")
            return False

    async def get_current_user(self, token: str) -> UserResponse:
        """현재 사용자 정보 조회"""
        try:
            # 토큰 검증
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="유효하지 않은 토큰입니다.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # DB에서 사용자 조회
            user = self.user_repo.get_by_id(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="존재하지 않는 사용자입니다.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            return UserResponse(
                user_id=user.user_id,
                user_department=user.user_department,
                user_role=user.user_role
            )

        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않은 토큰입니다.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            Logger.error(f"사용자 정보 조회 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="사용자 정보 조회 중 오류가 발생했습니다.",
            )

    async def refresh_token(self, refresh_token: str) -> Optional[Dict]:
        """토큰 갱신"""
        try:
            # 리프레시 토큰 검증
            payload = jwt.decode(refresh_token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if not user_id:
                return None

            # DB에서 토큰 확인
            stored_token = self.token_repo.get_by_token(refresh_token)
            if not stored_token or stored_token.expires_at < datetime.utcnow():
                return None

            # 새 토큰 생성
            user = self.user_repo.get_by_id(user_id)
            if not user:
                return None

            access_token = self.create_access_token(user.token_data)
            new_refresh_token = self.create_refresh_token(user.token_data)

            # 기존 토큰 삭제 및 새 토큰 저장
            self.token_repo.delete(refresh_token)
            expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
            RefreshToken.create(self.db, user.user_id, new_refresh_token, expires_at)

            return {
                "access_token": access_token,
                "refresh_token": new_refresh_token,
                "token_type": "bearer"
            }
        except Exception as e:
            Logger.error(f"토큰 갱신 중 오류 발생: {str(e)}")
            return None

    async def logout(self, refresh_token: str) -> bool:
        """로그아웃"""
        try:
            return bool(self.token_repo.delete(refresh_token))
        except Exception as e:
            Logger.error(f"로그아웃 중 오류 발생: {str(e)}")
            return False


# 의존성 주입을 위한 함수
def get_db() -> Session:
    """데이터베이스 세션 생성"""
    from app.config.database import SessionLocal

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    """AuthService 인스턴스 생성"""
    return AuthService(db)


# 현재 사용자 가져오기 의존성
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    """현재 사용자 정보 조회 의존성"""
    return await auth_service.get_current_user(token)
