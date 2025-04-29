"""
대시보드(주문) 관련 라우터
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, date
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    Query,
    status,
    Path,
)
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session
import os

# main.py 에서 설정된 전역 templates 객체 임포트 -> 제거
# from main.main import templates -> 제거
from main.core.templating import templates  # 수정된 경로에서 임포트

from main.utils.database import get_db
from main.utils.security import get_current_user, get_admin_user
from main.utils.logger import logger
from main.schema.dashboard_schema import (
    DashboardCreate,
    DashboardUpdate,
    DashboardResponse,
    DashboardListResponse,
    StatusChangeRequest,
    DriverAssignRequest,
    DashboardDeleteRequest,
)
from main.service.dashboard_service import (
    get_dashboard_by_id,
    get_dashboard_list,
    search_dashboard_by_order_no,
    create_dashboard,
    update_dashboard,
    change_status,
    assign_driver,
    delete_dashboard,
    get_lock_status,
)

# 라우터 생성
router = APIRouter()


@router.get("/dashboard")
async def dashboard_page(request: Request):
    """
    대시보드 페이지 렌더링
    """
    try:
        # 세션에서 사용자 정보 확인
        user = request.session.get("user")
        logger.debug(f"대시보드 접근 - 세션 정보: {user}")

        if not user:
            logger.warning("인증되지 않은 사용자의 대시보드 접근 시도")
            return RedirectResponse(
                url="/login?return_to=/dashboard", status_code=status.HTTP_303_SEE_OTHER
            )

        # 세션이 있는 경우 바로 대시보드 페이지 렌더링
        logger.info(f"대시보드 페이지 접근: {user.get('user_id', 'N/A')}")
        return templates.TemplateResponse(
            "dashboard.html",
            {
                "request": request,
                "user": user,
                "debug": True,
            },
        )
    except Exception as e:
        logger.error(f"대시보드 페이지 렌더링 중 오류 발생: {str(e)}")
        return RedirectResponse(
            url="/login?return_to=/dashboard", status_code=status.HTTP_303_SEE_OTHER
        )


@router.get("/orders", response_model=DashboardListResponse)
async def get_orders(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    department: Optional[str] = None,
    warehouse: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    """
    주문 목록 조회 API
    """
    # 주문 목록 조회
    orders, pagination, stats = get_dashboard_list(
        db=db,
        start_date=start_date,
        end_date=end_date,
        status=status,
        department=department,
        warehouse=warehouse,
        page=page,
        page_size=page_size,
    )

    # 응답 데이터 가공
    status_labels = {
        "WAITING": "대기",
        "IN_PROGRESS": "진행",
        "COMPLETE": "완료",
        "ISSUE": "이슈",
        "CANCEL": "취소",
    }
    type_labels = {"DELIVERY": "배송", "RETURN": "회수"}

    orders_data = []
    for order in orders:
        order_dict = {
            "dashboardId": order.dashboard_id,
            "orderNo": order.order_no,
            "type": order.type,
            "status": order.status,
            "department": order.department,
            "warehouse": order.warehouse,
            "sla": order.sla,
            "eta": order.eta,
            "postalCode": order.postal_code,
            "customer": order.customer,
            "region": order.region,
            "driverName": order.driver_name,
            "statusLabel": status_labels.get(order.status, order.status),
            "typeLabel": type_labels.get(order.type, order.type),
        }
        orders_data.append(order_dict)

    # 응답 반환
    return {
        "success": True,
        "message": "주문 목록 조회 성공",
        "data": orders_data,
        "pagination": pagination,
        "stats": stats,
    }


@router.get("/search", response_model=DashboardListResponse)
async def search_order(
    request: Request,
    order_no: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    """
    주문번호로 주문 검색 API
    """
    # 주문 검색
    orders, pagination, stats = search_dashboard_by_order_no(
        db=db, order_no=order_no, page=page, page_size=page_size
    )

    # 응답 데이터 가공
    status_labels = {
        "WAITING": "대기",
        "IN_PROGRESS": "진행",
        "COMPLETE": "완료",
        "ISSUE": "이슈",
        "CANCEL": "취소",
    }
    type_labels = {"DELIVERY": "배송", "RETURN": "회수"}

    orders_data = []
    for order in orders:
        order_dict = {
            "dashboardId": order.dashboard_id,
            "orderNo": order.order_no,
            "type": order.type,
            "status": order.status,
            "department": order.department,
            "warehouse": order.warehouse,
            "sla": order.sla,
            "eta": order.eta,
            "postalCode": order.postal_code,
            "customer": order.customer,
            "region": order.region,
            "driverName": order.driver_name,
            "statusLabel": status_labels.get(order.status, order.status),
            "typeLabel": type_labels.get(order.type, order.type),
        }
        orders_data.append(order_dict)

    # 응답 반환
    return {
        "success": True,
        "message": f"주문번호 '{order_no}' 검색 결과",
        "data": orders_data,
        "pagination": pagination,
        "stats": stats,
    }


@router.get("/orders/{dashboard_id}", response_model=DashboardResponse)
async def get_order_detail(
    request: Request,
    dashboard_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    주문 상세 조회 API
    """
    order = get_dashboard_by_id(db, dashboard_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다."
        )

    # 락 상태 확인
    lock_status = get_lock_status(db, dashboard_id, current_user.get("user_id"))

    # 응답 데이터 가공
    status_labels = {
        "WAITING": "대기",
        "IN_PROGRESS": "진행",
        "COMPLETE": "완료",
        "ISSUE": "이슈",
        "CANCEL": "취소",
    }
    type_labels = {"DELIVERY": "배송", "RETURN": "회수"}

    order_data = {
        "dashboardId": order.dashboard_id,
        "orderNo": order.order_no,
        "type": order.type,
        "status": order.status,
        "department": order.department,
        "warehouse": order.warehouse,
        "sla": order.sla,
        "eta": order.eta,
        "createTime": order.create_time,
        "departTime": order.depart_time,
        "completeTime": order.complete_time,
        "postalCode": order.postal_code,
        "city": getattr(order, "city", "") or "",
        "county": getattr(order, "county", "") or "",
        "district": getattr(order, "district", "") or "",
        "region": getattr(order, "region", "") or "",
        "distance": getattr(order, "distance", None),
        "durationTime": getattr(order, "duration_time", None),
        "address": order.address,
        "customer": order.customer,
        "contact": order.contact,
        "driverName": order.driver_name,
        "driverContact": order.driver_contact,
        "updatedBy": order.update_by,
        "remark": order.remark,
        "updateAt": order.update_at,
        "isLocked": order.is_locked,
        "statusLabel": status_labels.get(order.status, order.status),
        "typeLabel": type_labels.get(order.type, order.type),
        "editable": lock_status.get("editable", False),
    }

    return order_data


