"""
대시보드(주문) 관련 라우터
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Request,
    Query,
    Path,
    Body,
)
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime

from backend.utils.database import get_db
from backend.services.dashboard_service import DashboardService
from backend.schemas.dashboard_schema import (
    DashboardCreate,
    DashboardUpdate,
    DashboardResponse,
    DashboardList,
    DashboardFilter,
    OrderStatusUpdate,
    MultipleDashboardIds,
    MultipleStatusUpdate,
    DriverAssign,
    DriverAssignMultiple,
    LockResponse,
)
from backend.schemas.common_schema import (
    SuccessResponse,
    ErrorResponse,
    PaginationParams,
)
from backend.utils.security import get_current_user, get_admin_user
from backend.utils.logger import logger

router = APIRouter()


@router.get("/{dashboard_id}", response_model=SuccessResponse)
async def get_order(
    dashboard_id: int = Path(...),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """
    주문 상세 정보 조회
    - dashboard_id: 주문 ID
    """
    try:
        # 인증된 사용자 정보 가져오기
        user_data = get_current_user(request)
        user_id = user_data.get("user_id")

        # 주문 조회
        order = DashboardService.get_order(db, dashboard_id, user_id)

        if not order:
            return ErrorResponse(
                success=False, message="주문을 찾을 수 없습니다"
            ).model_dump()

        # 응답 데이터
        return SuccessResponse(
            success=True, message="주문 조회 성공", data=order
        ).model_dump()

    except HTTPException as e:
        return ErrorResponse(success=False, message=e.detail).model_dump()
    except Exception as e:
        logger.error(f"주문 조회 중 오류: {str(e)}")
        return ErrorResponse(
            success=False, message="주문 조회 중 오류가 발생했습니다"
        ).model_dump()


@router.get("/list", response_model=DashboardList)
async def get_orders(
    request: Request = None,
    start_date: Optional[datetime] = Query(None, alias="startDate"),
    end_date: Optional[datetime] = Query(None, alias="endDate"),
    status: Optional[str] = None,
    department: Optional[str] = None,
    warehouse: Optional[str] = None,
    order_no: Optional[str] = Query(None, alias="orderNo"),
    page: Optional[int] = Query(1, ge=1),
    limit: Optional[int] = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    주문 목록 조회
    - page: 페이지 번호 (기본값: 1)
    - limit: 페이지당 항목 수 (기본값: 10)
    - start_date, end_date: ETA 기준 날짜 범위
    - status, department, warehouse: 필터링 조건
    - order_no: 주문 번호 검색
    """
    try:
        # 인증된 사용자 정보 가져오기
        user_data = get_current_user(request)

        # 페이지네이션 계산
        skip = (page - 1) * limit

        # 주문 목록 조회
        orders, total, status_counts = DashboardService.get_orders(
            db,
            skip=skip,
            limit=limit,
            start_date=start_date,
            end_date=end_date,
            status=status,
            department=department,
            warehouse=warehouse,
            order_no=order_no,
        )

        # 응답 데이터
        return {
            "success": True,
            "message": "주문 목록 조회 성공",
            "data": {
                "items": orders,
                "total": total,
                "page": page,
                "limit": limit,
                "statusCounts": status_counts,
                "filter": {
                    "startDate": start_date,
                    "endDate": end_date,
                    "status": status,
                    "department": department,
                    "warehouse": warehouse,
                    "orderNo": order_no,
                },
            },
        }

    except HTTPException as e:
        return {"success": False, "message": e.detail}
    except Exception as e:
        logger.error(f"주문 목록 조회 중 오류: {str(e)}")
        return {"success": False, "message": "주문 목록 조회 중 오류가 발생했습니다"}


