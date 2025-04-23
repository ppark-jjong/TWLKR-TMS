"""
데이터베이스 초기화 스크립트
"""

import os
import sys
import logging

# 현재 경로 추가 (backend 폴더를 import 가능하게)
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, current_dir)
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from backend.database import engine, get_db
from backend.models import User, Dashboard, Handover, PostalCode, PostalCodeDetail
from backend.models.user import Base
from backend.services.user_service import UserService
from backend.schemas.user import UserCreate
from backend.utils.security import hash_password

# 기본 관리자 계정 정보
ADMIN_ID = "admin"
ADMIN_PASSWORD = "admin1234"
ADMIN_DEPARTMENT = "CS"


def create_tables():
    """데이터베이스 테이블 생성"""
    Base.metadata.create_all(bind=engine)
    print("✅ 데이터베이스 테이블 생성 완료")


def initialize_data():
    """기본 데이터 초기화"""
    db = next(get_db())
    
    try:
        # 관리자 계정 확인
        admin = db.query(User).filter(User.user_id == ADMIN_ID).first()
        
        # 관리자 계정이 없으면 생성
        if not admin:
            admin_data = UserCreate(
                userId=ADMIN_ID,
                userPassword=ADMIN_PASSWORD,
                userDepartment=ADMIN_DEPARTMENT,
                userRole="ADMIN"
            )
            UserService.create_user(db, admin_data)
            print(f"✅ 관리자 계정 생성 완료: {ADMIN_ID}")
        else:
            print(f"ℹ️ 관리자 계정이 이미 존재합니다: {ADMIN_ID}")
        
        db.commit()
        print("✅ 기본 데이터 초기화 완료")
        
    except Exception as e:
        db.rollback()
        print(f"❌ 데이터 초기화 중 오류: {str(e)}")


if __name__ == "__main__":
    print("==== 데이터베이스 초기화 시작 ====")
    create_tables()
    initialize_data()
    print("==== 데이터베이스 초기화 완료 ====")
