"""
사용자 관리 관련 라우트 (간소화 버전)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from backend.utils.logger import logger
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from backend.database import get_db
from backend.models.user import User, UserCreate, UserResponse
from backend.middleware.auth import get_current_user, admin_required
from backend.utils.security import get_password_hash

router = APIRouter()


@router.get("/", response_model=Dict[str, Any], dependencies=[Depends(admin_required)])
async def get_users(
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(1000, ge=1, le=1000, description="페이지당 항목 수"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    사용자 목록 조회 (관리자 전용)
    모든 사용자 정보를 한 번에 표시하도록 간소화됨
    """
    try:
        # 로깅 추가
        logger.info(f"사용자 목록 조회 시작: user_id={current_user['user_id']}, page={page}, limit={limit}")
        
        # 서비스 로직: 사용자 목록 쿼리
        logger.info("사용자 DB 쿼리 실행 중...")
        query = db.query(User)
        
        # 서비스 로직: 총 항목 수 계산
        total_count = query.count()
        logger.info(f"총 사용자 수: {total_count}명")
        
        # 서비스 로직: 페이지네이션 (기본 1000개로 설정하여 사실상 모든 사용자가 한 번에 보이도록 함)
        query = query.order_by(User.user_id)
        query = query.offset((page - 1) * limit).limit(limit)
        
        # 서비스 로직: 결과 반환
        results = query.all()
        logger.info(f"조회된 사용자 수: {len(results)}명")
        
        # 사용자 ID 목록 로깅 (디버깅용)
        user_ids = [user.user_id for user in results]
        logger.info(f"조회된 사용자 ID 목록: {user_ids}")
        
        # 응답 준비 및 반환
        response_data = {
            "success": True,
            "message": "사용자 목록 조회 성공",
            "data": {"items": results, "total": total_count, "page": page, "limit": limit},
        }
        logger.info("사용자 목록 조회 완료")
        return response_data
    except Exception as e:
        logger.error(f"사용자 목록 조회 중 오류 발생: {str(e)}")
        import traceback
        logger.error(f"상세 오류: {traceback.format_exc()}")
        return {
            "success": False,
            "message": "사용자 목록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            "error_code": "USER_LIST_ERROR"
        }


@router.post("/", response_model=Dict[str, Any], dependencies=[Depends(admin_required)])
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    새 사용자 생성 (관리자 전용)
    """
    try:
        logger.info(f"사용자 생성 시작: 요청 ID={user.user_id}, 요청자={current_user['user_id']}")
        
        # 서비스 로직: 아이디 중복 검사
        logger.info(f"아이디 중복 검사 중: {user.user_id}")
        existing_user = db.query(User).filter(User.user_id == user.user_id).first()
        if existing_user:
            logger.warning(f"아이디 중복 발생: {user.user_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 사용 중인 아이디입니다",
            )
        logger.info(f"아이디 중복 검사 통과: {user.user_id}")
        
        # 서비스 로직: 비밀번호 해시화
        logger.info("비밀번호 해시화 중...")
        hashed_password = get_password_hash(user.user_password)
        logger.info("비밀번호 해시화 완료")
        
        # 서비스 로직: 새 사용자 생성
        logger.info("DB에 사용자 저장 중...")
        new_user = User(
            user_id=user.user_id,
            user_password=hashed_password,
            user_department=user.user_department,
            user_role=user.user_role,
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info(f"사용자 DB 저장 완료: ID={new_user.user_id}, 권한={new_user.user_role}")
        
        # 로그 추가
        logger.info(
            f"사용자 생성 성공: ID={new_user.user_id}, 권한={new_user.user_role}, 부서={new_user.user_department}, 생성자={current_user['user_id']}"
        )
        
        # 비밀번호 제외하고 반환
        user_response = UserResponse(
            user_id=new_user.user_id,
            user_department=new_user.user_department,
            user_role=new_user.user_role,
        )
        
        return {"success": True, "message": "사용자 생성 성공", "data": user_response}
    except HTTPException as he:
        # HTTP 예외는 그대로 전달 (이미 적절한 에러 메시지가 포함됨)
        raise he
    except Exception as e:
        logger.error(f"사용자 생성 중 오류 발생: {str(e)}")
        import traceback
        logger.error(f"상세 오류: {traceback.format_exc()}")
        return {
            "success": False,
            "message": "사용자 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
            "error_code": "USER_CREATE_ERROR"
        }


@router.delete(
    "/{user_id}", response_model=Dict[str, Any], dependencies=[Depends(admin_required)]
)
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    사용자 삭제 (관리자 전용)
    """
    # 현재 사용자는 삭제 불가
    if user_id == current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="현재 로그인한 사용자는 삭제할 수 없습니다",
        )

    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다"
        )

    db.delete(user)
    db.commit()

    logger.info(f"사용자 삭제: ID {user_id}, 삭제자: {current_user['user_id']}")

    return {"success": True, "message": "사용자 삭제 성공"}
