# teckwah_project/main/server/services/dashboard_remark_service.py
from typing import Dict, List, Optional, Any
from datetime import datetime

from main.server.schemas.dashboard_schema import RemarkCreate, RemarkUpdate, RemarkResponse
from main.server.utils.logger import log_info, log_error
from main.server.utils.transaction import transactional
from main.server.utils.exceptions import NotFoundException, ValidationException

class DashboardRemarkService:
    """대시보드 메모 서비스"""

    def __init__(
        self,
        remark_repository,
        lock_repository,
        dashboard_repository,
        lock_manager,
        db=None,
    ):
        self.remark_repository = remark_repository
        self.lock_repository = lock_repository
        self.dashboard_repository = dashboard_repository
        self.lock_manager = lock_manager
        self.db = getattr(remark_repository, 'db', None)

    @transactional
    def update_remark(
        self, remark_id: int, remark_update: RemarkUpdate, user_id: str
    ) -> Dict[str, Any]:
        """메모 업데이트 (비관적 락 사용)"""
        # 1. 메모 조회
        remark = self.remark_repository.get_remark_by_id(remark_id)
        if not remark:
            raise NotFoundException("메모를 찾을 수 없습니다")

        # 작성자 확인
        if remark.created_by != user_id:
            raise ValidationException("메모 수정 권한이 없습니다")

        # 2. 락 획득
        with self.lock_manager.acquire_lock(remark.dashboard_id, user_id, "REMARK"):
            # 3. 메모 업데이트
            content = remark_update.content
            updated_remark = self.remark_repository.update_remark(
                remark_id, content, user_id
            )
            if not updated_remark:
                raise Exception("메모 업데이트에 실패했습니다")

            # 4. 응답 구성
            return self._build_remark_response(updated_remark)


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
                "formatted_content": remark.content or "",  
            },
        }