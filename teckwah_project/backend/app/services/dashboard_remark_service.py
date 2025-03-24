# app/services/dashboard_remark_service.py
from typing import Dict, List, Optional, Any
from datetime import datetime

from app.schemas.dashboard_schema import RemarkCreate, RemarkUpdate, RemarkResponse
from app.utils.logger import log_info, log_error
from app.utils.exceptions import PessimisticLockException, ValidationException, NotFoundException, ForbiddenException
from app.utils.transaction import transactional

class DashboardRemarkService:
    """대시보드 메모 서비스"""

    def __init__(
        self,
        remark_repository,
        lock_repository,
        dashboard_repository,
        lock_manager,
        db=None,  # 트랜잭션 데코레이터에서 사용
    ):
        self.remark_repository = remark_repository
        self.lock_repository = lock_repository
        self.dashboard_repository = dashboard_repository
        self.lock_manager = lock_manager
        self.db = getattr(remark_repository, 'db', None)  # 리포지토리에서 db 세션 추출

    @transactional
    def create_remark(
        self, dashboard_id: int, remark_data: RemarkCreate, user_id: str
    ) -> Dict[str, Any]:
        """대시보드에 새 메모 생성 (비관적 락 사용)"""
        # 1. 락 획득
        with self.lock_manager.acquire_lock(dashboard_id, user_id, "REMARK"):
            # 2. 대시보드 존재 여부 확인
            dashboard = self.dashboard_repository.get_dashboard_detail(dashboard_id)
            if not dashboard:
                raise ValueError(f"대시보드를 찾을 수 없습니다: ID={dashboard_id}")

            # 3. 메모 생성
            content = remark_data.content
            remark = self.remark_repository.create_remark(
                dashboard_id, content, user_id
            )
            if not remark:
                raise ValueError("메모 생성에 실패했습니다")

            # 4. 응답 구성
            return self._build_remark_response(remark)

    @transactional
    def update_remark(
        self, remark_id: int, remark_update: RemarkUpdate, user_id: str
    ) -> Dict[str, Any]:
        """메모 업데이트 (비관적 락 사용)"""
        # 1. 메모 조회
        remark = self.remark_repository.get_remark_by_id(remark_id)
        if not remark:
            raise NotFoundException(f"메모를 찾을 수 없습니다: ID={remark_id}")

        # 작성자 확인
        if remark.created_by != user_id:
            raise ForbiddenException("자신이 작성한 메모만 수정할 수 있습니다")

        # 2. 락 획득
        with self.lock_manager.acquire_lock(remark.dashboard_id, user_id, "REMARK"):
            # 내용 검증
            if not remark_update.content or not remark_update.content.strip():
                raise ValidationException("메모 내용은 비어있을 수 없습니다")
                
            # 3. 메모 업데이트
            content = remark_update.content
            updated_remark = self.remark_repository.update_remark(
                remark_id, content, user_id
            )
            if not updated_remark:
                raise ValidationException("메모 업데이트에 실패했습니다")

            # 4. 응답 구성
            return self._build_remark_response(updated_remark)

    @transactional
    def delete_remark(
        self, remark_id: int, user_id: str, is_admin: bool = False
    ) -> bool:
        """메모 삭제 (작성자/관리자만 가능, 비관적 락 사용)"""
        # 1. 메모 조회
        remark = self.remark_repository.get_remark_by_id(remark_id)
        if not remark:
            raise NotFoundException(f"메모를 찾을 수 없습니다: ID={remark_id}")

        # 2. 권한 확인
        if not is_admin and remark.created_by != user_id:
            raise ForbiddenException("메모 삭제 권한이 없습니다")

        # 3. 락 획득
        with self.lock_manager.acquire_lock(remark.dashboard_id, user_id, "REMARK"):
            # 4. 메모 삭제
            result = self.remark_repository.delete_remark(remark_id)
            if not result:
                raise ValidationException("메모 삭제에 실패했습니다")

            return True

    def get_remarks_by_dashboard_id(self, dashboard_id: int) -> List[Dict[str, Any]]:
        """대시보드별 메모 목록 조회 (최신순)"""
        remarks = self.remark_repository.get_remarks_by_dashboard_id(dashboard_id)
        return [self._build_remark_response(remark) for remark in remarks]

    def _build_remark_response(self, remark) -> Dict[str, Any]:
        """메모 응답 객체 구성"""
        return {
            "success": True,
            "message": "메모가 처리되었습니다",
            "data": {
                "remark_id": remark.remark_id,
                "dashboard_id": remark.dashboard_id,
                "content": remark.content or "",
                "created_at": (
                    remark.created_at.isoformat() if remark.created_at else None
                ),
                "created_by": remark.created_by,
                "formatted_content": remark.formatted_content or "",
            },
        }