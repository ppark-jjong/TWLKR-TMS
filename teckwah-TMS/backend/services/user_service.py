"""
사용자 관리 관련 서비스 레이어
"""

from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Dict, Any, List, Optional
from datetime import datetime
import hashlib
import os
import json

from backend.models.user import User
from backend.schemas.user_schema import UserRole, UserCreate, UserResponse
from backend.utils.logger import logger
from passlib.context import CryptContext

# 비밀번호 해싱 설정 (기존 코드 활용)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_users(db: Session, current_user_id: str) -> Dict[str, Any]:
    """모든 사용자 목록 조회 서비스 - 페이지네이션 제거"""
    logger.debug(f"서비스 get_users 시작 - 요청자: {current_user_id}")
    try:
        # --- [로그 3 & 4] DB 조회 및 로깅 ---
        query = db.query(User)

        # 전체 사용자 수 계산
        total_count = query.with_entities(func.count(User.user_id)).scalar()
        logger.db(f"  전체 사용자 수 조회: {total_count}")

        # 페이지네이션 없이 전체 사용자 목록 조회
        users = query.all()
        logger.db(f"  사용자 목록 조회 성공: {len(users)} 건")

        # 조회된 사용자 데이터 로깅 (일부)
        if users:
            logger.debug(f"    조회된 첫번째 User ORM 객체 타입: {type(users[0])}")
            for i, user_orm in enumerate(users):
                try:
                    orm_dict = {
                        "user_id": getattr(user_orm, "user_id", "N/A"),
                        "user_department": getattr(user_orm, "user_department", "N/A"),
                        "user_role": getattr(user_orm, "user_role", "N/A"),
                        # 비밀번호는 로깅하지 않음
                    }
                    logger.debug(f"    Raw User ORM Data [{i}]: {orm_dict}")
                except Exception as e_orm_log:
                    logger.warning(
                        f"    Raw User ORM Data [{i}] 로깅 중 오류: {e_orm_log}"
                    )
        else:
            logger.debug("    조회된 User 데이터 없음")
        # -------------------------------------

        # --- [로그 6] 서비스 반환 딕셔너리 생성 및 로깅 ---
        response_data = {
            "items": users,  # ORM 객체 리스트 그대로 전달
            "total": total_count,
            # 페이지, 제한 정보 제거
        }
        final_response_dict = {
            "success": True,
            "message": "사용자 목록 조회 성공",
            "data": response_data,
        }
        logger.debug(
            f"서비스 get_users 최종 반환 dict (요약): success={final_response_dict.get('success')}, data.items_len={len(response_data.get('items',[]))}, data.total={response_data.get('total')}"
        )
        return final_response_dict
        # ---------------------------------------------

    except Exception as e:
        logger.error(f"사용자 목록 조회 중 오류 발생: {e}", exc_info=True)
        return {
            "success": False,
            "message": f"사용자 목록 조회 오류: {e}",
            "data": None,
        }


def get_user(db: Session, user_id: str) -> Optional[User]:
    """특정 사용자 조회 서비스"""
    logger.debug(f"서비스 get_user 시작 - user_id: {user_id}")
    try:
        user = db.query(User).filter(User.user_id == user_id).first()
        if user:
            logger.db(f"사용자 조회 성공: {user_id}")
            # 로깅: 조회된 사용자 정보 (비밀번호 제외)
            user_info = {
                k: getattr(user, k) for k in user.__dict__ if k != "user_password"
            }
            logger.debug(f"  조회된 사용자 정보: {user_info}")
        else:
            logger.db(f"사용자 조회 실패 - 찾을 수 없음: {user_id}")
        return user
    except Exception as e:
        logger.error(f"사용자({user_id}) 조회 중 오류 발생: {e}", exc_info=True)
        return None  # 오류 시 None 반환


