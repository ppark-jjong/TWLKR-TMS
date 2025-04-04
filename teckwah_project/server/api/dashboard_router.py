# server/api/dashboard_router.py - 통합된 메모 처리 구현

from fastapi import APIRouter, Depends, Body, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any, Optional
from datetime import datetime

from server.config.database import get_db
from server.api.deps import get_current_user, check_admin_access
from server.schemas.auth_schema import TokenData
from server.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardUpdate,
    DashboardListItem,
    DashboardDetail,
    StatusUpdate,
    DriverAssignment,
    DashboardListResponse,
    DashboardDetailResponse,
)
from server.schemas.common_schema import ApiResponse, MetaBuilder
from server.models.dashboard_model import Dashboard
from server.models.postal_code_model import PostalCode, PostalCodeDetail
from server.utils.error import (
    error_handler,
    NotFoundException,
    ValidationException,
    LockConflictException,
    ForbiddenException,
)
from server.utils.datetime import get_date_range, get_kst_now
from server.utils.transaction import transaction
from server.utils.constants import STATUS_TRANSITIONS, STATUS_TEXT_MAP
from server.utils.common import (
    build_search_query,
    format_remark,
    calculate_pagination,
    sanitize_input,
)
from server.repositories.dashboard_repository import DashboardRepository
from server.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["대시보드"])


# 서비스 의존성
def get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    repository = DashboardRepository(db)
    return DashboardService(repository, db)


