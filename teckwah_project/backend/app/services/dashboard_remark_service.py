# app/services/dashboard_remark_service.py
from typing import List, Optional
from fastapi import HTTPException, status

from app.repositories.dashboard_remark_repository import DashboardRemarkRepository
from app.repositories.dashboard_lock_repository import DashboardLockRepository
from app.schemas.dashboard_schema import RemarkResponse, RemarkCreate, RemarkUpdate
from app.utils.logger import log_info, log_error
from app.utils.exceptions import OptimisticLockException, PessimisticLockException


class DashboardRemarkService:
    def __init__(
        self,
        remark_repository: DashboardRemarkRepository,
        lock_repository: DashboardLockRepository,
    ):
        self.remark_repository = remark_repository
        self.lock_repository = lock_repository

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
        self, dashboard_id: int, remark_data: RemarkCreate, user_id: str
    ) -> RemarkResponse:
        """새 메모 생성 (비관적 락 적용)"""
        try:
            # 비관적 락 획득 시도
            try:
                self.lock_repository.acquire_lock(dashboard_id, user_id, "REMARK")
            except PessimisticLockException as e:
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=f"다른 사용자가 메모를 수정 중입니다: {e.locked_by}",
                )

            # 메모 생성
            try:
                remark = self.remark_repository.create_remark(
                    dashboard_id, remark_data.content, user_id
                )
                return RemarkResponse.model_validate(remark)
            finally:
                # 락 해제
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
        self, remark_id: int, remark_data: RemarkUpdate, user_id: str
    ) -> RemarkResponse:
        """메모 업데이트 (비관적 락 + 낙관적 락 적용)"""
        try:
            # 메모 조회
            remark = self.remark_repository.get_remark_by_id(remark_id)
            if not remark:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="메모를 찾을 수 없습니다",
                )

            # 비관적 락 획득 시도
            try:
                self.lock_repository.acquire_lock(
                    remark.dashboard_id, user_id, "REMARK"
                )
            except PessimisticLockException as e:
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=f"다른 사용자가 메모를 수정 중입니다: {e.locked_by}",
                )

            # 메모 업데이트
            try:
                updated_remark = self.remark_repository.update_remark(
                    remark_id, remark_data.content, remark_data.version, user_id
                )
                return RemarkResponse.model_validate(updated_remark)
            except OptimisticLockException as e:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "message": "다른 사용자가 이미 데이터를 수정했습니다. 최신 데이터를 확인하세요.",
                        "current_version": e.current_version,
                    },
                )
            finally:
                # 락 해제
                self.lock_repository.release_lock(remark.dashboard_id, user_id)

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "메모 업데이트 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="메모 업데이트 중 오류가 발생했습니다",
            )
