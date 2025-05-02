"""
대시보드(주문) 관련 라우터 - 리팩토링 버전
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, date
from decimal import Decimal
import json
import logging
import sys
import traceback
from urllib.parse import quote

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Query,
    Path,
    status,
    Form,
)
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from main.core.templating import templates
from main.utils.database import get_db, db_transaction
from main.utils.security import get_current_user, get_admin_user
from main.models.dashboard_model import Dashboard
from main.schema.dashboard_schema import (
    DashboardCreate,
    DashboardUpdate,
    DashboardResponse,
    DashboardListResponse,
    DashboardDeleteRequest,
    LockStatusResponse,
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
    get_dashboard_list_paginated,
    get_dashboard_response_data,
    get_dashboard_list_item_data,
)
from main.utils.json_util import CustomJSONEncoder

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        # 파일 핸들러는 필요시 활성화
        # logging.FileHandler("dashboard_route.log"),
    ],
)
logger = logging.getLogger(__name__)

# 라우터 생성
api_router = APIRouter(prefix="/api", dependencies=[Depends(get_current_user)])
page_router = APIRouter(dependencies=[Depends(get_current_user)])


# === 페이지 렌더링 라우트 ===
@page_router.get("/dashboard", include_in_schema=False, name="dashboard_page")
async def get_dashboard_page(
    request: Request,
    db: Session = Depends(get_db),
    start_date: Optional[date] = Query(None, description="초기 조회 시작일"),
    end_date: Optional[date] = Query(None, description="초기 조회 종료일"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    logger.info(f"대시보드 페이지 요청: user={current_user.get('user_id')}")
    try:
        today = datetime.now().date()
        initial_start_date = start_date or today
        initial_end_date = end_date or today
        error_message = request.query_params.get("error")
        success_message = request.query_params.get("success")

        if initial_start_date > initial_end_date:
            logger.warning("잘못된 날짜 범위, 오늘 날짜로 조정")
            initial_start_date = today
            initial_end_date = today
            error_message = "잘못된 날짜 범위가 지정되어 오늘 날짜로 조회합니다."

        initial_page = 1
        initial_page_size = 30

        orders_raw, pagination_info = get_dashboard_list_paginated(
            db=db,
            start_date=initial_start_date,
            end_date=initial_end_date,
            page=initial_page,
            page_size=initial_page_size,
        )

        # 템플릿 전달용 데이터 변환
        orders_for_template = [
            get_dashboard_list_item_data(order) for order in orders_raw
        ]

        # 페이지네이션 정보 (클라이언트 형식 통일)
        pagination_data = {
            "total_items": pagination_info.get("total", 0),
            "total_pages": pagination_info.get("total_pages", 0),
            "current_page": pagination_info.get("current", 1),
            "page_size": pagination_info.get("page_size", initial_page_size),
        }

        user_data = {
            "user_id": current_user.get("user_id"),
            "user_role": current_user.get("user_role"),
            "department": current_user.get("department"),
        }

        # 초기 데이터 (JSON 전달용)
        safe_data = {}
        safe_data["orders"] = []

        # orders 항목을 안전하게 처리
        for order in orders_for_template:
            safe_order = {}
            for key, value in order.items():
                # datetime 객체는 문자열로 변환
                if isinstance(value, (datetime, date)):
                    safe_order[key] = value.isoformat() if value else None
                else:
                    safe_order[key] = value
            safe_data["orders"].append(safe_order)

        # 나머지 데이터 처리
        safe_data["pagination"] = pagination_data
        safe_data["start_date"] = initial_start_date.isoformat()
        safe_data["end_date"] = initial_end_date.isoformat()
        safe_data["error_message"] = error_message
        safe_data["success_message"] = success_message
        safe_data["current_user"] = user_data

        # 더 이상 JSON.dumps를 사용하지 않고 직접 딕셔너리를 전달
        # initial_data_json = json.dumps(safe_data)
        # logger.debug("JSON 직렬화 성공")

        context = {
            "request": request,
            # "initial_data_json": initial_data_json,
            "initial_data": safe_data,  # 딕셔너리를 직접 전달
            "initial_data_object": safe_data,
            "current_user": user_data,
            # 필요시 서버사이드에서 직접 사용할 데이터 추가
            "orders": orders_for_template,
            "pagination": pagination_data,
            "start_date": initial_start_date,
            "end_date": initial_end_date,
            "error_message": error_message,
            "success_message": success_message,
        }

        return templates.TemplateResponse("dashboard.html", context)

    except HTTPException as http_exc:
        logger.error(
            f"대시보드 페이지 로드 중 HTTP 오류: {http_exc.detail}", exc_info=True
        )
        context = {
            "request": request,
            "error_message": http_exc.detail,
            "current_user": current_user,
        }
        return templates.TemplateResponse(
            "error.html", context, status_code=http_exc.status_code
        )
    except Exception as e:
        logger.error(f"대시보드 페이지 렌더링 중 예외 발생: {e}", exc_info=True)
        context = {
            "request": request,
            "error_message": "페이지 로드 중 오류 발생",
            "current_user": current_user,
        }
        return templates.TemplateResponse("error.html", context, status_code=500)


# === API 엔드포인트 라우트 ===
@api_router.get("/dashboard/list", response_model=DashboardListResponse)
async def get_dashboard_list_api(
    db: Session = Depends(get_db),
    start_date: Optional[date] = Query(None, description="조회 시작일"),
    end_date: Optional[date] = Query(None, description="조회 종료일"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    logger.info(f"대시보드 목록 API 호출: user={current_user.get('user_id')}")
    try:
        today = datetime.now().date()
        final_start_date = start_date or today
        final_end_date = end_date or today

        if final_start_date > final_end_date:
            return DashboardListResponse(
                success=False, message="잘못된 날짜 범위입니다.", data=[]
            )

        orders_raw = get_dashboard_list(
            db=db, start_date=final_start_date, end_date=final_end_date
        )
        orders_data = [get_dashboard_list_item_data(order) for order in orders_raw]

        return DashboardListResponse(
            success=True, message="주문 목록 조회 성공", data=orders_data
        )

    except HTTPException as http_exc:
        # 서비스 레벨에서 발생한 HTTPException 처리
        logger.warning(f"목록 조회 API 오류 (HTTPException): {http_exc.detail}")
        raise http_exc
    except Exception as e:
        logger.error(f"목록 조회 API 오류: {e}", exc_info=True)
        # Pydantic 검증 실패 포함 가능
        error_detail = str(e)
        if "ValidationError" in error_detail:
            error_detail = "데이터 형식 검증에 실패했습니다."  # 사용자 친화적 메시지

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"목록 조회 중 오류 발생: {error_detail}",
        )


@api_router.get("/dashboard/search")
async def search_order_api(
    order_no: str = Query(..., description="검색할 주문번호"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    logger.info(
        f"주문번호 검색 API 호출: order_no='{order_no}', user={current_user.get('user_id')}"
    )
    order_no_trimmed = order_no.strip()
    if not order_no_trimmed:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"success": False, "message": "검색할 주문번호를 입력해주세요."},
        )

    try:
        order = search_dashboard_by_order_no(db=db, order_no=order_no_trimmed)
        order_data = get_dashboard_response_data(order, False) if order else None
        message = (
            f"'{order_no_trimmed}' 검색 결과"
            if order
            else f"'{order_no_trimmed}'에 해당하는 주문 없음"
        )
        return {"success": True, "message": message, "data": {"order": order_data}}

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"주문번호 검색 중 오류: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="주문 검색 중 오류가 발생했습니다.",
        )


@api_router.get("/orders/lock/{dashboard_id}", response_model=LockStatusResponse)
async def check_order_lock_api(
    dashboard_id: int = Path(..., ge=1, description="락 상태 확인할 주문 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    logger.info(
        f"주문 락 상태 확인 API 요청: id={dashboard_id}, user={current_user.get('user_id')}"
    )
    try:
        return get_lock_status(
            db=db, dashboard_id=dashboard_id, user_id=current_user.get("user_id")
        )
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"주문 락 상태 확인 API 오류: {e}", exc_info=True)
        # 스키마 기본값으로 실패 응답 생성 시도
        return LockStatusResponse(
            success=False, editable=False, message="락 상태 확인 중 서버 오류 발생"
        )


# --- 주문 생성 페이지 --- (라우터는 페이지 렌더링에 집중)
@page_router.get("/orders/new", name="order_create_page")
async def order_create_page(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    logger.info(f"주문 생성 페이지 로드 요청: user={current_user.get('user_id')}")
    try:
        user_data = {
            "user_id": current_user.get("user_id"),
            "user_role": current_user.get("user_role"),
            "department": current_user.get("department"),
        }
        # 초기 데이터는 최소화, 필요시 JS에서 API 호출
        initial_data = {
            "is_edit": False,
            "order": None,
            "current_user": user_data,
        }
        context = {
            "request": request,
            "current_user": user_data,
            "initial_data": initial_data,  # initial_data_json 대신 직접 딕셔너리 전달
            "is_edit": False,
            "order": None,
        }
        return templates.TemplateResponse("order_form.html", context)
    except Exception as e:
        logger.error(f"주문 생성 페이지 로드 오류: {e}", exc_info=True)
        # 오류 발생 시 대시보드로 리다이렉트
        error_message = quote("페이지 로드 중 오류 발생")
        return RedirectResponse(
            url=f"/dashboard?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )


# --- 주문 상세 페이지 --- (라우터는 페이지 렌더링에 집중)
@page_router.get("/orders/{dashboard_id}", name="order_detail_page")
async def order_detail_page(
    request: Request,
    dashboard_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    logger.info(
        f"주문 상세 페이지 로드 요청: id={dashboard_id}, user={current_user.get('user_id')}"
    )
    try:
        order = get_dashboard_by_id(db, dashboard_id)
        if not order:
            raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다.")

        lock_status = get_lock_status(db, dashboard_id, current_user.get("user_id"))
        is_editable = lock_status.get("editable", False)
        order_data = get_dashboard_response_data(order, is_editable)

        user_data = {
            "user_id": current_user.get("user_id"),
            "user_role": current_user.get("user_role"),
            "department": current_user.get("department"),
        }

        # 필요한 데이터만 컨텍스트에 전달
        page_data = {
            "order": order_data,
            "lock_status": lock_status,
            "current_user": user_data,
        }
        context = {
            "request": request,
            "current_user": user_data,
            "order": order_data,  # 서비스에서 변환된 Dict 전달
            "lock_status": lock_status,
            "page_data": page_data,  # JSON 문자열 대신 직접 딕셔너리 전달
        }
        return templates.TemplateResponse("order_page.html", context)

    except HTTPException as http_exc:
        # 404 등 예상된 오류 처리
        logger.warning(
            f"주문 상세 로드 중 오류: {http_exc.status_code}, {http_exc.detail}"
        )
        error_message = quote(http_exc.detail)
        return RedirectResponse(
            url=f"/dashboard?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )
    except Exception as e:
        logger.error(f"주문 상세 페이지 로드 중 예외 발생: {e}", exc_info=True)
        error_message = quote("주문 정보를 불러오는 중 오류가 발생했습니다")
        return RedirectResponse(
            url=f"/dashboard?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )


# --- 주문 수정 페이지 --- (라우터는 페이지 렌더링 및 락 확인에 집중)
@page_router.get("/orders/{dashboard_id}/edit", name="order_edit_page")
async def order_edit_page(
    request: Request,
    dashboard_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("user_id")
    logger.info(f"주문 수정 페이지 로드 요청: id={dashboard_id}, user={user_id}")

    try:
        order = get_dashboard_by_id(db, dashboard_id)
        if not order:
            raise HTTPException(
                status_code=404, detail="수정할 주문을 찾을 수 없습니다."
            )

        lock_info = get_lock_status(db, dashboard_id, user_id)
        if not lock_info.get("editable", False):
            locked_by = lock_info.get("locked_by", "다른 사용자")
            error_message = f"{locked_by}님이 현재 수정 중입니다."
            logger.warning(
                f"락으로 수정 페이지 접근 불가: id={dashboard_id}, locked_by={locked_by}"
            )
            detail_url = request.url_for("order_detail_page", dashboard_id=dashboard_id)
            return RedirectResponse(
                f"{detail_url}?error={quote(error_message)}",
                status_code=status.HTTP_303_SEE_OTHER,
            )

        # 락이 있거나 내가 소유 -> 수정 페이지 렌더링
        order_data = get_dashboard_response_data(order, True)
        user_data = {
            "user_id": user_id,
            "user_role": current_user.get("user_role"),
            "department": current_user.get("department"),
        }

        initial_data_obj = {
            "is_edit": True,
            "order": order_data,
            "current_user": user_data,
        }
        context = {
            "request": request,
            "current_user": user_data,
            "initial_data": initial_data_obj,  # JSON 문자열 대신 직접 딕셔너리 전달
            "is_edit": True,
            "order": order_data,
        }
        return templates.TemplateResponse("order_form.html", context)

    except HTTPException as http_exc:
        # 404 등 예상된 오류 처리
        logger.warning(
            f"주문 수정 페이지 로드 중 오류: {http_exc.status_code}, {http_exc.detail}"
        )
        error_message = quote(http_exc.detail)
        return RedirectResponse(
            url=f"/dashboard?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )
    except Exception as e:
        logger.error(f"주문 수정 페이지 로드 중 예외 발생: {e}", exc_info=True)
        error_message = quote("수정 페이지 로드 중 오류 발생")
        return RedirectResponse(
            url=f"/dashboard?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )


# --- 주문 생성 처리 API --- (Form 데이터 처리 및 서비스 호출)
@api_router.post("/orders", status_code=status.HTTP_302_FOUND)
@db_transaction  # 트랜잭션 관리 데코레이터 사용
async def create_order_action(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    # Form 필드명 snake_case 사용 (HTML name 속성도 맞춰야 함)
    order_no: str = Form(...),
    type: str = Form(...),
    department: str = Form(...),
    warehouse: str = Form(...),
    sla: str = Form(...),
    eta_str: str = Form(..., alias="eta"),  # 날짜 문자열 받기
    postal_code: str = Form(...),
    address: str = Form(...),
    customer: str = Form(...),
    contact: Optional[str] = Form(None),
    remark: Optional[str] = Form(None),
):
    user_id = current_user.get("user_id")
    logger.info(f"주문 생성 API 요청: user={user_id}, order_no={order_no}")

    try:
        # ETA 파싱
        try:
            eta_dt = datetime.fromisoformat(eta_str.replace(" ", "T"))
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="ETA 형식이 잘못되었습니다 (YYYY-MM-DD HH:MM 또는 YYYY-MM-DDTHH:MM)",
            )

        # Pydantic 스키마로 데이터 유효성 검사 및 변환
        dashboard_data = DashboardCreate(
            order_no=order_no,
            type=type,
            department=department,
            warehouse=warehouse,
            sla=sla,
            eta=eta_dt,
            postal_code=postal_code,
            address=address,
            customer=customer,
            contact=contact,
            remark=remark,
        )

        # 서비스 호출
        new_dashboard = create_dashboard(db=db, data=dashboard_data, user_id=user_id)
        success_message = quote("주문이 성공적으로 생성되었습니다.")
        detail_url = request.url_for(
            "order_detail_page", dashboard_id=new_dashboard.dashboard_id
        )
        return RedirectResponse(
            f"{detail_url}?success={success_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    except HTTPException as http_exc:
        # 유효성 검사 실패 또는 서비스 내부 오류
        logger.warning(f"주문 생성 실패 (HTTPException): {http_exc.detail}")
        error_message = quote(http_exc.detail)
        # 생성 실패 시 생성 페이지로 리다이렉트
        create_url = request.url_for("order_create_page")
        # 입력값 유지를 위해 쿼리 파라미터로 전달 고려 (복잡성 증가)
        return RedirectResponse(
            f"{create_url}?error={error_message}", status_code=status.HTTP_303_SEE_OTHER
        )
    except Exception as e:
        logger.error(f"주문 생성 API 처리 중 예외 발생: {e}", exc_info=True)
        error_message = quote("주문 생성 중 서버 오류가 발생했습니다.")
        create_url = request.url_for("order_create_page")
        return RedirectResponse(
            f"{create_url}?error={error_message}", status_code=status.HTTP_303_SEE_OTHER
        )


# --- 주문 수정 처리 API --- (Form 데이터 처리 및 서비스 호출)
@api_router.post("/orders/{dashboard_id}", status_code=status.HTTP_302_FOUND)
@db_transaction
async def update_order_action(
    request: Request,
    dashboard_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    # Form 필드명 snake_case (status는 status_val로 받음)
    type: str = Form(...),
    department: str = Form(...),
    warehouse: str = Form(...),
    sla: str = Form(...),
    eta_str: str = Form(..., alias="eta"),
    postal_code: str = Form(...),
    address: str = Form(...),
    customer: str = Form(...),
    contact: Optional[str] = Form(None),
    remark: Optional[str] = Form(None),
    status_val: Optional[str] = Form(None, alias="status"),
    driver_name: Optional[str] = Form(None),
    driver_contact: Optional[str] = Form(None),
):
    user_id = current_user.get("user_id")
    logger.info(f"주문 수정 API 요청: id={dashboard_id}, user={user_id}")

    detail_url = request.url_for("order_detail_page", dashboard_id=dashboard_id)
    edit_url = request.url_for("order_edit_page", dashboard_id=dashboard_id)

    try:
        # ETA 파싱
        try:
            eta_dt = datetime.fromisoformat(eta_str.replace(" ", "T"))
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="ETA 형식이 잘못되었습니다 (YYYY-MM-DD HH:MM 또는 YYYY-MM-DDTHH:MM)",
            )

        update_data = DashboardUpdate(
            type=type,
            department=department,
            warehouse=warehouse,
            sla=sla,
            eta=eta_dt,
            postal_code=postal_code,
            address=address,
            customer=customer,
            contact=contact,
            remark=remark,
            status=status_val,
            driver_name=driver_name,
            driver_contact=driver_contact,
        )

        updated_dashboard = update_dashboard(
            db=db, dashboard_id=dashboard_id, data=update_data, user_id=user_id
        )
        success_message = quote("주문 정보가 성공적으로 수정되었습니다.")
        return RedirectResponse(
            f"{detail_url}?success={success_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    except HTTPException as http_exc:
        logger.warning(
            f"주문 수정 실패 (HTTPException): id={dashboard_id}, {http_exc.detail}"
        )
        error_message = quote(http_exc.detail)
        # 수정 실패 시 수정 페이지로 리다이렉트
        return RedirectResponse(
            f"{edit_url}?error={error_message}", status_code=status.HTTP_303_SEE_OTHER
        )
    except Exception as e:
        logger.error(f"주문 수정 API 처리 중 예외 발생: {e}", exc_info=True)
        error_message = quote("주문 수정 중 서버 오류가 발생했습니다.")
        return RedirectResponse(
            f"{edit_url}?error={error_message}", status_code=status.HTTP_303_SEE_OTHER
        )


# --- 주문 삭제 처리 API --- (서비스 호출 및 리다이렉트)
@api_router.post("/orders/{dashboard_id}/delete", status_code=status.HTTP_302_FOUND)
@db_transaction
async def delete_order_action(
    request: Request,
    dashboard_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),  # ADMIN 전용
):
    user_id = current_user.get("user_id")
    user_role = current_user.get("user_role")
    logger.info(f"주문 삭제 API 요청: id={dashboard_id}, user={user_id}")

    detail_url = request.url_for("order_detail_page", dashboard_id=dashboard_id)
    dashboard_url = request.url_for("dashboard_page")

    try:
        result_list = delete_dashboard(
            db=db, dashboard_ids=[dashboard_id], user_id=user_id, user_role=user_role
        )

        if result_list and result_list[0].get("success"):
            success_message = quote("주문이 성공적으로 삭제되었습니다.")
            return RedirectResponse(
                f"{dashboard_url}?success={success_message}",
                status_code=status.HTTP_303_SEE_OTHER,
            )
        else:
            error_message = (
                result_list[0].get("message", "삭제 실패")
                if result_list
                else "삭제 실패"
            )
            raise HTTPException(status_code=400, detail=error_message)

    except HTTPException as http_exc:
        logger.warning(
            f"주문 삭제 실패 (HTTPException): id={dashboard_id}, {http_exc.detail}"
        )
        error_message = quote(http_exc.detail)
        # 실패 시 상세 페이지로 리다이렉트
        return RedirectResponse(
            f"{detail_url}?error={error_message}", status_code=status.HTTP_303_SEE_OTHER
        )
    except Exception as e:
        logger.error(f"주문 삭제 API 처리 중 예외 발생: {e}", exc_info=True)
        error_message = quote("주문 삭제 중 오류가 발생했습니다")
        return RedirectResponse(
            f"{detail_url}?error={error_message}", status_code=status.HTTP_303_SEE_OTHER
        )
