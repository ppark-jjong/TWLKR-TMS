# teckwah_project/main/server/api/dashboard_router.py
from fastapi import APIRouter, Depends, Body, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any, Optional
from datetime import datetime

from main.server.config.database import get_db
from main.server.api.deps import get_current_user, check_admin_access
from main.server.schemas.auth_schema import TokenData
from main.server.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardUpdate,
    DashboardListItem,
    DashboardDetail,
    StatusUpdate,
    DriverAssignment,
    DashboardListResponse,
    DashboardDetailResponse,
)
from main.server.schemas.common_schema import ApiResponse, MetaBuilder
from main.server.models.dashboard_model import Dashboard
from main.server.models.postal_code_model import PostalCode, PostalCodeDetail
from main.server.models.dashboard_lock_model import DashboardLock
from main.server.utils.error import (
    error_handler,
    NotFoundException,
    ValidationException,
    InvalidStatusTransitionException,
    PessimisticLockException,
    LockConflictException,
)
from main.server.utils.datetime import get_date_range, get_kst_now
from main.server.utils.lock_manager import LockManager
from main.server.utils.constants import STATUS_TRANSITIONS, STATUS_TEXT_MAP
from main.server.utils.common import (
    build_search_query,
    format_remark,
    calculate_pagination,
    sanitize_input,
)

router = APIRouter(prefix="/dashboard", tags=["대시보드"])


# 락 매니저 의존성
def get_lock_manager(db: Session = Depends(get_db)) -> LockManager:
    from main.server.repositories.dashboard_repository import DashboardRepository

    repository = DashboardRepository(db)
    return LockManager(repository, db)