@router.get("/list", response_model=DashboardListResponse)
@error_handler("대시보드 목록 조회")
async def get_dashboard_list(
    page: Optional[int] = None,
    size: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search_term: Optional[str] = None,
    status: Optional[str] = None,
    department: Optional[str] = None,
    warehouse: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """날짜 기준 대시보드 데이터 조회 API - CSR 필터링 지원"""

    repository = DashboardRepository(db)
    
    # 시작/종료 날짜 처리 - 유연한 형식 지원
    # 날짜 파라미터가 문자열로 전달되면 변환 시도
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
            eta_range = repository.get_eta_date_range()
            start_date_obj = eta_range.get('min_eta') if eta_range.get('min_eta') else get_kst_now().replace(hour=0, minute=0, second=0)
            end_date_obj = eta_range.get('max_eta') if eta_range.get('max_eta') else get_kst_now().replace(hour=23, minute=59, second=59)
        elif not start_date_obj:
            # 시작일만 없는 경우
            eta_range = repository.get_eta_date_range()
            start_date_obj = eta_range.get('min_eta') if eta_range.get('min_eta') else get_kst_now().replace(hour=0, minute=0, second=0)
        elif not end_date_obj:
            # 종료일만 없는 경우
            eta_range = repository.get_eta_date_range()
            end_date_obj = eta_range.get('max_eta') if eta_range.get('max_eta') else get_kst_now().replace(hour=23, minute=59, second=59)
    except Exception as e:
        raise ValidationException(f"날짜 형식이 올바르지 않습니다: {str(e)}")

    # 필터 조건 설정
    filters = {}
    if status and status.strip():
        filters["status"] = status
    if department and department.strip():
        filters["department"] = department
    if warehouse and warehouse.strip():
        filters["warehouse"] = warehouse
    if search_term and search_term.strip():
        filters["search_term"] = search_term

    # ETA 날짜 범위 조회 (UI에서 날짜 선택기 제한용)
    eta_range = repository.get_eta_date_range()
    
    # 메타데이터 기본 정보
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
        items = repository.get_all_dashboard_list_with_filters(start_date_obj, end_date_obj, filters)
        total = len(items)
        
        # 페이지네이션 메타데이터 추가
        meta_data["pagination"] = {"total": total}
    else:
        # 서버 사이드 페이지네이션(선택 사항)
        items, total = repository.get_dashboard_list_by_date_with_filters(
            start_date_obj, end_date_obj, page, size, filters
        )
        
        # 페이지네이션 메타데이터 추가
        meta_data["pagination"] = {
            "page": page,
            "size": size,
            "total": total,
            "pages": (total + size - 1) // size,
        }
    
    # 응답 생성
    return DashboardListResponse(
        success=True,
        message="목록을 조회했습니다",
        data=[DashboardListItem.model_validate(item) for item in items],
        meta=meta_data,
    )


@router.get("/{dashboard_id}", response_model=DashboardDetailResponse)
@error_handler("대시보드 상세 조회")
async def get_dashboard_detail(
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
):
    """대시보드 상세 정보 조회 API"""

    # 서비스를 통해 대시보드 상세 정보 조회
    dashboard = service.get_dashboard_detail(dashboard_id)
    if not dashboard:
        raise NotFoundException(f"ID가 {dashboard_id}인 대시보드를 찾을 수 없습니다")

    # 락 정보 조회 (UI 표시용)
    repository = DashboardRepository(db)
    lock_info = repository.get_lock_info(dashboard_id)

    # 락 메타데이터 생성
    is_locked = False
    lock_metadata = None
    if lock_info:
        is_locked = lock_info.get("is_locked", False)

    return DashboardDetailResponse(
        success=True,
        message="상세 정보를 조회했습니다",
        data=DashboardDetail.model_validate(dashboard),
        meta=MetaBuilder.lock_info(is_locked, lock_metadata),
    )


@router.post("", response_model=DashboardDetailResponse)
@error_handler("대시보드 생성")
async def create_dashboard(
    dashboard_data: DashboardCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
):
    """대시보드 생성 API"""

    # 데이터 정제
    dashboard_dict = dashboard_data.model_dump()
    # 사용자 정보 설정 (생성자 = 업데이트한 사용자)
    dashboard_dict["updated_by"] = current_user.user_id

    # 메모 처리
    if "remark" in dashboard_dict and dashboard_dict["remark"]:
        dashboard_dict["remark"] = sanitize_input(dashboard_dict["remark"])

    # 생성 시간 설정
    dashboard_dict["create_time"] = get_kst_now()

    # 서비스를 통해 대시보드 생성
    with transaction(db):
        dashboard = service.create_dashboard(dashboard_dict)

    return DashboardDetailResponse(
        success=True,
        message="대시보드를 생성했습니다",
        data=DashboardDetail.model_validate(dashboard),
    )


@router.put("/{dashboard_id}", response_model=DashboardDetailResponse)
@error_handler("대시보드 정보 수정")
async def update_dashboard(
    dashboard_id: int,
    update_data: DashboardUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
):
    """대시보드 정보 수정 API (행 수준 락 사용)"""

    # 업데이트 데이터 준비
    update_dict = update_data.model_dump(exclude_unset=True)

    # 메모 처리 - 통합된 방식
    if "remark" in update_dict:
        # 메모 내용 살균
        update_dict["remark"] = sanitize_input(update_dict["remark"])

    # 서비스를 통해 트랜잭션 내에서 락 획득 및 업데이트
    with transaction(db):
        # 수정 진행 (행 단위 락 사용)
        updated_dashboard = service.update_dashboard_fields(
            dashboard_id, update_data, current_user.user_id
        )

    if not updated_dashboard:
        raise NotFoundException(f"ID가 {dashboard_id}인 대시보드를 찾을 수 없습니다")

    return DashboardDetailResponse(
        success=True,
        message="대시보드 정보를 수정했습니다",
        data=DashboardDetail.model_validate(updated_dashboard),
    )


@router.patch("/{dashboard_id}/status", response_model=DashboardDetailResponse)
@error_handler("대시보드 상태 변경")
async def update_dashboard_status(
    dashboard_id: int,
    status_update: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
):
    """대시보드 상태 변경 API (행 수준 락 사용)"""

    # 관리자 여부 확인
    is_admin = current_user.role == "ADMIN"
    status_update.is_admin = is_admin

    # 서비스를 통해 트랜잭션 내에서 락 획득 및 상태 업데이트 (updated_by 필드 업데이트)
    with transaction(db):
        # 행 단위 락 적용 및 상태 업데이트
        updated_dashboard = service.update_dashboard_status(
            dashboard_id, status_update, current_user.user_id
        )

    # 응답 메시지 생성
    status_text = STATUS_TEXT_MAP.get(status_update.status, status_update.status)
    message = f"상태를 '{status_text}'(으)로 변경했습니다"

    return DashboardDetailResponse(
        success=True,
        message=message,
        data=DashboardDetail.model_validate(updated_dashboard),
    )


@router.post("/assign", response_model=ApiResponse[List[DashboardDetail]])
@error_handler("배차 처리")
async def assign_driver(
    assignment: DriverAssignment,
    dashboard_ids: List[int] = Body(...),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
):
    """배차 처리 API - 여러 대시보드에 기사 배정 (행 수준 락 사용)"""

    # 유효성 검증
    if not dashboard_ids:
        raise ValidationException("배차할 대시보드를 선택해주세요")

    if not assignment.driver_name and not assignment.driver_contact:
        raise ValidationException("기사명 또는 연락처를 입력해주세요")

    # 서비스를 통해 트랜잭션 내에서 락 획득 및 배차 처리 (updated_by 필드 업데이트)
    with transaction(db):
        updated_dashboards = service.assign_driver(
            dashboard_ids, assignment, current_user.user_id
        )

    # 응답 메시지 생성
    count = len(updated_dashboards)
    message = f"{count}건의 배차 처리가 완료되었습니다"

    return ApiResponse(
        success=True,
        message=message,
        data=[
            DashboardDetail.model_validate(dashboard)
            for dashboard in updated_dashboards
        ],
    )


@router.delete("", response_model=ApiResponse)
@error_handler("대시보드 삭제")
async def delete_dashboards(
    dashboard_ids: List[int] = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(check_admin_access),  # 관리자만 가능
    service: DashboardService = Depends(get_dashboard_service),
):
    """대시보드 삭제 API (행 수준 락 사용)"""

    # 유효성 검증
    if not dashboard_ids:
        raise ValidationException("삭제할 대시보드를 선택해주세요")

    # 서비스를 통해 트랜잭션 내에서 락 획득 및 삭제 처리
    with transaction(db):
        deleted_count = service.delete_dashboards(dashboard_ids, current_user.user_id)

    # 응답 메시지 생성
    message = f"{deleted_count}건의 대시보드를 삭제했습니다"

    return ApiResponse(
        success=True,
        message=message,
    )
