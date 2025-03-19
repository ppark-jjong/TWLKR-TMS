# app/services/dashboard_remark_service.py
from typing import List, Optional
from fastapi import HTTPException, status

from app.repositories.dashboard_remark_repository import DashboardRemarkRepository
from app.repositories.dashboard_lock_repository import DashboardLockRepository
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard_schema import RemarkResponse, RemarkCreate, RemarkUpdate
from app.utils.logger import log_info, log_error
from app.utils.exceptions import PessimisticLockException

class DashboardRemarkService:
    def __init__(
        self,
        remark_repository: DashboardRemarkRepository,
        lock_repository: DashboardLockRepository,
        dashboard_repository: Optional[DashboardRepository] = None
    ):
        self.remark_repository = remark_repository
        self.lock_repository = lock_repository
        self.dashboard_repository = dashboard_repository

    def get_remarks_by_dashboard_id(self, dashboard_id: int) -> List[RemarkResponse]:
        """대시보드 ID별 메모 목록 조회"""
        try:
            remarks = self.remark_repository.get_remarks_by_dashboard_id(dashboard_id)
            return [RemarkResponse.model_validate(r) for r in remarks]
        except Exception as e:
            log_error(e, "메모 목록 조회 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="메모 목록 조회 중 오류가 발생했습니다",
            )

    def create_remark(
        self, dashboard_id: int, remark_data: RemarkCreate, user_id: str, dashboard_version: Optional[int] = None
    ) -> RemarkResponse:
        """
        새 메모 생성 (비관적 락 전용)
        
        Args:
            dashboard_id: 대시보드 ID
            remark_data: 메모 생성 데이터
            user_id: 현재 사용자 ID
            dashboard_version: 클라이언트 버전 (호환성 유지용, 사용하지 않음)
        """
        try:
            # 1. 비관적 락 획득 시도
            try:
                lock = self.lock_repository.acquire_lock(dashboard_id, user_id, "REMARK")
                if not lock:
                    raise PessimisticLockException("다른 사용자가 메모를 수정 중입니다.")
            except PessimisticLockException as e:
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=f"다른 사용자가 메모를 수정 중입니다: {e.locked_by if hasattr(e, 'locked_by') else ''}",
                )

            try:
                # 2. 사용자 ID 포함 형식으로 메모 내용 구성
                content = remark_data.content
                
                # 3. 메모 생성
                remark = self.remark_repository.create_remark(
                    dashboard_id, content, user_id
                )
                
                if not remark:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="메모를 생성할 수 없습니다. 대시보드가 존재하지 않습니다."
                    )
                
                return RemarkResponse.model_validate(remark)
            finally:
                # 락 해제 (성공/실패 상관없이)
                self.lock_repository.release_lock(dashboard_id, user_id)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "메모 생성 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="메모 생성 중 오류가 발생했습니다",
            )

    def update_remark(
    self, remark_id: int, remark_data: RemarkUpdate, user_id: str, dashboard_version: Optional[int] = None
) -> RemarkResponse:
        """
        메모 업데이트 (비관적 락 전용)
        
        Args:
            remark_id: 메모 ID
            remark_data: 메모 업데이트 데이터
            user_id: 현재 사용자 ID
            dashboard_version: 클라이언트 버전 (호환성 유지용, 사용하지 않음)
        """
        try:
            # 1. 메모 조회
            remark = self.remark_repository.get_remark_by_id(remark_id)
            if not remark:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="메모를 찾을 수 없습니다",
                )

            # 2. 비관적 락 획득 시도
            try:
                lock = self.lock_repository.acquire_lock(
                    remark.dashboard_id, user_id, "REMARK"
                )
                if not lock:
                    raise PessimisticLockException("다른 사용자가 메모를 수정 중입니다.")
            except PessimisticLockException as e:
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=f"다른 사용자가 메모를 수정 중입니다: {e.locked_by if hasattr(e, 'locked_by') else ''}",
                )

            try:
                # 3. 메모 업데이트 (단순 업데이트 방식)
                updated_remark = self.remark_repository.update_remark(
                    remark_id, remark_data.content, user_id
                )
                
                if not updated_remark:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="메모를 업데이트할 수 없습니다."
                    )
                
                return RemarkResponse.model_validate(updated_remark)
            finally:
                # 락 해제 (성공/실패 상관없이)
                self.lock_repository.release_lock(remark.dashboard_id, user_id)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "메모 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="메모 업데이트 중 오류가 발생했습니다",
            )

        """메모 삭제 (비관적 락 전용)"""
        try:
            # 1. 메모 조회
            remark = self.remark_repository.get_remark_by_id(remark_id)
            if not remark:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="메모를 찾을 수 없습니다",
                )
                
            # 2. 권한 검증 (삭제는 작성자와 관리자만 가능)
            if not is_admin and remark.created_by != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="이 메모를 삭제할 권한이 없습니다.",
                )

            # 3. 비관적 락 획득 시도
            try:
                lock = self.lock_repository.acquire_lock(
                    remark.dashboard_id, user_id, "REMARK"
                )
                if not lock:
                    raise PessimisticLockException("다른 사용자가 메모를 수정 중입니다.")
            except PessimisticLockException as e:
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=f"다른 사용자가 메모를 수정 중입니다: {e.locked_by if hasattr(e, 'locked_by') else ''}",
                )

            try:
                # 4. 메모 삭제
                deleted = self.remark_repository.delete_remark(remark_id)
                return deleted
            finally:
                # 락 해제 (성공/실패 상관없이)
                self.lock_repository.release_lock(remark.dashboard_id, user_id)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "메모 삭제 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="메모 삭제 중 오류가 발생했습니다",
            )