# teckwah_project/server/api/dashboard_simple_router.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from server.config.database import get_db
from server.api.deps import get_current_user
from server.schemas.auth_schema import TokenData
from server.models.dashboard_model import Dashboard
from server.schemas.dashboard_schema import (
    DashboardListItem,
    DashboardDetail,
    DashboardUpdate,
    StatusUpdate,
)
from server.schemas.common_schema import ApiResponse, MetaBuilder
from server.utils.error import (
    error_handler,
    NotFoundException,
    ValidationException,
)
from server.utils.common import (
    build_search_query,
    format_remark,
    calculate_pagination,
    sanitize_input,
)
from server.utils.datetime import get_kst_now

router = APIRouter(prefix="/dashboard-simple", tags=["대시보드 (간소화)"])


@router.get("/list", response_model=ApiResponse[List[DashboardListItem]])
@error_handler("대시보드 목록 조회 (간소화)")
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
    """대시보드 목록 조회 API (간소화)"""

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
    return ApiResponse(
        success=True,
        message="목록을 조회했습니다",
        data=[DashboardListItem.model_validate(item) for item in items],
        meta=MetaBuilder.pagination(total, page, size),
    )


@router.get("/{dashboard_id}", response_model=ApiResponse[DashboardDetail])
@error_handler("대시보드 상세 조회 (간소화)")
async def get_dashboard_detail(
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 상세 정보 조회 API (간소화)"""

    dashboard = (
        db.query(Dashboard).filter(Dashboard.dashboard_id == dashboard_id).first()
    )

    if not dashboard:
        raise NotFoundException(f"ID가 {dashboard_id}인 대시보드를 찾을 수 없습니다")

    return ApiResponse(
        success=True,
        message="상세 정보를 조회했습니다",
        data=DashboardDetail.model_validate(dashboard),
    )


@router.put("/{dashboard_id}", response_model=ApiResponse[DashboardDetail])
@error_handler("대시보드 정보 수정 (간소화)")
async def update_dashboard(
    dashboard_id: int,
    update_data: DashboardUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 정보 수정 API (간소화)"""

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
        dashboard.remark = sanitize_input(update_dict["remark"])
        dashboard.updated_by = current_user.user_id

    # 변경 시간 업데이트
    dashboard.updated_by = current_user.user_id

    db.commit()
    db.refresh(dashboard)

    return ApiResponse(
        success=True,
        message="정보를 수정했습니다",
        data=DashboardDetail.model_validate(dashboard),
    )


@router.patch("/{dashboard_id}/status", response_model=ApiResponse[DashboardDetail])
@error_handler("대시보드 상태 변경 (간소화)")
async def update_dashboard_status(
    dashboard_id: int,
    status_update: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 상태 변경 API (간소화)"""

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

    # 변경 정보 업데이트
    dashboard.updated_by = current_user.user_id

    db.commit()
    db.refresh(dashboard)

    return ApiResponse(
        success=True,
        message="상태를 변경했습니다",
        data=DashboardDetail.model_validate(dashboard),
    )
