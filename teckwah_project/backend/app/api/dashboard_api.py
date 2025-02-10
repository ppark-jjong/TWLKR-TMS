"""대시보드 관련 API 라우터"""
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.dashboard_model import Dashboard
from app.models.user_model import User
from app.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardListResponse,
    DashboardDetailResponse,
    DashboardStatusUpdate,
    DashboardRemarkUpdate,
    DashboardDriverAssign,
    DashboardResponse,
    DashboardDeleteResponse,
)
from app.services.dashboard_service import DashboardService
from app.services.auth_service import get_current_user
from app.utils.logger_util import Logger

router = APIRouter(prefix="/dashboard", tags=["대시보드"])

def get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    """DashboardService 의존성 주입"""
    return DashboardService(db)

@router.get("/", response_model=List[DashboardListResponse])
async def get_dashboard_list(
    date: date = Query(default=date.today(), description="조회할 날짜 (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user)
):
    """날짜별 대시보드 목록 조회"""
    try:
        Logger.info(f"대시보드 목록 조회 요청: date={date}")
        service = get_dashboard_service()
        result = await service.get_list(date)
        Logger.info(f"대시보드 목록 조회 성공: {len(result)}건")
        return result
    except Exception as e:
        Logger.error(f"대시보드 목록 조회 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 목록 조회 중 오류가 발생했습니다."
        )

@router.get("/{dashboard_id}", response_model=DashboardDetailResponse)
async def get_dashboard_detail(
    dashboard_id: int,
    current_user: User = Depends(get_current_user)
):
    """대시보드 상세 정보 조회"""
    try:
        service = get_dashboard_service()
        result = await service.get_detail(dashboard_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="대시보드를 찾을 수 없습니다."
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"대시보드 상세 정보 조회 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 상세 정보 조회 중 오류가 발생했습니다."
        )

@router.post("/", response_model=DashboardResponse)
async def create_dashboard(
    request: DashboardCreate,
    current_user: User = Depends(get_current_user)
):
    """대시보드 생성"""
    try:
        service = get_dashboard_service()
        result = await service.create_dashboard(request, current_user)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        Logger.error(f"대시보드 생성 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 생성 중 오류가 발생했습니다."
        )

@router.put("/{dashboard_id}/status", response_model=DashboardResponse)
async def update_status(
    dashboard_id: int,
    request: DashboardStatusUpdate,
    current_user: User = Depends(get_current_user)
):
    """대시보드 상태 변경"""
    try:
        service = get_dashboard_service()
        result = await service.update_status(dashboard_id, request.status)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        Logger.error(f"상태 업데이트 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="상태 업데이트 중 오류가 발생했습니다."
        )

@router.put("/{dashboard_id}/remark", response_model=DashboardResponse)
async def update_remark(
    dashboard_id: int,
    request: DashboardRemarkUpdate,
    current_user: User = Depends(get_current_user)
):
    """대시보드 메모 업데이트"""
    try:
        service = get_dashboard_service()
        result = await service.update_remark(dashboard_id, request.remark)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        Logger.error(f"메모 업데이트 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="메모 업데이트 중 오류가 발생했습니다."
        )

@router.post("/assign", response_model=DashboardResponse)
async def assign_driver(
    request: DashboardDriverAssign,
    current_user: User = Depends(get_current_user)
):
    """기사 배차"""
    try:
        service = get_dashboard_service()
        result = await service.assign_driver(
            request.dashboard_ids,
            request.driver_id,
            request.driver_remark
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        Logger.error(f"기사 배차 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="기사 배차 중 오류가 발생했습니다."
        )

@router.delete("/", response_model=DashboardDeleteResponse)
async def delete_dashboards(
    dashboard_ids: List[int],
    current_user: User = Depends(get_current_user)
):
    """대시보드 일괄 삭제"""
    try:
        service = get_dashboard_service()
        result = await service.delete_dashboards(dashboard_ids)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        Logger.error(f"대시보드 삭제 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 삭제 중 오류가 발생했습니다."
        )