@router.post("/orders", status_code=status.HTTP_201_CREATED)
async def create_order(
    request: Request,
    order_data: DashboardCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    주문 생성 API
    """
    try:
        # 주문 생성
        new_order = create_dashboard(
            db=db, data=order_data, user_id=current_user.get("user_id")
        )

        return {
            "success": True,
            "message": "주문이 성공적으로 생성되었습니다.",
            "id": new_order.dashboard_id,
        }
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code, content={"success": False, "message": e.detail}
        )
    except Exception as e:
        logger.error(f"주문 생성 중 오류 발생: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "주문 생성 중 오류가 발생했습니다."},
        )


@router.put("/orders/{dashboard_id}")
async def update_order(
    request: Request,
    dashboard_id: int = Path(..., ge=1),
    order_data: DashboardUpdate = None,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    주문 업데이트 API
    """
    try:
        # 주문 업데이트
        updated_order = update_dashboard(
            db=db,
            dashboard_id=dashboard_id,
            data=order_data,
            user_id=current_user.get("user_id"),
        )

        return {
            "success": True,
            "message": "주문이 성공적으로 업데이트되었습니다.",
            "id": updated_order.dashboard_id,
        }
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code, content={"success": False, "message": e.detail}
        )
    except Exception as e:
        logger.error(f"주문 업데이트 중 오류 발생: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "주문 업데이트 중 오류가 발생했습니다.",
            },
        )


