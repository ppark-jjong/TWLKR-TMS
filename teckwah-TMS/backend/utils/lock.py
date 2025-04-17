"""
행 단위 락 관련 유틸리티 함수
updated_by/update_by와 update_at 필드를 락 정보 저장 및 마지막 수정자 표시용으로 재활용
"""

from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, Dict, Optional, Type, Union

from backend.models.dashboard import Dashboard
from backend.models.handover import Handover
from backend.utils.logger import logger

# 락 만료 시간 (분)
LOCK_EXPIRY_MINUTES = 30


def acquire_lock(
    db: Session, model: Union[Type[Dashboard], Type[Handover]], record_id: int, user_id: str
) -> bool:
    """
    레코드에 락을 획득합니다.
    updated_by/update_by와 update_at을 락 정보 저장 및 마지막 수정자 표시용으로 재활용합니다.

    Args:
        db: 데이터베이스 세션
        model: 락을 획득할 모델 클래스
        record_id: 락을 획득할 레코드 ID
        user_id: 락을 획득하려는 사용자 ID

    Returns:
        bool: 락 획득 성공 여부
    """
    record = db.query(model).filter_by(**{model.__table__.primary_key.columns.keys()[0]: record_id}).first()
    
    if not record:
        return False
    
    # 현재 시간
    now = datetime.now()
    
    # 이미 락이 있는 경우
    if record.is_locked:
        # 자신이 락을 가지고 있는 경우 (필드명 통일하여 확인)
        update_field = None
        if hasattr(record, 'updated_by'):
            update_field = 'updated_by'
        elif hasattr(record, 'update_by'):
            update_field = 'update_by'
        
        if update_field and getattr(record, update_field) == user_id:
            # 락 시간 갱신 (update_at 필드로 갱신)
            if hasattr(record, 'update_at'):
                record.update_at = now
            
            db.commit()
            return True
        
        # 락이 만료된 경우 (update_at 필드로 확인)
        expire_time = None
        if hasattr(record, 'update_at') and record.update_at:
            expire_time = record.update_at + timedelta(minutes=LOCK_EXPIRY_MINUTES)
            
        if expire_time and now > expire_time:
            # 만료된 경우 락 획득 (필드명 통일하여 처리)
            update_field = None
            if hasattr(record, 'updated_by'):
                update_field = 'updated_by'
            elif hasattr(record, 'update_by'):
                update_field = 'update_by'
            
            previous_user = None
            if update_field:
                previous_user = getattr(record, update_field)
                setattr(record, update_field, user_id)
                
            if hasattr(record, 'update_at'):
                record.update_at = now
                
            logger.info(f"만료된 락을 해제: {record_id}, 이전 사용자: {previous_user}")
            db.commit()
            return True
        
        # 다른 사용자가 락을 가지고 있는 경우
        return False
    
    # 락이 없는 경우, 락 획득
    record.is_locked = True
    
    # update_by/update_at 필드에 락 정보 저장
    if hasattr(record, 'updated_by'):
        record.updated_by = user_id
    elif hasattr(record, 'update_by'):
        record.update_by = user_id
        
    if hasattr(record, 'update_at'):
        record.update_at = now
        
    db.commit()
    return True


def release_lock(
    db: Session, model: Union[Type[Dashboard], Type[Handover]], record_id: int, user_id: str
) -> bool:
    """
    레코드의 락을 해제합니다.
    updated_by/update_by와 update_at은 마지막 편집자 정보로 유지합니다.
    락을 해제해도 이 필드들은 업데이트하지 않아 마지막 수정자 정보를 보존합니다.

    Args:
        db: 데이터베이스 세션
        model: 락을 해제할 모델 클래스
        record_id: 락을 해제할 레코드 ID
        user_id: 락을 해제하려는 사용자 ID

    Returns:
        bool: 락 해제 성공 여부
    """
    record = db.query(model).filter_by(**{model.__table__.primary_key.columns.keys()[0]: record_id}).first()
    
    if not record:
        return False
    
    # 락이 없는 경우
    if not record.is_locked:
        return True
    
    # 자신이 락을 가지고 있는 경우에만 해제 가능 (update_by/updated_by 필드로 확인)
    current_lock_owner = None
    if hasattr(record, 'updated_by'):
        current_lock_owner = record.updated_by
    elif hasattr(record, 'update_by'):
        current_lock_owner = record.update_by
        
    if current_lock_owner == user_id:
        record.is_locked = False
        # update_by와 update_at은 마지막 편집자 정보로 유지 (변경하지 않음)
        db.commit()
        return True
    
    # 관리자는 모든 락 해제 가능 (추후 구현 필요시)
    
    return False


