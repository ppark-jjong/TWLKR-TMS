# teckwah_project/server/services/dashboard_service.py
from typing import Dict, List, Optional, Any, Tuple, Union
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from server.models.dashboard_model import Dashboard
from server.models.postal_code_model import PostalCode, PostalCodeDetail
from server.schemas.dashboard_schema import (
    StatusUpdate,
    DriverAssignment,
    DashboardUpdate,
)
from server.utils.datetime import get_kst_now, parse_datetime
from server.utils.logger import log_info, log_error
from server.utils.error import (
    LockConflictException,
    ValidationException,
    NotFoundException,
    ForbiddenException,
)
from server.utils.transaction import transactional, transaction
from server.utils.constants import STATUS_TRANSITIONS, MESSAGES
from server.config.settings import get_settings
from server.config.database import get_db
from server.repositories.dashboard_repository import DashboardRepository
from server.utils.common import DeliveryStatus, STATUS_TEXT_MAP

settings = get_settings()


class DashboardService:
    """대시보드 서비스"""

    def __init__(self, repository, db):
        """서비스 초기화"""
        self.repository = repository
        self.db = db

    def _convert_to_dict(self, dashboard):
        """대시보드 모델을 딕셔너리로 변환"""
        if not dashboard:
            return {}
        return {c.name: getattr(dashboard, c.name) for c in dashboard.__table__.columns}

    def _prepare_dashboard_detail(self, dashboard):
        """대시보드 상세 정보 준비"""
        if not dashboard:
            return {}

        dashboard_dict = self._convert_to_dict(dashboard)

        # 날짜 필드 포맷팅
        for date_field in ["eta", "create_time", "depart_time", "complete_time"]:
            if dashboard_dict.get(date_field):
                dashboard_dict[date_field] = dashboard_dict[date_field].isoformat()

        return dashboard_dict

    @transactional
    def create_dashboard(self, dashboard_data: Dict[str, Any]) -> Dict[str, Any]:
        """대시보드 생성 메서드"""
        try:
            # 우편번호 존재 확인
            postal_code = dashboard_data.get("postal_code")
            if postal_code:
                postal_info = (
                    self.db.query(PostalCode)
                    .filter(PostalCode.postal_code == postal_code)
                    .first()
                )
                if postal_info:
                    # 우편번호 정보 설정
                    dashboard_data["city"] = postal_info.city
                    dashboard_data["county"] = postal_info.county
                    dashboard_data["district"] = postal_info.district

                    # 창고 정보가 있으면 거리, 소요시간 정보도 설정
                    warehouse = dashboard_data.get("warehouse")
                    if warehouse:
                        detail_info = (
                            self.db.query(PostalCodeDetail)
                            .filter(
                                PostalCodeDetail.postal_code == postal_code,
                                PostalCodeDetail.warehouse == warehouse,
                            )
                            .first()
                        )
                        if detail_info:
                            dashboard_data["distance"] = detail_info.distance
                            dashboard_data["duration_time"] = detail_info.duration_time

            # update_at 필드를 명시적으로 설정
            dashboard_data["update_at"] = get_kst_now()

            # 대시보드 생성
            dashboard = self.repository.create_dashboard(dashboard_data)
            if not dashboard:
                raise Exception("대시보드 생성 실패")

            # 응답 데이터 생성
            return self._prepare_dashboard_detail(dashboard)
        except Exception as e:
            log_error(f"대시보드 생성 실패: {str(e)}")
            raise

    def get_dashboard_list(
        self, 
        page: Optional[int] = None, 
        size: Optional[int] = None, 
        start_date: Optional[str] = None, 
        end_date: Optional[str] = None, 
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """대시보드 목록 조회 (필터링, 페이지네이션 지원)"""
        if filters is None:
            filters = {}
            
        # 날짜 파싱
        try:
            start_date_obj = None
            end_date_obj = None
            
            if start_date:
                if isinstance(start_date, str):
                    start_date_obj = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                else:
                    start_date_obj = start_date
            
            if end_date:
                if isinstance(end_date, str):
                    end_date_obj = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                else:
                    end_date_obj = end_date
                    
            # 날짜가 지정되지 않은 경우 가장 넓은 범위를 사용하도록 설정
            if not start_date_obj and not end_date_obj:
                # ETA 날짜의 최소/최대 값 조회
                eta_range = self.repository.get_eta_date_range()
                start_date_obj = eta_range.get('min_eta') if eta_range.get('min_eta') else get_kst_now().replace(hour=0, minute=0, second=0)
                end_date_obj = eta_range.get('max_eta') if eta_range.get('max_eta') else get_kst_now().replace(hour=23, minute=59, second=59)
            elif not start_date_obj:
                # 시작일만 없는 경우
                eta_range = self.repository.get_eta_date_range()
                start_date_obj = eta_range.get('min_eta') if eta_range.get('min_eta') else get_kst_now().replace(hour=0, minute=0, second=0)
            elif not end_date_obj:
                # 종료일만 없는 경우
                eta_range = self.repository.get_eta_date_range()
                end_date_obj = eta_range.get('max_eta') if eta_range.get('max_eta') else get_kst_now().replace(hour=23, minute=59, second=59)
        except Exception as e:
            raise ValidationException(f"날짜 형식이 올바르지 않습니다: {str(e)}")
        
        # 필터 조건 정제
        clean_filters = {}
        for key, value in filters.items():
            if value is not None and (not isinstance(value, str) or value.strip()):
                clean_filters[key] = value
        
        # ETA 날짜 범위 조회 (UI에서 날짜 선택기 제한용)
        eta_range = self.repository.get_eta_date_range()
        
        # 메타데이터 구성
        meta_data = {
            "date_range": {
                "start_date": start_date_obj.isoformat(),
                "end_date": end_date_obj.isoformat(),
            },
            "eta_range": {
                "min_eta": eta_range.get('min_eta').isoformat() if eta_range.get('min_eta') else None,
                "max_eta": eta_range.get('max_eta').isoformat() if eta_range.get('max_eta') else None,
            }
        }
        
        # CSR 페이지네이션을 위해 모든 데이터를 가져옴 (page, size가 없을 경우)
        if page is None or size is None:
            # 클라이언트 사이드 렌더링을 위한 전체 데이터 조회
            items = self.repository.get_all_dashboard_list_with_filters(start_date_obj, end_date_obj, clean_filters)
            total = len(items)
            
            # 페이지네이션 메타데이터 추가
            meta_data["pagination"] = {"total": total}
        else:
            # 서버 사이드 페이지네이션
            items, total = self.repository.get_dashboard_list_by_date_with_filters(
                start_date_obj, end_date_obj, page, size, clean_filters
            )
            
            # 페이지네이션 메타데이터 추가
            meta_data["pagination"] = {
                "page": page,
                "size": size,
                "total": total,
                "pages": (total + size - 1) // size if size > 0 else 0,
            }
        
        # 응답 결과 구성
        result = {
            "items": [self._convert_to_dict(item) for item in items],
            "meta": meta_data
        }
        
        return result

    def get_dashboard_detail(self, dashboard_id: int) -> Dict[str, Any]:
        """대시보드 상세 정보 조회"""
        dashboard = self.repository.get_dashboard_detail(dashboard_id)
        if not dashboard:
            return None
        return self._prepare_dashboard_detail(dashboard)
    
    def get_lock_info(self, dashboard_id: int) -> Dict[str, Any]:
        """대시보드 락 정보 조회"""
        return self.repository.get_lock_info(dashboard_id)

    @transactional
    def delete_dashboards(self, dashboard_ids: List[int], user_id: str) -> int:
        """대시보드 삭제 (관리자 전용, 행 단위 락 사용)"""
        if not dashboard_ids:
            return 0
        try:
            # 행 단위 락을 사용하여 repository에서 처리
            result = self.repository.delete_dashboards(dashboard_ids, user_id)
            return result
        except Exception as e:
            log_error(f"대시보드 삭제 실패: {str(e)}")
            raise

    def search_dashboards_by_order_no(self, order_no: str) -> List[Dict[str, Any]]:
        """주문번호로 대시보드 검색"""
        dashboards = self.repository.search_dashboards_by_order_no(order_no)
        return [self._convert_to_dict(dashboard) for dashboard in dashboards]

    @transactional
    def update_dashboard_status(
        self, dashboard_id: int, status_update: StatusUpdate, user_id: str
    ) -> Dict[str, Any]:
        """대시보드 상태 업데이트 (행 단위 락 사용)"""
        try:
            new_status = status_update.status
            is_admin = status_update.is_admin

            # 행 단위 락을 적용한 대시보드 조회
            dashboard = self.repository.get_dashboard_with_lock(dashboard_id, user_id)

            if not dashboard:
                raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

            # 상태 전이 유효성 검증 (관리자는 모든 상태 변경 가능)
            current_status = dashboard.status
            if not is_admin:
                if new_status not in STATUS_TRANSITIONS.get(current_status, []):
                    raise ValidationException(
                        f"'{current_status}'에서 '{new_status}'로 상태를 변경할 수 없습니다"
                    )

            # 상태별 시간 자동 업데이트
            dashboard.status = new_status
            dashboard.updated_by = user_id
            now = get_kst_now()
            dashboard.update_at = now

            # 출발 시간 (IN_PROGRESS로 변경 시)
            if new_status == "IN_PROGRESS" and not dashboard.depart_time:
                dashboard.depart_time = now

            # 완료 시간 (COMPLETE 또는 ISSUE로 변경 시)
            if (
                new_status == "COMPLETE" or new_status == "ISSUE"
            ) and not dashboard.complete_time:
                dashboard.complete_time = now

            # DB에 변경사항 반영
            self.db.flush()

            return dashboard
        except Exception as e:
            log_error(f"대시보드 상태 업데이트 실패: {str(e)}")
            raise

    @transactional
    def update_dashboard_fields(
        self, dashboard_id: int, fields_update: DashboardUpdate, user_id: str
    ) -> Dict[str, Any]:
        """대시보드 필드 업데이트 (행 수준 락 사용)"""
        try:
            # 행 단위 락이 적용된 대시보드 조회
            dashboard = self.repository.get_dashboard_with_lock(dashboard_id, user_id)

            if not dashboard:
                raise NotFoundException(
                    f"ID가 {dashboard_id}인 대시보드를 찾을 수 없습니다"
                )

            # 업데이트 필드 적용
            update_dict = fields_update.model_dump(exclude_unset=True)
            for key, value in update_dict.items():
                setattr(dashboard, key, value)

            # 업데이트 정보 갱신
            dashboard.updated_by = user_id
            dashboard.update_at = get_kst_now()

            # DB에 변경사항 반영
            self.db.flush()

            # 업데이트된 대시보드 상세 정보 반환
            return dashboard
        except Exception as e:
            log_error(f"대시보드 필드 업데이트 실패: {str(e)}")
            raise

    @transactional
    def assign_driver(
        self,
        dashboard_ids: List[int],
        driver_assignment: DriverAssignment,
        user_id: str,
    ) -> List[Dashboard]:
        """여러 대시보드에 기사 배정 (행 수준 락 사용)"""
        try:
            updated_dashboards = []
            now = get_kst_now()

            # 각 대시보드에 대해 락 획득 후 개별 업데이트
            for dashboard_id in dashboard_ids:
                dashboard = self.repository.get_dashboard_with_lock(
                    dashboard_id, user_id
                )

                if not dashboard:
                    # 하나라도 실패하면 롤백
                    raise NotFoundException(
                        f"ID가 {dashboard_id}인 대시보드를 찾을 수 없습니다"
                    )

                # 기사 정보 업데이트
                dashboard.driver_name = driver_assignment.driver_name
                dashboard.driver_contact = driver_assignment.driver_contact
                dashboard.updated_by = user_id
                dashboard.update_at = now

                updated_dashboards.append(dashboard)

            # 모든 대시보드 업데이트 적용
            self.db.flush()

            # 업데이트된 대시보드 목록 반환
            return updated_dashboards
        except Exception as e:
            log_error(f"기사 배정 실패: {str(e)}")
            raise

    @transactional
    def update_dashboard(
        self, dashboard_id: int, dashboard_update: DashboardUpdate, user_id: str
    ) -> Dict[str, Any]:
        """대시보드 종합 업데이트 (행 수준 락 사용)"""
        try:
            # 업데이트 데이터 준비
            update_data = dashboard_update.model_dump(exclude_unset=True)
            if not update_data:
                raise ValidationException(
                    MESSAGES["VALIDATION"]["REQUIRED"].format(field="업데이트 데이터")
                )

            # 대시보드 락 획득
            dashboard = self.repository.get_dashboard_with_lock(dashboard_id, user_id)
            if not dashboard:
                raise NotFoundException(MESSAGES["ERROR"]["NOT_FOUND"])

            # 상태 변경이 포함된 경우 유효성 검증
            if "status" in update_data:
                new_status = update_data["status"]
                current_status = dashboard.status

                # 관리자가 아닌 경우, 상태 전이 규칙 적용
                if dashboard_update.is_admin is not True:
                    if new_status not in STATUS_TRANSITIONS.get(current_status, []):
                        raise ValidationException(
                            f"'{current_status}'에서 '{new_status}'로 상태를 변경할 수 없습니다"
                        )

                # 상태별 시간 자동 업데이트
                now = get_kst_now()
                if new_status == "IN_PROGRESS" and not dashboard.depart_time:
                    update_data["depart_time"] = now

                if (
                    new_status == "COMPLETE" or new_status == "ISSUE"
                ) and not dashboard.complete_time:
                    update_data["complete_time"] = now

            # 우편번호 변경 시 관련 정보 업데이트
            if "postal_code" in update_data:
                postal_code = update_data["postal_code"]
                postal_info = (
                    self.db.query(PostalCode)
                    .filter(PostalCode.postal_code == postal_code)
                    .first()
                )
                if postal_info:
                    update_data["city"] = postal_info.city
                    update_data["county"] = postal_info.county
                    update_data["district"] = postal_info.district

                    # 창고 정보 확인
                    warehouse = update_data.get("warehouse", dashboard.warehouse)
                    detail_info = (
                        self.db.query(PostalCodeDetail)
                        .filter(
                            PostalCodeDetail.postal_code == postal_code,
                            PostalCodeDetail.warehouse == warehouse,
                        )
                        .first()
                    )
                    if detail_info:
                        update_data["distance"] = detail_info.distance
                        update_data["duration_time"] = detail_info.duration_time

            # 대시보드 업데이트
            for key, value in update_data.items():
                setattr(dashboard, key, value)

            # 업데이트 정보 갱신
            dashboard.updated_by = user_id
            dashboard.update_at = get_kst_now()
            self.db.flush()

            return self._prepare_dashboard_detail(dashboard)
        except LockConflictException:
            # 락 충돌 예외 그대로 전파
            raise
        except Exception as e:
            log_error(f"대시보드 업데이트 실패: {str(e)}")
            raise

    def get_visualization_data(
        self,
        chart_type: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """시각화 데이터 조회 및 가공 처리"""
        if filters is None:
            filters = {}
        
        # 날짜 파싱
        try:
            start_date_obj = None
            end_date_obj = None
            
            if start_date:
                if isinstance(start_date, str):
                    start_date_obj = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                else:
                    start_date_obj = start_date
            
            if end_date:
                if isinstance(end_date, str):
                    end_date_obj = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                else:
                    end_date_obj = end_date
                    
            # 날짜가 지정되지 않은 경우 가장 넓은 범위를 사용하도록 설정
            if not start_date_obj and not end_date_obj:
                # ETA 날짜의 최소/최대 값 조회
                eta_range = self.repository.get_eta_date_range()
                start_date_obj = eta_range.get('min_eta') if eta_range.get('min_eta') else get_kst_now().replace(hour=0, minute=0, second=0)
                end_date_obj = eta_range.get('max_eta') if eta_range.get('max_eta') else get_kst_now().replace(hour=23, minute=59, second=59)
            elif not start_date_obj:
                # 시작일만 없는 경우
                eta_range = self.repository.get_eta_date_range()
                start_date_obj = eta_range.get('min_eta') if eta_range.get('min_eta') else get_kst_now().replace(hour=0, minute=0, second=0)
            elif not end_date_obj:
                # 종료일만 없는 경우
                eta_range = self.repository.get_eta_date_range()
                end_date_obj = eta_range.get('max_eta') if eta_range.get('max_eta') else get_kst_now().replace(hour=23, minute=59, second=59)
        except Exception as e:
            raise ValidationException(f"날짜 형식이 올바르지 않습니다: {str(e)}")
            
        # 설정된 날짜 범위에 맞게 데이터 조회
        dashboards = self.repository.get_all_dashboard_list_with_filters(
            start_date_obj, 
            end_date_obj, 
            filters
        )
        
        # 차트 타입별 데이터 가공
        if chart_type == "time":
            return self._process_time_chart_data(dashboards)
        elif chart_type == "status":
            return self._process_status_chart_data(dashboards)
        elif chart_type == "department":
            return self._process_department_chart_data(dashboards)
        else:
            raise ValidationException(f"지원되지 않는 차트 타입: {chart_type}")

    def _process_time_chart_data(self, dashboards: List[Dashboard]) -> List[Dict[str, Any]]:
        """시간대별 배송 현황 데이터 처리"""
        # 시간대 구간 정의 (9시~18시: 1시간 단위, 18시~9시: 야간 단위)
        time_slots = {
            f"{h:02d}:00 - {h+1:02d}:00": 0 for h in range(9, 18)
        }
        time_slots["18:00 - 09:00"] = 0  # 야간 시간대
        
        total_count = 0
        
        # 각 주문의 ETA 시간대를 확인하여 해당 시간대에 카운트 증가
        for dashboard in dashboards:
            if dashboard.eta:
                hours = dashboard.eta.hour
                
                if 9 <= hours < 18:
                    # 09:00-18:00: 1시간 단위
                    time_slot = f"{hours:02d}:00 - {(hours+1):02d}:00"
                else:
                    # 18:00-09:00: 하나의 단위
                    time_slot = "18:00 - 09:00"
                
                if time_slot in time_slots:
                    time_slots[time_slot] += 1
                    total_count += 1
        
        # 결과 형식 변환 - 시간 순서대로 정렬
        result = []
        for time_slot in sorted(time_slots.keys(), key=lambda x: "24:00" if x == "18:00 - 09:00" else x):
            count = time_slots[time_slot]
            result.append({
                "label": time_slot,
                "count": count,
                "percentage": f"{count/total_count*100:.1f}%" if total_count > 0 else "0.0%"
            })
        
        # 총계 추가
        result.append({
            "label": "총계",
            "count": total_count,
            "percentage": "100.0%"
        })
        
        return result

    def _process_status_chart_data(self, dashboards: List[Dashboard]) -> List[Dict[str, Any]]:
        """상태별 배송 분포 데이터 처리"""
        # 상태별 집계 초기화 (서버 모델 기준)
        statuses = {
            "WAITING": 0,
            "IN_PROGRESS": 0,
            "COMPLETE": 0,
            "ISSUE": 0,
            "CANCEL": 0
        }
        
        total_count = 0
        
        # 각 주문의 상태를 확인하여 해당 상태에 카운트 증가
        for dashboard in dashboards:
            status = dashboard.status
            if status in statuses:
                statuses[status] += 1
                total_count += 1
        
        # 결과 형식 변환
        result = []
        for status, count in statuses.items():
            result.append({
                "label": STATUS_TEXT_MAP.get(status, status),  # 상태 코드를 한글 텍스트로 변환
                "rawLabel": status,  # 원본 상태 코드 (프론트엔드에서 색상 결정 등에 사용)
                "count": count,
                "percentage": f"{count/total_count*100:.1f}%" if total_count > 0 else "0.0%"
            })
        
        # 총계 추가
        result.append({
            "label": "총계",
            "rawLabel": "TOTAL",
            "count": total_count,
            "percentage": "100.0%"
        })
        
        return result

    def _process_department_chart_data(self, dashboards: List[Dashboard]) -> List[Dict[str, Any]]:
        """부서별 상태 분포 데이터 처리"""
        # 부서 목록
        departments = ["CS", "HES", "LENOVO"]
        status_types = ["WAITING", "IN_PROGRESS", "COMPLETE", "ISSUE", "CANCEL"]
        
        # 결과 저장 구조: 부서별 상태 카운트
        dept_status_counts = {}
        
        # 각 부서별 초기화
        for dept in departments:
            dept_status_counts[dept] = {}
            for status in status_types:
                dept_status_counts[dept][status] = 0
            dept_status_counts[dept]["total"] = 0
        
        total_count = 0
        
        # 데이터 집계
        for dashboard in dashboards:
            dept = dashboard.department
            status = dashboard.status
            
            if dept in departments and status in status_types:
                dept_status_counts[dept][status] += 1
                dept_status_counts[dept]["total"] += 1
                total_count += 1
        
        # 결과 형식 변환
        result = []
        for dept in departments:
            # 각 부서별 현황
            status_details = {}
            for status in status_types:
                count = dept_status_counts[dept][status]
                status_details[status] = {
                    "count": count,
                    "percentage": f"{count/dept_status_counts[dept]['total']*100:.1f}%" if dept_status_counts[dept]["total"] > 0 else "0.0%"
                }
            
            result.append({
                "label": dept,
                "count": dept_status_counts[dept]["total"],
                "percentage": f"{dept_status_counts[dept]['total']/total_count*100:.1f}%" if total_count > 0 else "0.0%",
                "statusCounts": status_details
            })
        
        # 총계 추가
        result.append({
            "label": "총계",
            "count": total_count,
            "percentage": "100.0%"
        })
        
        return result
