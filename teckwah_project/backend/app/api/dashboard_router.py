# backend/app/api/dashboard_router.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from datetime import datetime

from app.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardResponse,
    DashboardDetail,
    StatusUpdate,
    RemarkUpdate,
    DriverAssignment,
    ApiResponse,
)
from app.services.dashboard_service import DashboardService
from app.repositories.dashboard_repository import DashboardRepository
from app.config.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_error, log_info

router = APIRouter()


def get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    """DashboardService 의존성 주입"""
    repository = DashboardRepository(db)
    return DashboardService(repository)


@router.get("/list", response_model=List[DashboardResponse])
def get_dashboard_list(
    date: str,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 목록 조회 API (일반 사용자용 - 하루 단위)"""
    try:
        log_info(f"대시보드 목록 조회 요청: {date}")
        target_date = datetime.strptime(date, "%Y-%m-%d")
        result = service.get_dashboard_list_by_date(target_date)
        log_info(f"대시보드 목록 조회 완료: {len(result)}건")
        return result
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


@router.get("/admin/list", response_model=List[DashboardResponse])
def get_admin_dashboard_list(
    start_date: str,
    end_date: str,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 목록 조회 API (관리자용 - 기간 단위)"""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="관리자만 접근할 수 있습니다"
        )

    try:
        log_info(f"관리자 대시보드 목록 조회 요청: {start_date} ~ {end_date}")
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        result = service.get_dashboard_list_by_date_range(start, end)
        log_info(f"관리자 대시보드 목록 조회 완료: {len(result)}건")
        return result
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


@router.get("/{dashboard_id}", response_model=DashboardDetail)
def get_dashboard_detail(
    dashboard_id: int,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 상세 조회 API"""
    try:
        log_info(f"대시보드 상세 조회 요청: {dashboard_id}")
        result = service.get_dashboard_detail(dashboard_id)
        log_info("대시보드 상세 조회 완료")
        return result
    except Exception as e:
        log_error(e, "대시보드 상세 조회 실패")
        raise


@router.post("", response_model=DashboardResponse)
def create_dashboard(
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
        log_info(f"대시보드 생성 완료: {result.dashboard_id}")
        return result
    except Exception as e:
        log_error(e, "대시보드 생성 실패")
        raise


@router.patch("/{dashboard_id}/status", response_model=DashboardDetail)
def update_status(
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
        log_info("상태 업데이트 완료")
        return result
    except Exception as e:
        log_error(e, "상태 업데이트 실패")
        raise


@router.patch("/{dashboard_id}/remark", response_model=DashboardDetail)
def update_remark(
    dashboard_id: int,
    remark_update: RemarkUpdate,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """메모 업데이트 API"""
    try:
        log_info(f"메모 업데이트 요청: {dashboard_id}")
        result = service.update_remark(dashboard_id, remark_update)
        log_info("메모 업데이트 완료")
        return result
    except Exception as e:
        log_error(e, "메모 업데이트 실패")
        raise


@router.post("/assign", response_model=List[DashboardResponse])
def assign_driver(
    assignment: DriverAssignment,
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """배차 정보 업데이트 API"""
    try:
        log_info("배차 처리 요청", {"dashboard_ids": assignment.dashboard_ids})
        result = service.assign_driver(assignment)
        log_info(f"배차 처리 완료: {len(result)}건")
        return result
    except Exception as e:
        log_error(e, "배차 처리 실패")
        raise


@router.delete("", response_model=ApiResponse)
def delete_dashboards(
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

        return ApiResponse(
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


@router.get("/date-range", response_model=ApiResponse)
def get_date_range(
    service: DashboardService = Depends(get_dashboard_service),
    current_user: TokenData = Depends(get_current_user),
):
    """조회 가능한 날짜 범위 조회 API"""
    try:
        oldest_date, latest_date = service.get_date_range()
        return ApiResponse(
            success=True,
            message="날짜 범위 조회 성공",
            data={
                "oldest_date": oldest_date.strftime("%Y-%m-%d"),
                "latest_date": latest_date.strftime("%Y-%m-%d"),
            },
        )
    except Exception as e:
        log_error(e, "날짜 범위 조회 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="날짜 범위 조회 중 오류가 발생했습니다",
        )