@router.post("/status")
async def change_order_status(
    request: Request,
    status_data: StatusChangeRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    주문 상태 변경 API

    참고: 현재 프론트엔드에서는 일괄 상태 변경 기능이 제거되었으며,
    단일 주문 상태 변경은 주문 상세 모달에서만 처리합니다.
    이 API는 향후 호환성을 위해 유지됩니다.
    """
    try:
        # API 호출 로깅
        logger.info(
            f"일괄 상태 변경 API 호출: {len(status_data.ids)}건, 상태={status_data.status}"
        )

        # 상태 변경
        results = change_status(
            db=db,
            dashboard_ids=status_data.ids,
            new_status=status_data.status,
            user_id=current_user.get("user_id"),
            user_role=current_user.get("user_role"),
        )

        # 성공/실패 건수 계산
        success_count = sum(1 for r in results if r.get("success", False))
        fail_count = len(results) - success_count

        return {
            "success": True,
            "message": f"상태 변경 완료: {success_count}건 성공, {fail_count}건 실패",
            "results": results,
        }
    except Exception as e:
        logger.error(f"상태 변경 중 오류 발생: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "상태 변경 중 오류가 발생했습니다."},
        )


@router.post("/driver")
async def assign_order_driver(
    request: Request,
    driver_data: DriverAssignRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    주문 기사 배정 API

    참고: 현재 프론트엔드에서는 일괄 배차 기능이 제거되었으며,
    단일 주문 기사 배정은 주문 상세 모달에서만 처리합니다.
    이 API는 향후 호환성을 위해 유지됩니다.
    """
    try:
        # API 호출 로깅
        logger.info(
            f"일괄 기사 배정 API 호출: {len(driver_data.ids)}건, 기사={driver_data.driver_name}"
        )

        # 기사 배정
        results = assign_driver(
            db=db,
            dashboard_ids=driver_data.ids,
            driver_name=driver_data.driver_name,
            driver_contact=driver_data.driver_contact,
            user_id=current_user.get("user_id"),
        )

        # 성공/실패 건수 계산
        success_count = sum(1 for r in results if r.get("success", False))
        fail_count = len(results) - success_count

        return {
            "success": True,
            "message": f"기사 배정 완료: {success_count}건 성공, {fail_count}건 실패",
            "results": results,
        }
    except Exception as e:
        logger.error(f"기사 배정 중 오류 발생: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "기사 배정 중 오류가 발생했습니다."},
        )


@router.post("/delete")
async def delete_order(
    request: Request,
    delete_data: DashboardDeleteRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    주문 삭제 API

    참고: 현재 프론트엔드에서는 일괄 삭제 기능이 제거되었으며,
    단일 주문 삭제는 주문 상세 모달에서만 처리합니다.
    이 API는 향후 호환성을 위해 유지됩니다.
    """
    try:
        # API 호출 로깅
        logger.info(f"일괄 삭제 API 호출: {len(delete_data.ids)}건")

        # 관리자 권한 확인
        if current_user.get("user_role") != "ADMIN":
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"success": False, "message": "삭제 권한이 없습니다."},
            )

        # 주문 삭제
        results = delete_dashboard(
            db=db,
            dashboard_ids=delete_data.ids,
            user_id=current_user.get("user_id"),
            user_role=current_user.get("user_role"),
        )

        # 성공/실패 건수 계산
        success_count = sum(1 for r in results if r.get("success", False))
        fail_count = len(results) - success_count

        return {
            "success": True,
            "message": f"주문 삭제 완료: {success_count}건 성공, {fail_count}건 실패",
            "results": results,
        }
    except Exception as e:
        logger.error(f"주문 삭제 중 오류 발생: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "주문 삭제 중 오류가 발생했습니다."},
        )


@router.get("/lock/{dashboard_id}")
async def check_order_lock(
    request: Request,
    dashboard_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    주문 락 상태 확인 API
    """
    try:
        # 락 상태 확인
        lock_status = get_lock_status(db, dashboard_id, current_user.get("user_id"))
        return lock_status
    except Exception as e:
        logger.error(f"락 상태 확인 중 오류 발생: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "락 상태 확인 중 오류가 발생했습니다.",
            },
        )