def create_user(
    db: Session, user_data: Dict[str, Any], current_user_id: str
) -> Dict[str, Any]:
    """사용자 생성 서비스"""
    logger.debug(f"서비스 create_user 시작 - 요청자: {current_user_id}")
    logger.debug(
        f"  생성할 사용자 데이터 (dict): {user_data}"
    )  # 비밀번호 포함될 수 있으므로 주의

    # 사용자 ID 중복 확인
    existing_user = (
        db.query(User).filter(User.user_id == user_data.get("user_id")).first()
    )
    if existing_user:
        logger.warning(f"사용자 생성 실패 - ID 중복: {user_data.get('user_id')}")
        return {
            "success": False,
            "message": "이미 존재하는 사용자 ID입니다.",
            "error_code": "DUPLICATE_ID",
            "data": None,
        }

    try:
        # 비밀번호 해싱
        hashed_password = get_password_hash(user_data["user_password"])
        logger.debug(f"  비밀번호 해싱 완료 (user_id: {user_data.get('user_id')})")

        # DB 모델 객체 생성
        db_user = User(
            user_id=user_data["user_id"],
            user_password=hashed_password,
            user_department=user_data["user_department"],
            user_role=user_data["user_role"],
            update_by=current_user_id,  # 생성자 정보 추가
            update_at=datetime.now(),  # 생성 시간 추가
        )
        logger.debug(
            f"  생성된 User ORM 객체 (비밀번호 제외): user_id={db_user.user_id}, dept={db_user.user_department}, role={db_user.user_role}"
        )

        # DB에 추가 및 커밋
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        logger.db(f"사용자 생성 DB 반영 완료 - ID: {db_user.user_id}")

        # 성공 응답 반환 (생성된 사용자 정보 포함, 비밀번호 제외)
        created_user_info = {
            "user_id": db_user.user_id,
            "user_department": db_user.user_department,
            "user_role": db_user.user_role,
            # 필요한 다른 필드 추가 가능
        }
        logger.debug(f"서비스 create_user 성공. 반환 데이터: {created_user_info}")
        return {
            "success": True,
            "message": "사용자 생성 성공",
            "data": created_user_info,
        }

    except KeyError as ke:
        logger.error(f"사용자 생성 실패 - 필수 필드 누락: {ke}", exc_info=True)
        logger.error(f"  실패 당시 데이터: {user_data}")
        db.rollback()
        return {
            "success": False,
            "message": f"필수 정보 누락: {ke}",
            "error_code": "MISSING_FIELD",
            "data": None,
        }
    except Exception as e:
        logger.error(f"사용자 생성 중 오류 발생: {e}", exc_info=True)
        db.rollback()
        return {
            "success": False,
            "message": f"사용자 생성 중 오류 발생: {e}",
            "error_code": "INTERNAL_ERROR",
            "data": None,
        }


def delete_user(db: Session, user_id: str, current_user_id: str) -> Dict[str, Any]:
    """사용자 삭제 서비스"""
    logger.debug(
        f"서비스 delete_user 시작 - 대상 ID: {user_id}, 요청자: {current_user_id}"
    )

    # 자기 자신 삭제 방지
    if user_id == current_user_id:
        logger.warning(f"사용자 삭제 실패 - 자기 자신 삭제 시도: {user_id}")
        return {
            "success": False,
            "message": "자기 자신은 삭제할 수 없습니다.",
            "error_code": "SELF_DELETE",
            "data": None,
        }

    # 사용자 조회
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        logger.warning(f"사용자 삭제 실패 - 찾을 수 없음: {user_id}")
        return {
            "success": False,
            "message": "삭제할 사용자를 찾을 수 없습니다.",
            "error_code": "NOT_FOUND",
            "data": None,
        }

    try:
        # 사용자 삭제
        db.delete(user)
        db.commit()
        logger.db(f"사용자 삭제 DB 반영 완료 - ID: {user_id}")
        logger.debug(f"서비스 delete_user 성공")
        return {"success": True, "message": "사용자 삭제 성공", "data": None}
    except Exception as e:
        logger.error(f"사용자({user_id}) 삭제 중 오류 발생: {e}", exc_info=True)
        db.rollback()
        return {
            "success": False,
            "message": f"사용자 삭제 중 오류 발생: {e}",
            "error_code": "INTERNAL_ERROR",
            "data": None,
        }


# update_user 함수가 없으므로 추가적인 수정은 생략