@router.post("", response_model=SuccessResponse)
async def create_order(
    order_data: DashboardCreate, request: Request = None, db: Session = Depends(get_db)
):
    """
    새 주문 생성
    """
    try:
        # 인증된 사용자 정보 가져오기
        user_data = get_current_user(request)
        user_id = user_data.get("user_id")

        # 주문 생성
        new_order = DashboardService.create_order(db, order_data, user_id)

        # 응답 데이터
        return SuccessResponse(
            success=True,
            message="주문 생성 성공",
            data=DashboardResponse.model_validate(new_order).model_dump(),
        ).model_dump()

    except HTTPException as e:
        return ErrorResponse(success=False, message=e.detail).model_dump()
    except Exception as e:
        logger.error(f"주문 생성 중 오류: {str(e)}")
        return ErrorResponse(
            success=False, message=f"주문 생성 중 오류가 발생했습니다: {str(e)}"
        ).model_dump()


@router.put("/{dashboard_id}", response_model=SuccessResponse)
async def update_order(
    order_data: DashboardUpdate,
    dashboard_id: int = Path(...),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """
    주문 정보 수정
    - dashboard_id: 주문 ID
    """
    try:
        # 인증된 사용자 정보 가져오기
        user_data = get_current_user(request)
        user_id = user_data.get("user_id")

        # 주문 수정
        updated_order = DashboardService.update_order(
            db, dashboard_id, order_data, user_id
        )

        if not updated_order:
            return ErrorResponse(
                success=False, message="주문을 찾을 수 없습니다"
            ).model_dump()

        # 응답 데이터
        return SuccessResponse(
            success=True,
            message="주문 정보 수정 성공",
            data=DashboardResponse.model_validate(updated_order).model_dump(),
        ).model_dump()

    except ValueError as e:
        return ErrorResponse(success=False, message=str(e)).model_dump()
    except HTTPException as e:
        return ErrorResponse(success=False, message=e.detail).model_dump()
    except Exception as e:
        logger.error(f"주문 수정 중 오류: {str(e)}")
        return ErrorResponse(
            success=False, message="주문 수정 중 오류가 발생했습니다"
        ).model_dump()


# 개별 주문 삭제 API 제거 (일괄 삭제 API로 통합)


@router.post("/delete-multiple", response_model=SuccessResponse)
async def delete_multiple_orders(
    order_ids: MultipleDashboardIds,
    request: Request = None,
    db: Session = Depends(get_db),
):
    """
    주문 삭제 (관리자 전용)
    - order_ids: 삭제할 주문 ID 목록 (단일 ID도 배열로 전달)
    """
    try:
        # 관리자 권한 확인
        user_data = get_admin_user(get_current_user(request))
        user_id = user_data.get("user_id")

        # 주문 일괄 삭제
        success_count, failed_count = DashboardService.delete_multiple_orders(
            db, order_ids.order_ids, user_id
        )

        # 응답 데이터
        return SuccessResponse(
            success=True,
            message=f"주문 삭제 완료: 성공 {success_count}건, 실패 {failed_count}건",
            data={"successCount": success_count, "failedCount": failed_count},
        ).model_dump()

    except HTTPException as e:
        return ErrorResponse(success=False, message=e.detail).model_dump()
    except Exception as e:
        logger.error(f"주문 삭제 중 오류: {str(e)}")
        return ErrorResponse(
            success=False, message="주문 삭제 중 오류가 발생했습니다"
        ).model_dump()


# 개별 주문 상태 변경 API 제거 (일괄 상태 변경 API로 통합)


@router.post("/status-multiple", response_model=SuccessResponse)
async def update_multiple_order_status(
    status_data: MultipleStatusUpdate,
    request: Request = None,
    db: Session = Depends(get_db),
):
    """
    주문 상태 변경
    - order_ids: 변경할 주문 ID 목록 (단일 ID도 배열로 전달)
    - status: 변경할 상태
    """
    try:
        # 인증된 사용자 정보 가져오기
        user_data = get_current_user(request)
        user_id = user_data.get("user_id")
        user_role = user_data.get("user_role")

        # 일반 사용자의 상태 역행 방지 (관리자는 모든 상태 변경 가능)
        if user_role != "ADMIN" and len(status_data.order_ids) > 0:
            # 샘플링을 위해 첫 번째 주문만 체크
            sample_id = status_data.order_ids[0]
            current_order = DashboardService.get_order(db, sample_id, user_id)
            
            if current_order:
                current_status = current_order.get("status")
                new_status = status_data.status

                # 상태 역행 체크
                if (
                    current_status in ["COMPLETE", "ISSUE", "CANCEL"]
                    and new_status in ["WAITING", "IN_PROGRESS"]
                ) or (current_status == "IN_PROGRESS" and new_status == "WAITING"):
                    return ErrorResponse(
                        success=False,
                        message=f"{current_status} 상태에서 {new_status} 상태로 변경할 수 없습니다",
                    ).model_dump()

        # 주문 상태 일괄 변경
        success_count, failed_count = DashboardService.update_multiple_order_status(
            db, status_data.order_ids, status_data.status, user_id
        )

        # 응답 데이터
        return SuccessResponse(
            success=True,
            message=f"주문 상태 변경 완료: 성공 {success_count}건, 실패 {failed_count}건",
            data={"successCount": success_count, "failedCount": failed_count},
        ).model_dump()

    except HTTPException as e:
        return ErrorResponse(success=False, message=e.detail).model_dump()
    except Exception as e:
        logger.error(f"주문 상태 변경 중 오류: {str(e)}")
        return ErrorResponse(
            success=False, message="주문 상태 변경 중 오류가 발생했습니다"
        ).model_dump()


@router.post("/assign-driver", response_model=SuccessResponse)
async def assign_driver_to_orders(
    driver_data: DriverAssignMultiple,
    request: Request = None,
    db: Session = Depends(get_db),
):
    """
    주문에 기사 일괄 배정
    - order_ids: 배정할 주문 ID 목록
    - driver_name: 기사 이름
    - driver_contact: 기사 연락처
    """
    try:
        # 인증된 사용자 정보 가져오기
        user_data = get_current_user(request)
        user_id = user_data.get("user_id")

        # 기사 일괄 배정
        success_count, failed_count = DashboardService.assign_driver_to_multiple_orders(
            db,
            driver_data.order_ids,
            driver_data.driver_name,
            driver_data.driver_contact,
            user_id,
        )

        # 응답 데이터
        return SuccessResponse(
            success=True,
            message=f"기사 배정 완료: 성공 {success_count}건, 실패 {failed_count}건",
            data={"successCount": success_count, "failedCount": failed_count},
        ).model_dump()

    except HTTPException as e:
        return ErrorResponse(success=False, message=e.detail).model_dump()
    except Exception as e:
        logger.error(f"기사 일괄 배정 중 오류: {str(e)}")
        return ErrorResponse(
            success=False, message="기사 일괄 배정 중 오류가 발생했습니다"
        ).model_dump()


@router.post("/{dashboard_id}/lock", response_model=LockResponse)
async def lock_order(
    dashboard_id: int = Path(...),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """
    주문 락 획득
    - dashboard_id: 주문 ID
    """
    try:
        # 인증된 사용자 정보 가져오기
        user_data = get_current_user(request)
        user_id = user_data.get("user_id")

        # 주문 락 획득
        lock_result = DashboardService.lock_order(db, dashboard_id, user_id)

        # 응답 데이터
        return lock_result

    except HTTPException as e:
        return {"success": False, "message": e.detail}
    except Exception as e:
        logger.error(f"주문 락 획득 중 오류: {str(e)}")
        return {"success": False, "message": "주문 락 획득 중 오류가 발생했습니다"}


@router.post("/{dashboard_id}/unlock", response_model=SuccessResponse)
async def unlock_order(
    dashboard_id: int = Path(...),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """
    주문 락 해제
    - dashboard_id: 주문 ID
    """
    try:
        # 인증된 사용자 정보 가져오기
        user_data = get_current_user(request)
        user_id = user_data.get("user_id")

        # 주문 락 해제
        unlock_result = DashboardService.unlock_order(db, dashboard_id, user_id)

        # 응답 데이터
        return SuccessResponse(
            success=unlock_result.get("success", False),
            message=unlock_result.get("message", "락 해제 결과"),
        ).model_dump()

    except HTTPException as e:
        return ErrorResponse(success=False, message=e.detail).model_dump()
    except Exception as e:
        logger.error(f"주문 락 해제 중 오류: {str(e)}")
        return ErrorResponse(
            success=False, message="주문 락 해제 중 오류가 발생했습니다"
        ).model_dump()