def check_lock_status(
    db: Session, model: Union[Type[Dashboard], Type[Handover]], record_id: int, user_id: str
) -> Dict[str, Any]:
    """
    레코드의 락 상태를 확인합니다.
    updated_by/update_by와 update_at 필드를 통해 락 소유자와 마지막 수정자 정보를 확인합니다.
    이 필드들은 프론트엔드에서 "최종 수정자"와 "최종 수정 시간"으로도 표시됩니다.

    Args:
        db: 데이터베이스 세션
        model: 락을 확인할 모델 클래스
        record_id: 락을 확인할 레코드 ID
        user_id: 확인하는 사용자 ID

    Returns:
        Dict: 락 상태 정보
    """
    record = db.query(model).filter_by(**{model.__table__.primary_key.columns.keys()[0]: record_id}).first()
    
    if not record:
        return {"locked": False, "editable": False, "message": "레코드를 찾을 수 없습니다"}
    
    # 마지막 업데이트 정보 추출 (update_by/update_at 필드 활용)
    last_updater = None
    if hasattr(record, 'updated_by'):
        last_updater = record.updated_by
    elif hasattr(record, 'update_by'):
        last_updater = record.update_by
    
    last_update_time = None
    if hasattr(record, 'update_at'):
        last_update_time = record.update_at
    
    # 락이 없는 경우
    if not record.is_locked:
        response = {"locked": False, "editable": True, "message": "편집 가능합니다"}
        if last_updater and last_update_time:
            response["last_updated_by"] = last_updater
            response["last_updated_at"] = last_update_time
        return response
    
    # 자신이 락을 가지고 있는 경우 (update_by/updated_by 필드로 확인)
    if last_updater == user_id:
        response = {"locked": True, "editable": True, "message": "현재 사용자가 편집 중입니다"}
        if last_update_time:
            response["last_updated_at"] = last_update_time
        return response
    
    # 락이 만료된 경우 (update_at 필드 활용)
    now = datetime.now()
    if last_update_time and now - last_update_time > timedelta(minutes=LOCK_EXPIRY_MINUTES):
        response = {
            "locked": True, 
            "editable": True, 
            "message": f"락이 만료되었습니다. 이전 사용자: {last_updater}"
        }
        if last_updater and last_update_time:
            response["last_updated_by"] = last_updater
            response["last_updated_at"] = last_update_time
        return response
    
    # 다른 사용자가 락을 가지고 있는 경우
    response = {
        "locked": True, 
        "editable": False, 
        "message": f"다른 사용자({last_updater})가 편집 중입니다"
    }
    if last_updater and last_update_time:
        response["last_updated_by"] = last_updater
        response["last_updated_at"] = last_update_time
    return response


def validate_lock(
    db: Session, model: Union[Type[Dashboard], Type[Handover]], record_id: int, user_id: str
) -> None:
    """
    레코드 락을 검증하고 편집 불가능한 경우 예외를 발생시킵니다.

    Args:
        db: 데이터베이스 세션
        model: 락을 검증할 모델 클래스
        record_id: 락을 검증할 레코드 ID
        user_id: 검증하는 사용자 ID

    Raises:
        HTTPException: 락이 다른 사용자에게 있는 경우
    """
    lock_status = check_lock_status(db, model, record_id, user_id)
    
    if lock_status["locked"] and not lock_status["editable"]:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=lock_status["message"],
        )


def release_expired_locks(db: Session):
    """
    만료된 모든 락을 해제합니다.
    배치 작업이나 주기적인 작업으로 실행하는 데 적합합니다.
    락이 만료되어도 updated_by/update_by와 update_at은 유지되어 마지막 수정 정보가 보존됩니다.

    Args:
        db: 데이터베이스 세션
    """
    now = datetime.now()
    expire_time = now - timedelta(minutes=LOCK_EXPIRY_MINUTES)
    
    # Dashboard 모델의 만료된 락 해제
    # update_at 필드를 기준으로 만료 여부 확인
    dashboard_records = (
        db.query(Dashboard)
        .filter(
            Dashboard.is_locked == True,
            Dashboard.update_at < expire_time
        )
        .all()
    )
    
    for record in dashboard_records:
        update_field = 'updated_by' if hasattr(record, 'updated_by') else 'update_by'
        logger.info(f"만료된 Dashboard 락 해제: ID {record.dashboard_id}, 사용자: {getattr(record, update_field, 'Unknown')}")
        record.is_locked = False
        # update_by와 update_at은 마지막 편집자 정보로 유지 (변경하지 않음)
    
    # Handover 모델의 만료된 락 해제
    handover_records = (
        db.query(Handover)
        .filter(
            Handover.is_locked == True,
            Handover.update_at < expire_time
        )
        .all()
    )
    
    for record in handover_records:
        logger.info(f"만료된 Handover 락 해제: ID {record.handover_id}, 사용자: {record.update_by}")
        record.is_locked = False
        # update_by와 update_at은 마지막 편집자 정보로 유지 (변경하지 않음)
    
    if dashboard_records or handover_records:
        db.commit()
        return len(dashboard_records) + len(handover_records)
    
    return 0
