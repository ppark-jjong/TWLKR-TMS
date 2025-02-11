# backend/app/services/dashboard_service.py
# 경로: backend/app/services/dashboard_service.py
# 역할: 대시보드 관련 비즈니스 로직을 처리하는 서비스 클래스
# 구조: DashboardService 클래스는 DashboardRepository를 의존성으로 주입받아 사용

from datetime import datetime
from typing import List, Optional, Dict
from fastapi import HTTPException

from app.schemas.dashboard_schema import (
    DashboardCreate, DashboardResponse, DashboardDetailResponse,
    DashboardStatusUpdate, DashboardRemarkUpdate, DashboardDriverUpdate
)
from app.repositories.dashboard_repository import DashboardRepository
from app.utils.logger import log_error, log_info
from app.utils.error_handler import (
    validate_dashboard_data, ValidationError, 
    create_error_response
)

class DashboardService:
    def __init__(self, dashboard_repository: DashboardRepository):
        self.repository = dashboard_repository
        self.status_map = {
            "WAITING": "대기",
            "IN_PROGRESS": "진행",
            "COMPLETE": "완료",
            "ISSUE": "이슈"
        }
        # 허용되는 상태 전환 정의
        self.allowed_status_transitions = {
            "WAITING": ["IN_PROGRESS"],
            "IN_PROGRESS": ["COMPLETE", "ISSUE"],
            "COMPLETE": [],  # 완료 상태에서는 더 이상 전환 불가
            "ISSUE": ["IN_PROGRESS"]  # 이슈 상태에서는 진행중으로만 전환 가능
        }

    def create_dashboard(self, dashboard_data: DashboardCreate, user_department: str) -> DashboardResponse:
        """대시보드 생성"""
        try:
            log_info("대시보드 생성 요청", {
                "data": dashboard_data.dict(),
                "user_department": user_department
            })
            
            # 데이터 검증
            validate_dashboard_data(dashboard_data.dict())
            
            # 사용자의 부서 정보로 department 설정
            dashboard_dict = dashboard_data.dict()
            dashboard_dict["department"] = user_department
            
            # 대시보드 생성
            dashboard = self.repository.create_dashboard(dashboard_dict)
            return DashboardResponse.model_validate(dashboard)
            
        except ValidationError as e:
            log_error(e, "대시보드 생성 검증 실패")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            log_error(e, "대시보드 생성 실패")
            raise HTTPException(status_code=500, detail=create_error_response(e))

    def validate_status_transition(self, current_status: str, new_status: str) -> None:
        """상태 전환 검증"""
        if new_status not in self.allowed_status_transitions.get(current_status, []):
            allowed = self.allowed_status_transitions.get(current_status, [])
            allowed_str = ", ".join([self.status_map[status] for status in allowed])
            current_str = self.status_map[current_status]
            raise ValidationError(
                f"'{current_str}' 상태에서는 다음 상태로만 전환 가능합니다: {allowed_str}"
            )

    def update_dashboard_status(self, dashboard_id: int, 
                              status_update: DashboardStatusUpdate) -> DashboardDetailResponse:
        """대시보드 상태 업데이트"""
        try:
            log_info(f"대시보드 상태 업데이트: {dashboard_id}, 상태: {status_update.status}")
            
            # 현재 대시보드 상태 확인
            current_dashboard = self.repository.get_dashboard_by_id(dashboard_id)
            if not current_dashboard:
                raise HTTPException(status_code=404, detail="대시보드를 찾을 수 없습니다")
            
            # 상태 전환 검증
            self.validate_status_transition(current_dashboard.status, status_update.status)
            
            # 상태 업데이트
            dashboard = self.repository.update_dashboard_status(
                dashboard_id, status_update.status, datetime.now()
            )
            return DashboardDetailResponse.model_validate(dashboard)
            
        except ValidationError as e:
            log_error(e, "대시보드 상태 업데이트 검증 실패")
            raise HTTPException(status_code=400, detail=str(e))
        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 상태 업데이트 실패")
            raise HTTPException(status_code=500, detail=create_error_response(e))

    def update_dashboard_remark(self, dashboard_id: int, 
                              remark_update: DashboardRemarkUpdate) -> DashboardDetailResponse:
        """대시보드 메모 업데이트"""
        try:
            log_info(f"대시보드 메모 업데이트: {dashboard_id}")
            dashboard = self.repository.update_dashboard_remark(
                dashboard_id, remark_update.remark
            )
            if not dashboard:
                raise HTTPException(status_code=404, detail="대시보드를 찾을 수 없습니다")
            return DashboardDetailResponse.model_validate(dashboard)
        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "대시보드 메모 업데이트 실패")
            raise HTTPException(status_code=500, detail=create_error_response(e))

    def validate_driver_info(self, driver_update: DashboardDriverUpdate) -> None:
        """배차 정보 검증"""
        if not driver_update.driver_name.strip():
            raise ValidationError("기사 이름은 필수입니다")
            
        # 연락처 형식 검증
        contact = ''.join(filter(str.isdigit, driver_update.driver_contact))
        if len(contact) != 11:
            raise ValidationError("연락처는 11자리 숫자여야 합니다 (예: 010-1234-5678)")

    def update_driver_info(self, driver_update: DashboardDriverUpdate) -> List[DashboardResponse]:
        """배차 정보 업데이트"""
        try:
            log_info("배차 정보 업데이트", driver_update.dict())
            
            # 배차 정보 검증
            self.validate_driver_info(driver_update)
            
            # 대시보드 상태 검증
            for dashboard_id in driver_update.dashboard_ids:
                dashboard = self.repository.get_dashboard_by_id(dashboard_id)
                if not dashboard:
                    raise ValidationError(f"대시보드를 찾을 수 없습니다: {dashboard_id}")
                if dashboard.status != "WAITING":
                    raise ValidationError(
                        f"대기 상태의 대시보드만 배차할 수 있습니다 (대시보드 ID: {dashboard_id})"
                    )

            # 연락처 형식 변환
            contact = ''.join(filter(str.isdigit, driver_update.driver_contact))
            formatted_contact = f"{contact[:3]}-{contact[3:7]}-{contact[7:]}"
            
            # 배차 정보 업데이트
            dashboards = self.repository.update_dashboard_driver(
                driver_update.dashboard_ids,
                driver_update.driver_name,
                formatted_contact
            )
            return [DashboardResponse.model_validate(d) for d in dashboards]
            
        except ValidationError as e:
            log_error(e, "배차 정보 업데이트 검증 실패")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            log_error(e, "배차 정보 업데이트 실패")
            raise HTTPException(status_code=500, detail=create_error_response(e))

    def validate_dashboard_deletion(self, dashboard_ids: List[int]) -> None:
        """대시보드 삭제 검증"""
        if not dashboard_ids:
            raise ValidationError("삭제할 대시보드를 선택해주세요")
            
        for dashboard_id in dashboard_ids:
            dashboard = self.repository.get_dashboard_by_id(dashboard_id)
            if not dashboard:
                raise ValidationError(f"대시보드를 찾을 수 없습니다: {dashboard_id}")
            if dashboard.status != "WAITING":
                raise ValidationError(
                    f"대기 상태의 대시보드만 삭제할 수 있습니다 (대시보드 ID: {dashboard_id})"
                )

    def delete_dashboards(self, dashboard_ids: List[int]) -> bool:
        """대시보드 삭제"""
        try:
            log_info(f"대시보드 삭제 요청: {dashboard_ids}")
            
            # 삭제 가능 여부 검증
            self.validate_dashboard_deletion(dashboard_ids)

            # 대시보드 삭제
            success = self.repository.delete_dashboards(dashboard_ids)
            if not success:
                raise Exception("대시보드 삭제에 실패했습니다")
                
            log_info("대시보드 삭제 완료")
            return True
            
        except ValidationError as e:
            log_error(e, "대시보드 삭제 검증 실패")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            log_error(e, "대시보드 삭제 실패")
            raise HTTPException(status_code=500, detail=create_error_response(e))