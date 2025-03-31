from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
from itertools import groupby
from sqlalchemy.orm import Session

from ..repositories.handover_repository import HandoverRepository
from ..models.handover_model import HandoverRecord
from ..schemas.handover_schema import HandoverCreate, HandoverUpdate, HandoverResponse, HandoverListResponse, HandoverLockResponse
from ..utils.transaction import transaction
from ..utils.error import LockConflictException, NotFoundException


class HandoverService:
    """
    인수인계 서비스 레이어
    """
    def __init__(self, db: Session):
        self.repository = HandoverRepository(db)
        self.db = db

    def create_handover(self, data: HandoverCreate, current_user: str) -> HandoverResponse:
        """
        인수인계 레코드 생성
        """
        # 공지 관련 필드 가져오기
        is_notice = data.is_notice if hasattr(data, 'is_notice') else False
        notice_until = data.notice_until if hasattr(data, 'notice_until') else None
        
        handover = self.repository.create_handover(
            title=data.title,
            content=data.content,
            created_by=current_user,
            is_notice=is_notice,
            notice_until=notice_until
        )
        
        self.db.flush()
        return self._to_response(handover, current_user)

    def get_handover(self, handover_id: int, current_user: str) -> Optional[HandoverResponse]:
        """
        단일 인수인계 조회
        """
        handover = self.repository.get_handover_by_id(handover_id)
        if handover:
            return self._to_response(handover, current_user)
        return None

    def get_handovers_by_date_range(self, 
                                   start_date: datetime, 
                                   end_date: datetime, 
                                   current_user: str) -> List[HandoverListResponse]:
        """
        날짜 범위로 인수인계 목록 조회 및 날짜별로 그룹화
        """
        handovers = self.repository.get_handovers_by_date_range(start_date, end_date)
        
        # 날짜별로 그룹화
        grouped_handovers = []
        
        # 날짜 추출 함수 (effective_date 사용)
        def get_record_date(record):
            return record.effective_date.strftime("%Y-%m-%d")
        
        # 날짜별로 정렬 후 그룹화
        sorted_handovers = sorted(handovers, key=get_record_date, reverse=True)
        
        for date, records in groupby(sorted_handovers, key=get_record_date):
            grouped_handovers.append(
                HandoverListResponse(
                    date=date,
                    records=[self._to_response(record, current_user) for record in records]
                )
            )
        
        return grouped_handovers

    def acquire_lock(self, 
                    handover_id: int, 
                    current_user: str, 
                    timeout: int = 300) -> Optional[HandoverLockResponse]:
        """
        인수인계 레코드 락 획득 (행 단위 락 사용)
        """
        try:
            # 행 단위 락 획득 시도
            handover = self.repository.get_handover_with_lock(handover_id, current_user)
            
            if handover:
                # 락 획득 성공
                return HandoverLockResponse(
                    id=handover_id,
                    locked_by=current_user,
                    locked_at=datetime.now(),
                    expires_at=datetime.now() + timedelta(seconds=timeout)
                )
            return None
        except LockConflictException:
            # 락 충돌 시 None 반환
            return None
        except Exception as e:
            # 기타 오류 처리
            print(f"락 획득 오류: {str(e)}")
            return None

    def release_lock(self, handover_id: int, current_user: str) -> bool:
        """
        인수인계 레코드 락 해제 - 행 단위 락은 트랜잭션 종료 시 자동 해제
        """
        return True

    def get_lock_info(self, handover_id: int) -> Optional[HandoverLockResponse]:
        """
        인수인계 레코드 락 정보 조회 - 행 단위 락은 실시간 확인 불가
        """
        # 행 단위 락은 UI 표시용 정보를 제공하지 않음
        return None

    def is_locked_by_others(self, handover_id: int, current_user: str) -> bool:
        """
        다른 사용자에 의해 락이 걸려있는지 확인 - 행 단위 락은 실시간 확인 불가
        """
        # 행 단위 락은 실시간 조회가 어려우므로 항상 False 반환
        return False

    def update_handover_with_permission(self, 
                                       handover_id: int, 
                                       data: HandoverUpdate, 
                                       current_user: str,
                                       is_admin: bool = False) -> Dict[str, Any]:
        """
        인수인계 레코드 수정 (권한 확인 포함, 행 단위 락 사용)
        """
        # 기본 응답 구조
        result = {
            "handover": None,
            "error_code": None,
            "message": None
        }
        
        try:
            with transaction(self.db):
                # 행 단위 락 획득을 통한 레코드 조회
                handover = self.repository.get_handover_with_lock(handover_id, current_user)
                
                # 존재하지 않는 레코드
                if not handover:
                    result["error_code"] = "NOT_FOUND"
                    result["message"] = "인수인계 항목을 찾을 수 없습니다."
                    return result
                
                # 권한 확인 (작성자 또는 관리자만 수정 가능)
                if handover.update_by != current_user and not is_admin:
                    result["error_code"] = "FORBIDDEN"
                    result["message"] = "수정 권한이 없습니다. (본인 또는 관리자만 가능)"
                    result["handover"] = self._to_response(handover, current_user)
                    return result
                
                # 수정 데이터 준비
                update_data = data.model_dump(exclude_unset=True)
                
                # 비관리자가 공지 관련 필드를 수정하려고 할 경우 제거
                if not is_admin:
                    if 'is_notice' in update_data:
                        del update_data['is_notice']
                    if 'notice_until' in update_data:
                        del update_data['notice_until']
                
                # 필드 업데이트
                for key, value in update_data.items():
                    setattr(handover, key, value)
                
                # 마지막 업데이트 정보 갱신
                handover.update_by = current_user
                
                # DB 반영
                self.db.flush()
                
                # 응답 구성
                result["handover"] = self._to_response(handover, current_user)
                return result
                
        except LockConflictException:
            result["error_code"] = "LOCK_CONFLICT"
            result["message"] = "다른 사용자가 편집 중입니다."
            return result
        except Exception as e:
            result["error_code"] = "SERVER_ERROR"
            result["message"] = f"서버 오류: {str(e)}"
            return result

    def delete_handover_with_permission(self, 
                                       handover_id: int, 
                                       current_user: str, 
                                       is_admin: bool = False) -> Dict[str, Any]:
        """
        인수인계 레코드 삭제 (권한 확인 포함, 행 단위 락 사용)
        """
        # 기본 응답 구조
        result = {
            "success": False,
            "error_code": None,
            "message": None
        }
        
        try:
            with transaction(self.db):
                # 행 단위 락 획득을 통한 레코드 조회
                handover = self.repository.get_handover_with_lock(handover_id, current_user)
                
                # 존재하지 않는 레코드
                if not handover:
                    result["error_code"] = "NOT_FOUND"
                    result["message"] = "인수인계 항목을 찾을 수 없습니다."
                    return result
                
                # 권한 확인 (작성자 또는 관리자만 삭제 가능)
                if handover.update_by != current_user and not is_admin:
                    result["error_code"] = "FORBIDDEN"
                    result["message"] = "삭제 권한이 없습니다. (본인 또는 관리자만 가능)"
                    return result
                
                # 삭제 실행
                self.db.delete(handover)
                self.db.flush()
                
                # 성공 응답
                result["success"] = True
                result["message"] = "인수인계 항목이 삭제되었습니다."
                return result
                
        except LockConflictException:
            result["error_code"] = "LOCK_CONFLICT"
            result["message"] = "다른 사용자가 편집 중입니다."
            return result
        except Exception as e:
            result["error_code"] = "SERVER_ERROR"
            result["message"] = f"서버 오류: {str(e)}"
            return result

    def _to_response(self, handover: HandoverRecord, current_user: str) -> HandoverResponse:
        """
        핸드오버 모델을 응답형태로 변환
        """
        if not handover:
            return None
            
        # 날짜 처리
        created_at = handover.created_at.isoformat() if handover.created_at else None
        updated_at = handover.updated_at.isoformat() if handover.updated_at else None
        notice_until = handover.notice_until.isoformat() if handover.notice_until else None
        
        # 소유자 여부 확인 (본인 글인지)
        is_owner = handover.created_by == current_user
        
        return HandoverResponse(
            id=handover.handover_id,
            title=handover.title,
            content=handover.content,
            created_at=created_at,
            updated_at=updated_at,
            created_by=handover.created_by,
            is_owner=is_owner,
            is_notice=handover.is_notice if hasattr(handover, 'is_notice') else False,
            notice_until=notice_until
        ) 