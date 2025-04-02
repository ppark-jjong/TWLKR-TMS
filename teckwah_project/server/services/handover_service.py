from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
from itertools import groupby
from sqlalchemy.orm import Session

from ..repositories.handover_repository import HandoverRepository
from ..models.handover_model import HandoverRecord
from ..schemas.handover_schema import HandoverCreate, HandoverUpdate, HandoverResponse, HandoverListResponse, HandoverLockResponse
from ..utils.transaction import transaction
from ..utils.error import LockConflictException, NotFoundException
from ..utils.lock_manager import LockManager
from ..utils.api_response import create_response, error_response
from ..utils.logger import log_info, log_error


class HandoverService:
    """
    인수인계 서비스 레이어
    """
    def __init__(self, db: Session):
        self.repository = HandoverRepository(db)
        self.db = db
        self.lock_manager = LockManager(db)

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
                    timeout: int = 300) -> Dict[str, Any]:
        """
        인수인계 레코드 락 획득 (LockManager 사용)
        """
        try:
            # LockManager를 통한 락 획득
            lock_result = self.lock_manager.acquire_lock(
                HandoverRecord, 
                handover_id, 
                current_user, 
                action_type="EDIT",
                timeout=timeout
            )
            
            return lock_result
        except LockConflictException as e:
            log_error(f"락 충돌: 인수인계(ID: {handover_id}) - 사용자: {current_user}")
            return error_response(
                message=str(e),
                error_code="LOCK_CONFLICT",
                status_code=409
            )
        except NotFoundException as e:
            log_error(f"리소스 없음: 인수인계(ID: {handover_id})")
            return error_response(
                message=str(e),
                error_code="NOT_FOUND",
                status_code=404
            )
        except Exception as e:
            log_error(f"락 획득 오류: {str(e)}")
            return error_response(
                message=f"락 획득 중 오류가 발생했습니다: {str(e)}",
                error_code="SERVER_ERROR",
                status_code=500
            )

    def release_lock(self, handover_id: int, current_user: str) -> Dict[str, Any]:
        """
        인수인계 레코드 락 해제 (LockManager 사용)
        """
        try:
            result = self.lock_manager.release_lock(HandoverRecord, handover_id, current_user)
            return result
        except Exception as e:
            log_error(f"락 해제 오류: {str(e)}")
            return error_response(
                message=f"락 해제 중 오류가 발생했습니다: {str(e)}",
                error_code="SERVER_ERROR"
            )

    def get_lock_info(self, handover_id: int) -> Optional[Dict[str, Any]]:
        """
        인수인계 레코드 락 정보 조회 (LockManager 사용)
        """
        return self.lock_manager.get_lock_info(HandoverRecord, handover_id)

    def update_handover_with_permission(self, 
                                       handover_id: int, 
                                       data: HandoverUpdate, 
                                       current_user: str,
                                       is_admin: bool = False) -> Dict[str, Any]:
        """
        인수인계 레코드 수정 (권한 확인 포함, LockManager 사용)
        """
        try:
            with transaction(self.db):
                # LockManager를 통한 락 획득
                lock_result = self.lock_manager.acquire_lock(
                    HandoverRecord, 
                    handover_id, 
                    current_user, 
                    action_type="EDIT"
                )
                
                if not lock_result.get("success", False):
                    return lock_result
                
                # 레코드 조회
                handover = self.repository.get_handover_by_id(handover_id)
                
                # 존재하지 않는 레코드
                if not handover:
                    return error_response(
                        message="인수인계 항목을 찾을 수 없습니다.",
                        error_code="NOT_FOUND",
                        status_code=404
                    )
                
                # 권한 확인 (작성자 또는 관리자만 수정 가능)
                if handover.created_by != current_user and not is_admin:
                    return error_response(
                        message="수정 권한이 없습니다. (본인 또는 관리자만 가능)",
                        error_code="FORBIDDEN",
                        status_code=403,
                        data={"handover": self._to_response(handover, current_user)}
                    )
                
                # 수정 데이터 준비
                update_data = data.model_dump(exclude_unset=True)
                
                # 비관리자가 공지 관련 필드를 수정하려고 할 경우 제거
                if not is_admin:
                    if 'is_notice' in update_data:
                        del update_data['is_notice']
                    if 'notice_until' in update_data:
                        del update_data['notice_until']
                
                # 마지막 업데이트 정보 추가
                update_data["update_by"] = current_user
                
                # 레코드 업데이트
                updated_handover = self.repository.update_handover(handover_id, update_data)
                
                # 응답 구성
                return create_response(
                    message="인수인계 항목이 업데이트되었습니다.",
                    data={"handover": self._to_response(updated_handover, current_user)}
                )
                
        except LockConflictException as e:
            return error_response(
                message="다른 사용자가 편집 중입니다.",
                error_code="LOCK_CONFLICT",
                status_code=409
            )
        except Exception as e:
            log_error(f"인수인계 업데이트 오류: {str(e)}")
            return error_response(
                message=f"서버 오류: {str(e)}",
                error_code="SERVER_ERROR",
                status_code=500
            )

    def delete_handover_with_permission(self, 
                                       handover_id: int, 
                                       current_user: str, 
                                       is_admin: bool = False) -> Dict[str, Any]:
        """
        인수인계 레코드 삭제 (권한 확인 포함, LockManager 사용)
        """
        try:
            with transaction(self.db):
                # LockManager를 통한 락 획득
                lock_result = self.lock_manager.acquire_lock(
                    HandoverRecord, 
                    handover_id, 
                    current_user, 
                    action_type="DELETE"
                )
                
                if not lock_result.get("success", False):
                    return lock_result
                
                # 레코드 조회
                handover = self.repository.get_handover_by_id(handover_id)
                
                # 존재하지 않는 레코드
                if not handover:
                    return error_response(
                        message="인수인계 항목을 찾을 수 없습니다.",
                        error_code="NOT_FOUND",
                        status_code=404
                    )
                
                # 권한 확인 (작성자 또는 관리자만 삭제 가능)
                if handover.created_by != current_user and not is_admin:
                    return error_response(
                        message="삭제 권한이 없습니다. (본인 또는 관리자만 가능)",
                        error_code="FORBIDDEN",
                        status_code=403
                    )
                
                # 삭제 실행
                success = self.repository.delete_handover(handover_id)
                
                # 성공 응답
                if success:
                    return create_response(
                        message="인수인계 항목이 삭제되었습니다."
                    )
                else:
                    return error_response(
                        message="인수인계 항목 삭제에 실패했습니다.",
                        error_code="DELETE_FAILED"
                    )
                
        except LockConflictException:
            return error_response(
                message="다른 사용자가 편집 중입니다.",
                error_code="LOCK_CONFLICT",
                status_code=409
            )
        except Exception as e:
            log_error(f"인수인계 삭제 오류: {str(e)}")
            return error_response(
                message=f"서버 오류: {str(e)}",
                error_code="SERVER_ERROR",
                status_code=500
            )

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