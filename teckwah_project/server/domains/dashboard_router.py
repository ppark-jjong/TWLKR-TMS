from fastapi import APIRouter, Depends, Response, status, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime

from server.config.database import get_db
from server.schemas.auth_schema import TokenData
from server.schemas.dashboard_schema import (
    DashboardCreate, 
    DashboardUpdate, 
    DashboardResponse,
    DashboardListResponse,
    StatusUpdateRequest,
    DriverAssignRequest,
)
from server.schemas.common_schema import ApiResponse
from server.utils.error import error_handler
from server.api.deps import get_current_user
from server.domains.dashboard_manager import DashboardManager

router = APIRouter(prefix="/dashboard", tags=["대시보드"])

def get_dashboard_manager(db: Session = Depends(get_db)) -> DashboardManager:
    """DashboardManager 의존성 주입 헬퍼"""
    return DashboardManager(db)

@router.get("", response_model=ApiResponse[DashboardListResponse])
@error_handler("대시보드 목록 조회")
async def get_dashboards(
    page: int = Query(1, ge=1, description="페이지 번호"),
    size: int = Query(10, ge=1, le=100, description="페이지 크기"),
    sort_by: Optional[str] = Query(None, description="정렬 기준 필드"),
    sort_desc: bool = Query(True, description="내림차순 정렬 여부"),
    status: Optional[List[str]] = Query(None, description="대시보드 상태 필터"),
    department: Optional[str] = Query(None, description="부서 필터"),
    eta_start: Optional[datetime] = Query(None, description="ETA 시작 시간"),
    eta_end: Optional[datetime] = Query(None, description="ETA 종료 시간"),
    search_keyword: Optional[str] = Query(None, description="검색어"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
    dashboard_manager: DashboardManager = Depends(get_dashboard_manager),
):
    """
    대시보드 목록을 조회합니다.
    
    필터링, 정렬, 페이지네이션을 지원합니다.
    """
    # 필터 조건 생성
    filters = {
        "status": status,
        "department": department,
        "eta_start": eta_start,
        "eta_end": eta_end,
        "search_keyword": search_keyword,
    }
    
    # 관리자가 아닌 경우 삭제된 항목은 제외
    if not current_user.is_admin and (status is None or "DELETED" not in status):
        if isinstance(filters["status"], list):
            filters["status"] = [s for s in filters["status"] if s != "DELETED"]
        else:
            filters["status"] = [s for s in (filters["status"] or []) if s != "DELETED"]
    
    # 조회 실행
    result = dashboard_manager.get_dashboards(
        filters=filters,
        page=page,
        size=size,
        sort_by=sort_by,
        sort_desc=sort_desc,
    )
    
    return ApiResponse[DashboardListResponse](
        success=True,
        message="대시보드 목록을 조회했습니다",
        data=DashboardListResponse(
            items=[DashboardResponse.from_orm(item) for item in result["items"]],
            meta=result["meta"],
        ),
    )

@router.get("/{dashboard_id}", response_model=ApiResponse[DashboardResponse])
@error_handler("대시보드 상세 조회")
async def get_dashboard(
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
    dashboard_manager: DashboardManager = Depends(get_dashboard_manager),
):
    """
    특정 대시보드의 상세 정보를 조회합니다.
    """
    dashboard = dashboard_manager.get_dashboard_by_id(dashboard_id)
    
    # 삭제된 항목을 일반 사용자가 조회할 수 없음
    if dashboard.status == "DELETED" and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="삭제된 항목을 조회할 권한이 없습니다",
        )
    
    return ApiResponse[DashboardResponse](
        success=True,
        message="대시보드 정보를 조회했습니다",
        data=DashboardResponse.from_orm(dashboard),
    )