@router.get("/list", response_model=DashboardListResponse)
@error_handler("대시보드 목록 조회")
async def get_dashboard_list(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search_term: Optional[str] = None,
    status: Optional[str] = None,
    department: Optional[str] = None,
    warehouse: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 목록 조회 API"""

    # 기본 쿼리 생성
    query = db.query(Dashboard)

    # 검색 조건 적용
    query = build_search_query(
        query=query,
        search_term=search_term,
        filters={"status": status, "department": department, "warehouse": warehouse},
        date_range={"start_date": start_date, "end_date": end_date},
    )

    # 정렬 및 페이지네이션
    total = query.count()
    items = (
        query.order_by(Dashboard.eta.desc()).offset((page - 1) * size).limit(size).all()
    )

    # 응답 생성
    return DashboardListResponse(
        success=True,
        message="목록을 조회했습니다",
        data=[DashboardListItem.model_validate(item) for item in items],
        meta=MetaBuilder.pagination(total, page, size),
    )


@router.get("/{dashboard_id}", response_model=DashboardDetailResponse)
@error_handler("대시보드 상세 조회")
async def get_dashboard_detail(
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 상세 정보 조회 API"""

    dashboard = (
        db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
    )

    if not dashboard:
        raise NotFoundException(f"ID가 {dashboard_id}인 대시보드를 찾을 수 없습니다")

    # 락 정보 조회
    lock = (
        db.query(DashboardLock)
        .filter(DashboardLock.dashboard_id == dashboard_id)
        .first()
    )

    # 락 메타데이터 생성
    is_locked = False
    lock_info = None
    if lock and not lock.is_expired:
        is_locked = True
        lock_info = {
            "locked_by": lock.locked_by,
            "lock_type": lock.lock_type,
            "expires_at": lock.expires_at.isoformat(),
        }

    return DashboardDetailResponse(
        success=True,
        message="상세 정보를 조회했습니다",
        data=DashboardDetail.model_validate(dashboard),
        meta=MetaBuilder.lock_info(is_locked, lock_info),
    )


@router.post("", response_model=DashboardDetailResponse)
@error_handler("대시보드 생성")
async def create_dashboard(
    dashboard_data: DashboardCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 생성 API"""

    # 데이터 정제
    dashboard_dict = dashboard_data.model_dump()
    dashboard_dict["department"] = current_user.department
    dashboard_dict["updated_by"] = current_user.user_id

    # 메모 처리
    if "remark" in dashboard_dict and dashboard_dict["remark"]:
        dashboard_dict["remark"] = sanitize_input(dashboard_dict["remark"])

    # 대시보드 생성
    dashboard = Dashboard(**dashboard_dict)
    db.add(dashboard)
    db.commit()
    db.refresh(dashboard)

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
):
    """대시보드 정보 수정 API"""

    # 락 확인
    lock = (
        db.query(DashboardLock)
        .filter(DashboardLock.dashboard_id == dashboard_id)
        .first()
    )

    if lock and not lock.is_expired and lock.locked_by != current_user.user_id:
        raise LockConflictException("다른 사용자가 수정 중입니다")

    dashboard = (
        db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
    )

    if not dashboard:
        raise NotFoundException(f"ID가 {dashboard_id}인 대시보드를 찾을 수 없습니다")

    # 업데이트 데이터 적용
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        if value is not None:
            setattr(dashboard, key, value)

    # 메모 업데이트
    if "remark" in update_dict:
        remark_data = format_remark(
            sanitize_input(update_dict["remark"]), current_user.user_id
        )
        for key, value in remark_data.items():
            setattr(dashboard, key, value)

    # 변경 시간 업데이트
    dashboard.updated_at = get_kst_now()

    db.commit()
    db.refresh(dashboard)

    return DashboardDetailResponse(
        success=True,
        message="정보를 수정했습니다",
        data=DashboardDetail.model_validate(dashboard),
    )


@router.patch("/{dashboard_id}/status", response_model=DashboardDetailResponse)
@error_handler("대시보드 상태 변경")
async def update_dashboard_status(
    dashboard_id: int,
    status_update: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 상태 변경 API"""

    # 락 확인
    lock = (
        db.query(DashboardLock)
        .filter(DashboardLock.dashboard_id == dashboard_id)
        .first()
    )

    if lock and not lock.is_expired and lock.locked_by != current_user.user_id:
        raise LockConflictException("다른 사용자가 수정 중입니다")

    dashboard = (
        db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
    )

    if not dashboard:
        raise NotFoundException(f"ID가 {dashboard_id}인 대시보드를 찾을 수 없습니다")

    # 상태 변경
    dashboard.status = status_update.status

    # 상태별 시간 업데이트
    now = get_kst_now()
    if status_update.status == "IN_PROGRESS":
        dashboard.depart_time = now
    elif status_update.status == "COMPLETE":
        dashboard.complete_time = now

    # 변경 시간 업데이트
    dashboard.updated_at = now

    db.commit()
    db.refresh(dashboard)

    return DashboardDetailResponse(
        success=True,
        message="상태를 변경했습니다",
        data=DashboardDetail.model_validate(dashboard),
    )


@router.post("/assign", response_model=ApiResponse[List[DashboardDetail]])
@error_handler("배차 처리")
async def assign_driver(
    assignment: DriverAssignment,
    db: Session = Depends(get_db),
    lock_manager: LockManager = Depends(get_lock_manager),
    current_user: TokenData = Depends(get_current_user),
):
    """배차 처리 API (비관적 락 적용)"""
    dashboard_ids = assignment.dashboard_ids
    if not dashboard_ids:
        raise ValidationException("배차할 대시보드 ID가 없습니다")

    driver_name = assignment.driver_name
    driver_contact = assignment.driver_contact

    # 다중 락 획득 시도 (All-or-Nothing)
    with lock_manager.acquire_multiple_locks(
        dashboard_ids, current_user.user_id, "ASSIGN"
    ):
        # 배차 정보 업데이트
        updated_count = (
            db.query(Dashboard)
            .filter(Dashboard.dashboard_id.in_(dashboard_ids))
            .update(
                {
                    "driver_name": driver_name,
                    "driver_contact": driver_contact,
                },
                synchronize_session=False,  # bulk update 최적화
            )
        )

        # 업데이트된 대시보드 목록 조회
        updated_dashboards = (
            db.query(Dashboard).filter(Dashboard.dashboard_id.in_(dashboard_ids)).all()
        )

        # 응답 생성
        result = [
            DashboardDetail.model_validate(dashboard)
            for dashboard in updated_dashboards
        ]

        return ApiResponse(
            success=True,
            message="배차가 완료되었습니다",
            data=result,
            meta={"updated_count": updated_count},
        )


@router.delete("", response_model=ApiResponse)
@error_handler("대시보드 삭제")
async def delete_dashboards(
    dashboard_ids: List[int] = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(check_admin_access),  # 관리자만 가능
):
    """대시보드 삭제 API - 관리자 전용"""
    if not dashboard_ids:
        raise ValidationException("삭제할 대시보드 ID가 없습니다")

    # 삭제 실행
    deleted_count = (
        db.query(Dashboard)
        .filter(Dashboard.dashboard_id.in_(dashboard_ids))
        .delete(synchronize_session=False)  # bulk delete 최적화
    )

    return ApiResponse(
        success=True,
        message="선택한 항목이 삭제되었습니다",
        data=None,
        meta={"deleted_count": deleted_count},
    )
