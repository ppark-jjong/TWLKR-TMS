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
from main.utils.lock import acquire_lock, release_lock, check_lock_status

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
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    logger.info(f"대시보드 페이지 요청: user={current_user.get('user_id')}")
    try:
        error_message = request.query_params.get("error")
        success_message = request.query_params.get("success")

        user_data = {
            "user_id": current_user.get("user_id"),
            "user_role": current_user.get("user_role"),
            "department": current_user.get("department"),
        }

        context = {
            "request": request,
            "current_user": user_data,
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
        # 설명서에 따라 Form(PRG) 방식 적용 - 템플릿에 직접 객체 전달
        context = {
            "request": request,
            "current_user": current_user,
            "is_edit": False,
            "order": None,
            "error_message": request.query_params.get("error"),
            "success_message": request.query_params.get("success"),
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

        # 락 상태 확인 (check_lock_status 사용)
        lock_status = check_lock_status(
            db, "dashboard", dashboard_id, current_user.get("user_id")
        )
        # is_editable은 get_dashboard_response_data 내부에서 처리하도록 변경 고려?
        # 일단 여기서는 editable 정보를 사용하지 않음.
        order_data = get_dashboard_response_data(
            order
        )  # editable 파라미터 제거 또는 수정

        # 추가 디버깅 로그: order_data의 내용 확인
        logger.info(f"주문 상세 데이터 키: {list(order_data.keys())}")
        logger.info(
            f"주문 상세 데이터 샘플: dashboard_id={order_data.get('dashboard_id')}, order_no={order_data.get('order_no')}"
        )

        # 설명서에 따라 Form(PRG) 방식 적용 - 템플릿에 직접 객체 전달
        context = {
            "request": request,
            "current_user": current_user,
            "order": order_data,  # snake_case 키를 가진 데이터
            "lock_status": lock_status,
            "error_message": request.query_params.get("error"),
            "success_message": request.query_params.get("success"),
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


# --- 주문 수정 페이지 --- (락 보유 확인 후 페이지 렌더링)
@page_router.get("/orders/{dashboard_id}/edit", name="order_edit_page")
@db_transaction  # 락 획득/해제 위해 트랜잭션 필요
async def order_edit_page(
    request: Request,
    dashboard_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """주문 수정 페이지 로드, 락 획득 후 렌더링"""
    user_id = current_user.get("user_id")
    logger.info(f"주문 수정 페이지 요청: id={dashboard_id}, user={user_id}")

    # 상세 페이지 URL (리다이렉트용)
    detail_url = request.url_for("order_detail_page", dashboard_id=dashboard_id)
    lock_held = False  # 락 해제를 위한 플래그

    try:
        # 주문 정보 로드 (락 전에 수행)
        dashboard = get_dashboard_by_id(db, dashboard_id)
        if not dashboard:
            error_message = quote("수정할 주문을 찾을 수 없습니다.")
            return RedirectResponse(
                f"/dashboard?error={error_message}",
                status_code=status.HTTP_303_SEE_OTHER,
            )

        # 락 획득 시도 (페이지 로드 전에 수행)
        lock_acquired, lock_info = acquire_lock(db, "dashboard", dashboard_id, user_id)
        if not lock_acquired:
            # 락 획득 실패 시 상세 페이지로 리다이렉트
            error_message = quote(
                lock_info.get("message", "현재 다른 사용자가 수정 중입니다")
            )
            return RedirectResponse(
                f"{detail_url}?error={error_message}",
                status_code=status.HTTP_303_SEE_OTHER,
            )
        lock_held = True  # 락 획득 성공

        # 락 획득 성공 시 수정 페이지 렌더링
        logger.info(f"주문 수정 페이지 락 획득 성공: id={dashboard_id}, user={user_id}")

        # 주문 데이터 가져오기 (락 획득 후)
        # dashboard = get_dashboard_by_id(db, dashboard_id) # 이미 위에서 로드함
        dashboard_dict = dashboard_to_dict(
            dashboard
        )  # dashboard_to_dict 헬퍼 함수가 있다고 가정

        # ETA 날짜 포맷 변환 (HTML 입력용)
        if "eta" in dashboard_dict and dashboard_dict["eta"]:
            eta_dt = dashboard_dict["eta"]
            dashboard_dict["eta"] = eta_dt.strftime("%Y-%m-%d %H:%M")

        # SLA 목록
        sla_options = ["D+0", "D+1", "D+2", "D+3", "D+4", "D+5"]

        context = {
            "request": request,
            "dashboard": dashboard_dict,
            "sla_options": sla_options,
            "current_user": current_user,
            "is_edit": True,
        }

        return templates.TemplateResponse("order_form.html", context)

    except Exception as e:
        logger.error(f"주문 수정 페이지 로드 중 오류: {str(e)}", exc_info=True)
        error_message = quote("페이지 로드 중 오류가 발생했습니다.")
        return RedirectResponse(
            f"{detail_url}?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )
    finally:
        # 페이지 로드 중 예외 발생 시에도 락 해제 시도
        if lock_held:
            try:
                release_lock(db, "dashboard", dashboard_id, user_id)
                logger.info(
                    f"주문 수정 페이지 로드 완료/오류 후 락 해제: id={dashboard_id}"
                )
            except Exception as release_err:
                logger.error(
                    f"주문 수정 페이지 락 해제 중 오류: {release_err}", exc_info=True
                )


# --- 주문 수정 처리 API --- (Form 데이터 처리 및 서비스 호출)
@api_router.post("/orders/{dashboard_id}", status_code=status.HTTP_302_FOUND)
@db_transaction
async def update_order_action(
    request: Request,
    dashboard_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    # Form 필드명 snake_case
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
    status_val: Optional[str] = Form(
        None, alias="status"
    ),  # status는 예약어일 수 있어 status_val 사용
    driver_name: Optional[str] = Form(None),
    driver_contact: Optional[str] = Form(None),
):
    user_id = current_user.get("user_id")
    logger.info(f"주문 수정 API 요청 (전체 폼): id={dashboard_id}, user={user_id}")

    detail_url = request.url_for("order_detail_page", dashboard_id=dashboard_id)
    edit_url = request.url_for("order_edit_page", dashboard_id=dashboard_id)

    # 락 점검 및 관리는 서비스 레이어(update_dashboard)에서 처리
    try:
        # ETA 파싱
        try:
            eta_dt = datetime.fromisoformat(eta_str.replace(" ", "T"))
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="ETA 형식이 잘못되었습니다 (YYYY-MM-DD HH:MM 또는 YYYY-MM-DDTHH:MM)",
            )

        # 서비스에 전달할 데이터 dict 생성
        # DashboardUpdate 스키마 대신 직접 dict 생성
        update_data = {
            "type": type,
            "department": department,
            "warehouse": warehouse,
            "sla": sla,
            "eta": eta_dt,
            "postal_code": postal_code,
            "address": address,
            "customer": customer,
            "contact": contact,
            "remark": remark,
            "status": status_val,
            "driver_name": driver_name,
            "driver_contact": driver_contact,
        }
        # None 값 필터링 (선택 사항, 서비스에서 처리 가능하면 제거)
        update_data = {k: v for k, v in update_data.items() if v is not None}

        # update_dashboard 서비스 호출 (락 관리 및 시간 업데이트 포함)
        updated_dashboard = update_dashboard(
            db=db, dashboard_id=dashboard_id, data=update_data, user_id=user_id
        )
        success_message = quote("주문 정보가 성공적으로 수정되었습니다.")

        # 성공 시 상세 페이지로 리다이렉트
        return RedirectResponse(
            f"{detail_url}?success={success_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    except HTTPException as http_exc:
        # 서비스 레벨에서 발생한 오류 (락 실패, 유효성 검사 등)
        logger.warning(
            f"주문 수정 실패 (HTTPException): id={dashboard_id}, {http_exc.detail}"
        )
        error_message = quote(http_exc.detail)
        return RedirectResponse(
            f"{edit_url}?error={error_message}", status_code=status.HTTP_303_SEE_OTHER
        )
    except Exception as e:
        # 예상치 못한 서버 오류
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

    # 락 점검 및 관리는 서비스 레이어(delete_dashboard)에서 처리
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


# --- 주문 생성 API --- (새로 추가)
@api_router.post("/orders", status_code=status.HTTP_302_FOUND)
@db_transaction
async def create_order_action(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    # Form 필드명 snake_case
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
    status_val: Optional[str] = Form("WAITING", alias="status"),  # 기본값 WAITING
    driver_name: Optional[str] = Form(None),
    driver_contact: Optional[str] = Form(None),
):
    user_id = current_user.get("user_id")
    logger.info(f"주문 생성 API 요청: user={user_id}")

    dashboard_url = request.url_for("dashboard_page")
    create_url = request.url_for("order_create_page")

    try:
        # ETA 파싱
        try:
            eta_dt = datetime.fromisoformat(eta_str.replace(" ", "T"))
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="ETA 형식이 잘못되었습니다 (YYYY-MM-DD HH:MM 또는 YYYY-MM-DDTHH:MM)",
            )

        # 서비스에 전달할 데이터 dict 생성
        create_data = {
            "type": type,
            "department": department,
            "warehouse": warehouse,
            "sla": sla,
            "eta": eta_dt,
            "postal_code": postal_code,
            "address": address,
            "customer": customer,
            "contact": contact,
            "remark": remark,
            "status": status_val,
            "driver_name": driver_name,
            "driver_contact": driver_contact,
        }
        # None 값 필터링
        create_data = {k: v for k, v in create_data.items() if v is not None}

        # create_dashboard 서비스 호출
        create_data_obj = DashboardCreate(**create_data)
        new_dashboard = create_dashboard(db=db, data=create_data_obj, user_id=user_id)

        success_message = quote("새 주문이 성공적으로 생성되었습니다.")

        # 성공 시 새 주문 상세 페이지로 리다이렉트
        return RedirectResponse(
            f"/orders/{new_dashboard.dashboard_id}?success={success_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    except HTTPException as http_exc:
        # 서비스 레벨에서 발생한 오류 (유효성 검사 등)
        logger.warning(f"주문 생성 실패 (HTTPException): {http_exc.detail}")
        error_message = quote(http_exc.detail)
        return RedirectResponse(
            f"{create_url}?error={error_message}", status_code=status.HTTP_303_SEE_OTHER
        )
    except Exception as e:
        # 예상치 못한 서버 오류
        logger.error(f"주문 생성 API 처리 중 예외 발생: {e}", exc_info=True)
        error_message = quote("주문 생성 중 서버 오류가 발생했습니다.")
        return RedirectResponse(
            f"{create_url}?error={error_message}", status_code=status.HTTP_303_SEE_OTHER
        )
