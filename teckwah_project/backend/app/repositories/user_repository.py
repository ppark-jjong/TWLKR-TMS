from typing import Optional
from sqlalchemy.orm import Session
from app.models.user_model import User
from .base_repository import BaseRepository
from app.config.database import execute_query
from app.utils.logger_util import Logger


class UserRepository(BaseRepository[User]):
    def __init__(self, db: Session):
        super().__init__(User, db)

    def get_by_user_id(self, user_id: str) -> Optional[User]:
        """사용자 ID로 사용자 조회"""
        return self.db.query(User).filter(User.user_id == user_id).first()

    def get_by_department(self, department: str) -> list[User]:
        """부서별 사용자 목록 조회"""
        try:
            return self.db.query(User).filter(User.user_department == department).all()
        except Exception as e:
            Logger.error(f"부서별 사용자 조회 중 오류 발생: {str(e)}")
            raise

    def verify_password(self, user_id: str, password: str) -> Optional[User]:
        """사용자 인증"""
        user = self.get_by_user_id(user_id)
        if user and user.verify_password(password):
            return user
        return None

    @staticmethod
    def get_by_user_id_from_db(user_id: str) -> Optional[dict]:
        """사용자 ID로 사용자 정보 조회"""
        query = """
        SELECT 
            user_id,
            user_password,
            user_department,
            user_role
        FROM users
        WHERE user_id = %s
        """
        return execute_query(query, (user_id,), fetch_one=True)

    @staticmethod
    def create_user(user_data: dict) -> bool:
        """새로운 사용자 생성"""
        query = """
        INSERT INTO users (
            user_id,
            user_password,
            user_department,
            user_role
        ) VALUES (%s, %s, %s, %s)
        """
        values = (
            user_data["user_id"],
            user_data["user_password"],
            user_data["user_department"],
            user_data["user_role"],
        )
        return bool(execute_query(query, values))

    @staticmethod
    def update_user(user_id: str, update_data: dict) -> bool:
        """사용자 정보 업데이트"""
        set_clause = ", ".join([f"{k} = %s" for k in update_data.keys()])
        query = f"""
        UPDATE users
        SET {set_clause}
        WHERE user_id = %s
        """
        values = (*update_data.values(), user_id)
        return bool(execute_query(query, values))

    @staticmethod
    def delete_user(user_id: str) -> bool:
        """사용자 삭제"""
        query = "DELETE FROM users WHERE user_id = %s"
        return bool(execute_query(query, (user_id,)))

    def get_by_id(self, user_id: str) -> User:
        """사용자 ID로 사용자 조회"""
        try:
            return self.db.query(User).filter(User.user_id == user_id).first()
        except Exception as e:
            Logger.error(f"사용자 조회 중 오류 발생: {str(e)}")
            raise
