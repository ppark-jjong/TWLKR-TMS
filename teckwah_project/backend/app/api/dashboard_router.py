# backend/app/api/dashboard_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
from sqlalchemy.orm import Session
from typing import List

from app.schemas.dashboard_schema import (
    DashboardListResponse,
    DashboardDetailResponse,
    DashboardListData,
    StatusUpdate,
    RemarkUpdate,
    DriverAssignment,
    AdminDashboardListResponse,
    DashboardCreate,
)
from app.schemas.common_schema import DashboardListResponse, DateRangeInfo
from app.services.dashboard_service import DashboardService
from app.config.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_info, log_error

router = APIRouter()


def get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    """DashboardService 의존성 주입"""
    return DashboardService(db)


@router.get("/list", response_model=DashboardListResponse)
async def get_dashboard_list(
    date: str,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 목록 조회 API"""
    try:
        log_info(f"대시보드 목록 조회 요청: {date}")
        target_date = datetime.strptime(date, "%Y-%m-%d")

        items = service.get_dashboard_list(target_date)
        oldest_date, latest_date = service.get_date_range()

        response_data = DashboardListData(
            date_range=DateRangeInfo(
                oldest_date=oldest_date.strftime("%Y-%m-%D"),
                latest_date=latest_date.strftime("%Y-%m-%d"),
            ),
            items=items,
        )

        return DashboardListResponse(
            success=True, message="데이터를 성공적으로 조회했습니다", data=response_data
        )
    except ValueError as e:
        log_error(e, "날짜 형식 오류")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)",
        )
    except Exception as e:
        log_error(e, "대시보드 목록 조회 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 목록 조회 중 오류가 발생했습니다",
        )


@router.get("/admin/list", response_model=AdminDashboardListResponse)
async def get_admin_dashboard_list(
    start_date: str,
    end_date: str,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """관리자 대시보드 목록 조회 API"""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="관리자만 접근할 수 있습니다"
        )

    try:
        log_info(f"관리자 대시보드 목록 조회 요청: {start_date} ~ {end_date}")
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

        items = service.get_dashboard_list_by_date_range(start, end)
        oldest_date, latest_date = service.get_date_range()

        response_data = DashboardListData(
            date_range=DateRangeInfo(
                oldest_date=oldest_date.strftime("%Y-%m-%d"),
                latest_date=latest_date.strftime("%Y-%m-%d"),
            ),
            items=items,
        )

        return AdminDashboardListResponse(
            success=True, message="데이터를 성공적으로 조회했습니다", data=response_data
        )
    except ValueError as e:
        log_error(e, "날짜 형식 오류")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)",
        )
    except Exception as e:
        log_error(e, "관리자 대시보드 목록 조회 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 목록 조회 중 오류가 발생했습니다",
        )


@router.get("/{dashboard_id}", response_model=DashboardDetailResponse)
async def get_dashboard_detail(
    dashboard_id: int,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 상세 조회 API"""
    try:
        log_info(f"대시보드 상세 조회 요청: {dashboard_id}")
        dashboard = service.get_dashboard_detail(dashboard_id)

        return DashboardDetailResponse(
            success=True, message="상세 정보를 성공적으로 조회했습니다", data=dashboard
        )
    except Exception as e:
        log_error(e, "대시보드 상세 조회 실패")
        raise


@router.post("", response_model=DashboardDetailResponse)
async def create_dashboard(
    dashboard: DashboardCreate,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 생성 API"""
    try:
        log_info(
            "대시보드 생성 요청",
            {"type": dashboard.type, "order_no": dashboard.order_no},
        )
        result = service.create_dashboard(dashboard, current_user.department)

        return DashboardDetailResponse(
            success=True, message="대시보드가 생성되었습니다", data=result
        )
    except Exception as e:
        log_error(e, "대시보드 생성 실패")
        raise


@router.patch("/{dashboard_id}/status", response_model=DashboardDetailResponse)
async def update_status(
    dashboard_id: int,
    status_update: StatusUpdate,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """상태 업데이트 API"""
    try:
        log_info(f"상태 업데이트 요청: {dashboard_id} -> {status_update.status}")
        result = service.update_status(
            dashboard_id, status_update, is_admin=(current_user.role == "ADMIN")
        )

        return DashboardDetailResponse(
            success=True,
            message=f"{status_update.status} 상태로 변경되었습니다",
            data=result,
        )
    except Exception as e:
        log_error(e, "상태 업데이트 실패")
        raise


@router.patch("/{dashboard_id}/remark", response_model=DashboardDetailResponse)
async def update_remark(
    dashboard_id: int,
    remark_update: RemarkUpdate,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """메모 업데이트 API"""
    try:
        log_info(f"메모 업데이트 요청: {dashboard_id}")
        result = service.update_remark(dashboard_id, remark_update)

        return DashboardDetailResponse(
            success=True, message="메모가 업데이트되었습니다", data=result
        )
    except Exception as e:
        log_error(e, "메모 업데이트 실패")
        raise


@router.post("/assign", response_model=BaseResponse[List[DashboardResponse]])
async def assign_driver(
    assignment: DriverAssignment,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """배차 정보 업데이트 API"""
    try:
        log_info("배차 처리 요청", {"dashboard_ids": assignment.dashboard_ids})
        result = service.assign_driver(assignment)

        return BaseResponse(success=True, message="배차가 완료되었습니다", data=result)
    except Exception as e:
        log_error(e, "배차 처리 실패")
        raise


@router.delete("", response_model=BaseResponse)
async def delete_dashboards(
    dashboard_ids: List[int],
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 삭제 API"""
    try:
        if current_user.role != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="관리자만 삭제할 수 있습니다",
            )

        log_info("대시보드 삭제 요청", {"dashboard_ids": dashboard_ids})
        success = service.delete_dashboards(dashboard_ids)

        return BaseResponse(
            success=True,
            message="선택한 항목이 삭제되었습니다",
            data={"deleted_ids": dashboard_ids},
        )
    except HTTPException:
        raise
    except Exception as e:
        log_error(e, "대시보드 삭제 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 삭제 중 오류가 발생했습니다",
        )


@router.get("/date-range", response_model=BaseResponse[DateRangeInfo])
async def get_date_range(
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """조회 가능한 날짜 범위 조회 API"""
    try:
        oldest_date, latest_date = service.get_date_range()
        return BaseResponse(
            success=True,
            message="날짜 범위 조회 성공",
            data=DateRangeInfo(
                oldest_date=oldest_date.strftime("%Y-%m-%d"),
                latest_date=latest_date.strftime("%Y-%m-%d"),
            ),
        )
    except Exception as e:
        log_error(e, "날짜 범위 조회 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="날짜 범위 조회 중 오류가 발생했습니다",
        )