@router.post("", response_model=ApiResponse[DashboardResponse])
@error_handler("대시보드 생성")
async def create_dashboard(
    dashboard_data: DashboardCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
    dashboard_manager: DashboardManager = Depends(get_dashboard_manager),
):
    """
    새로운 대시보드를 생성합니다.
    """
    # 생성 시 현재 사용자 정보 추가
    dashboard_dict = dashboard_data.dict()
    dashboard_dict["created_by"] = current_user.user_id
    dashboard_dict["updated_by"] = current_user.user_id
    
    # 생성 실행
    dashboard = dashboard_manager.create_dashboard(dashboard_dict)
    
    return ApiResponse[DashboardResponse](
        success=True,
        message="대시보드가 생성되었습니다",
        data=DashboardResponse.from_orm(dashboard),
    )

@router.put("/{dashboard_id}/status", response_model=ApiResponse[DashboardResponse])
@error_handler("대시보드 상태 변경")
async def update_dashboard_status(
    dashboard_id: int,
    status_data: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
    dashboard_manager: DashboardManager = Depends(get_dashboard_manager),
):
    """
    대시보드의 상태를 변경합니다.
    
    관리자만 삭제 상태로 변경 가능합니다.
    """
    # 상태 변경 실행
    dashboard = dashboard_manager.update_status(
        dashboard_id=dashboard_id,
        status=status_data.status,
        user_id=current_user.user_id,
        is_admin=current_user.is_admin,
    )
    
    return ApiResponse[DashboardResponse](
        success=True,
        message="대시보드 상태가 변경되었습니다",
        data=DashboardResponse.from_orm(dashboard),
    )

@router.post("/assign", response_model=ApiResponse[Dict[str, Any]])
@error_handler("배차 처리")
async def assign_driver(
    assign_data: DriverAssignRequest,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
    dashboard_manager: DashboardManager = Depends(get_dashboard_manager),
):
    """
    여러 대시보드에 기사를 배차합니다.
    
    다중 항목 처리를 위한 원자적 작업으로 수행됩니다.
    """
    # 배차 정보
    driver_data = {
        "driver_name": assign_data.driver_name,
        "driver_contact": assign_data.driver_contact,
    }
    
    # 배차 처리 실행
    updated_dashboards = dashboard_manager.assign_driver(
        dashboard_ids=assign_data.dashboard_ids,
        driver_data=driver_data,
        user_id=current_user.user_id,
    )
    
    return ApiResponse[Dict[str, Any]](
        success=True,
        message=f"{len(updated_dashboards)}건의 배차가 완료되었습니다",
        data={
            "count": len(updated_dashboards),
            "dashboard_ids": [d.dashboard_id for d in updated_dashboards],
        },
    )

@router.delete("/{dashboard_id}", response_model=ApiResponse[Dict[str, Any]])
@error_handler("대시보드 삭제")
async def delete_dashboard(
    dashboard_id: int,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
    dashboard_manager: DashboardManager = Depends(get_dashboard_manager),
):
    """
    대시보드를 삭제합니다. (관리자 전용)
    
    소프트 삭제 방식으로, 상태만 변경됩니다.
    """
    result = dashboard_manager.delete_dashboard(
        dashboard_id=dashboard_id,
        user_id=current_user.user_id,
        is_admin=current_user.is_admin,
    )
    
    return ApiResponse[Dict[str, Any]](
        success=result,
        message="대시보드가 삭제되었습니다",
        data={"dashboard_id": dashboard_id},
    )

@router.get("/stats", response_model=ApiResponse[Dict[str, Any]])
@error_handler("대시보드 통계")
async def get_dashboard_stats(
    department: Optional[str] = Query(None, description="부서 필터"),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
    dashboard_manager: DashboardManager = Depends(get_dashboard_manager),
):
    """
    대시보드 상태별 통계 정보를 조회합니다.
    """
    # 필터 생성
    filters = {}
    if department:
        filters["department"] = department
    
    # 통계 조회
    stats = dashboard_manager.get_dashboard_stats(filters)
    
    return ApiResponse[Dict[str, Any]](
        success=True,
        message="대시보드 통계를 조회했습니다",
        data=stats,
    ) 