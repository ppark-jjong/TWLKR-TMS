"""
사용자 관리 관련 서비스
"""

from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, or_
from fastapi import HTTPException, status

from main.utils.logger import logger
from main.models.user_model import User  # 모델 임포트


def get_user_list(
    db: Session, 
    page: int = 1, 
    page_size: int = 10,
    role: Optional[str] = None,
    search_type: Optional[str] = None,
    search_value: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    사용자 목록 조회 (페이지네이션)
    """
    try:
        # 기본 쿼리
        query = db.query(User)
        
        # 필터 적용
        if role:
            query = query.filter(User.user_role == role)
            
        if search_type and search_value:
            if search_type == "user_id":
                query = query.filter(User.user_id.like(f"%{search_value}%"))
            elif search_type == "user_name":
                query = query.filter(User.user_name.like(f"%{search_value}%"))
            elif search_type == "user_department":
                query = query.filter(User.user_department.like(f"%{search_value}%"))
        
        # 전체 건수 조회
        total = query.count()
        
        # 페이지네이션 계산
        total_pages = (total + page_size - 1) // page_size  # 올림 나눗셈
        offset = (page - 1) * page_size
        
        # 사용자 목록 조회 (최신순)
        users = query.order_by(desc(User.created_at))\
            .offset(offset)\
            .limit(page_size)\
            .all()
            
        # 응답 데이터 가공
        user_list = []
        for user in users:
            user_list.append({
                "user_id": user.user_id,
                "user_name": user.user_name,
                "user_role": user.user_role,
                "user_department": user.user_department,
                "user_status": user.user_status,
                "created_at": user.created_at.strftime("%Y-%m-%d %H:%M") if user.created_at else None,
                "updated_at": user.updated_at.strftime("%Y-%m-%d %H:%M") if user.updated_at else None,
                "updated_by": user.updated_by
            })
            
        # 페이지네이션 정보
        pagination = {
            "total": total,
            "total_pages": total_pages,
            "current": page,
            "page_size": page_size
        }
        
        return user_list, pagination
        
    except Exception as e:
        logger.error(f"사용자 목록 조회 중 오류 발생: {str(e)}", exc_info=True)
        raise e


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """
    사용자 상세 조회
    """
    try:
        user = db.query(User).filter(User.user_id == user_id).first()
        return user
    except Exception as e:
        logger.error(f"사용자 상세 조회 중 오류 발생: {str(e)}", exc_info=True)
        raise e


def create_user(
    db: Session, 
    user_id: str,
    user_name: str,
    user_password: str,
    user_role: str,
    user_department: str,
    created_by: str
) -> User:
    """
    사용자 생성
    """
    try:
        # 아이디 중복 확인
        existing_user = get_user_by_id(db, user_id)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="이미 존재하는 사용자 ID입니다."
            )
            
        # 새 사용자 생성
        now = datetime.now()
        user = User(
            user_id=user_id,
            user_name=user_name,
            user_password=user_password,  # 해시된 비밀번호가 전달되어야 함
            user_role=user_role,
            user_department=user_department,
            user_status="ACTIVE",  # 기본 상태는 활성화
            created_at=now,
            created_by=created_by
        )
        
        # DB에 저장
        db.add(user)
        db.commit()
        db.refresh(user)
        
        logger.info(f"사용자 생성: ID {user_id}, 권한 {user_role}, 부서 {user_department}")
        
        return user
    except HTTPException:
        # HTTP 예외는 그대로 전달
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"사용자 생성 중 오류 발생: {str(e)}", exc_info=True)
        raise e


def update_user(
    db: Session, 
    user_id: str,
    user_name: str,
    user_password: Optional[str],
    user_role: str,
    user_department: str,
    updated_by: str
) -> User:
    """
    사용자 정보 수정
    """
    try:
        # 사용자 조회
        user = get_user_by_id(db, user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="사용자를 찾을 수 없습니다."
            )
            
        # 사용자 정보 업데이트
        user.user_name = user_name
        user.user_role = user_role
        user.user_department = user_department
        user.updated_at = datetime.now()
        user.updated_by = updated_by
        
        # 비밀번호 변경 (요청 시에만)
        if user_password:
            user.user_password = user_password  # 해시된 비밀번호가 전달되어야 함
        
        # DB에 저장
        db.commit()
        db.refresh(user)
        
        logger.info(f"사용자 정보 수정: ID {user_id}, 수정자 {updated_by}")
        
        return user
    except HTTPException:
        # HTTP 예외는 그대로 전달
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"사용자 정보 수정 중 오류 발생: {str(e)}", exc_info=True)
        raise e


def update_user_status(
    db: Session, 
    user_id: str,
    updated_by: str
) -> Optional[User]:
    """
    사용자 상태 변경 (활성화/비활성화 토글)
    """
    try:
        # 사용자 조회
        user = get_user_by_id(db, user_id)
        
        if not user:
            return None
            
        # 상태 토글 (ACTIVE <-> INACTIVE)
        user.user_status = "INACTIVE" if user.user_status == "ACTIVE" else "ACTIVE"
        user.updated_at = datetime.now()
        user.updated_by = updated_by
        
        # DB에 저장
        db.commit()
        db.refresh(user)
        
        logger.info(f"사용자 상태 변경: ID {user_id}, 상태 {user.user_status}, 수정자 {updated_by}")
        
        return user
    except Exception as e:
        db.rollback()
        logger.error(f"사용자 상태 변경 중 오류 발생: {str(e)}", exc_info=True)
        raise e


def reset_user_password(
    db: Session, 
    user_id: str,
    new_password: str,
    updated_by: str
) -> bool:
    """
    사용자 비밀번호 초기화
    """
    try:
        # 사용자 조회
        user = get_user_by_id(db, user_id)
        
        if not user:
            return False
            
        # 비밀번호 초기화
        user.user_password = new_password  # 해시된 비밀번호가 전달되어야 함
        user.updated_at = datetime.now()
        user.updated_by = updated_by
        
        # DB에 저장
        db.commit()
        
        logger.info(f"사용자 비밀번호 초기화: ID {user_id}, 수정자 {updated_by}")
        
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"사용자 비밀번호 초기화 중 오류 발생: {str(e)}", exc_info=True)
        raise e
