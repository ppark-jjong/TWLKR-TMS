"""
대시보드(주문) 관련 라우터 - 최적화 및 개선 버전
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
from sqlalchemy import Column

from main.core.templating import templates
from main.utils.database import get_db
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
        logging.FileHandler("dashboard_route.log"),
    ],
)
logger = logging.getLogger(__name__)

# 라우터 생성
# API는 /api 접두사, 페이지는 접두사 없이 분리
api_router = APIRouter(prefix="/api", dependencies=[Depends(get_current_user)])
page_router = APIRouter(dependencies=[Depends(get_current_user)])


# 안전한 JSON 직렬화 함수
def safe_json_dumps(obj: Any) -> str:
    """
    안전한 JSON 직렬화를 수행하는 함수.
    어떤 객체든 직렬화에 실패하면 문자열로 변환하여 에러를 방지함.
    """
    try:
        return json.dumps(obj, cls=CustomJSONEncoder)
    except TypeError as e:
        logger.warning(f"기본 JSON 직렬화 실패: {str(e)}")

        # 딕셔너리인 경우 각 필드를 안전하게 변환
        if isinstance(obj, dict):
            safe_dict = {}
            for key, value in obj.items():
                # SQLAlchemy Column 객체는 문자열로 변환
                if isinstance(value, Column):
                    safe_dict[key] = str(value)
                # 리스트는 각 요소를 재귀적으로 처리
                elif isinstance(value, list):
                    safe_dict[key] = [safe_json_object(item) for item in value]
                # 딕셔너리도 재귀적으로 처리
                elif isinstance(value, dict):
                    safe_dict[key] = safe_json_object(value)
                # 일반 객체는 __dict__ 처리 시도
                elif hasattr(value, "__dict__"):
                    try:
                        safe_dict[key] = value.__dict__
                    except:
                        safe_dict[key] = str(value)
                # 그 외 문자열로 변환
                else:
                    safe_dict[key] = str(value)

            # 안전하게 변환된 딕셔너리로 다시 시도
            try:
                return json.dumps(safe_dict, cls=CustomJSONEncoder)
            except:
                return json.dumps(str(obj))

        # 리스트인 경우 각 요소를 안전하게 변환
        elif isinstance(obj, list):
            try:
                safe_list = [safe_json_object(item) for item in obj]
                return json.dumps(safe_list, cls=CustomJSONEncoder)
            except:
                return json.dumps(str(obj))

        # 그 외 문자열로 변환
        return json.dumps(str(obj))


def safe_json_object(obj: Any) -> Any:
    """객체를 JSON 직렬화 가능한 형태로 변환"""
    if isinstance(obj, dict):
        return {k: safe_json_object(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [safe_json_object(item) for item in obj]
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, Column):
        return str(obj)
    elif hasattr(obj, "__dict__") and not isinstance(obj, type):
        try:
            return {
                k: safe_json_object(v)
                for k, v in obj.__dict__.items()
                if not k.startswith("_")
            }
        except:
            return str(obj)
    else:
        return obj


# 공통 응답 생성 유틸리티
def create_response(
    success: bool, message: str, data: Any = None, status_code: int = 200
) -> Dict[str, Any]:
    """
    표준화된 API 응답 생성
    """
    response = {"success": success, "message": message}
    if data is not None:
        response["data"] = data
    return response


# 공통 에러 핸들러
def handle_exception(e: Exception, context: str = "") -> Dict[str, Any]:
    """
    표준화된 예외 처리
    """
    logger.error(f"{context} 오류 발생: {str(e)}")
    logger.error(traceback.format_exc())

    return {
        "success": False,
        "message": f"{context} 중 오류가 발생했습니다.",
        "error_details": str(e),
    }


# === 페이지 렌더링 라우트 ===
@page_router.get("/dashboard", include_in_schema=False, name="dashboard_page")
async def get_dashboard_page(
    request: Request,
    db: Session = Depends(get_db),
    start_date: Optional[date] = Query(None, description="초기 조회 시작일"),
    end_date: Optional[date] = Query(None, description="초기 조회 종료일"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """설명서 2.1: 대시보드 페이지 SSR 렌더링"""
    logger.info(
        f"대시보드 페이지 SSR 요청 (첫 페이지): startDate={start_date}, endDate={end_date}, user={current_user.get('user_id')}"
    )
    try:
        today = datetime.now().date()
        initial_start_date = start_date or today
        initial_end_date = end_date or today
        error_message = None

        if initial_start_date > initial_end_date:
            logger.warning("초기 로드 시 잘못된 날짜 범위, 오늘 날짜로 조정")
            initial_start_date = today
            initial_end_date = today
            error_message = "잘못된 날짜 범위가 지정되어 오늘 날짜로 조회합니다."

        initial_page = 1
        initial_page_size = 30

        logger.debug(
            f"get_dashboard_list_paginated 호출: start={initial_start_date}, end={initial_end_date}, page={initial_page}, size={initial_page_size}"
        )

        # 서비스에서 페이지네이션된 결과 가져오기
        try:
            orders, pagination_info = get_dashboard_list_paginated(
                db=db,
                start_date=initial_start_date,
                end_date=initial_end_date,
                page=initial_page,
                page_size=initial_page_size,
            )

            # 키 이름 통일 (클라이언트에서 사용하는 camelCase로)
            standardized_pagination = {
                "totalItems": pagination_info.get("total", 0),
                "totalPages": pagination_info.get("total_pages", 0),
                "currentPage": pagination_info.get("current", 1),
                "pageSize": pagination_info.get("page_size", initial_page_size),
            }

            logger.info(
                f"초기 데이터 로드 완료: {len(orders)}건 (페이지 {standardized_pagination['currentPage']}/{standardized_pagination['totalPages']})"
            )
        except Exception as fetch_err:
            logger.error(f"주문 데이터 로드 실패: {str(fetch_err)}", exc_info=True)
            orders = []
            standardized_pagination = {
                "totalItems": 0,
                "totalPages": 0,
                "currentPage": 1,
                "pageSize": initial_page_size,
            }
            error_message = "주문 데이터를 로드하는 중 오류가 발생했습니다."

        # 현재 사용자 정보 추출 (템플릿에서 사용)
        user_data = {
            "user_id": current_user.get("user_id"),
            "user_role": current_user.get("user_role"),
            "department": current_user.get("department"),
        }

        # 주문 목록 안전하게 변환
        orders_for_template = []
        for order in orders:
            try:
                # 서비스 함수로 변환 (SQLAlchemy 객체 -> 딕셔너리)
                order_data = get_dashboard_list_item_data(order)
                orders_for_template.append(order_data)
            except Exception as e:
                logger.error(
                    f"주문 데이터(ID: {getattr(order, 'dashboard_id', 'N/A')}) 변환 중 오류: {e}",
                    exc_info=True,
                )
                # 오류 발생 시 기본 정보만 추가
                try:
                    minimal_data = {
                        "dashboardId": getattr(order, "dashboard_id", "오류"),
                        "orderNo": getattr(order, "order_no", "변환 오류"),
                        "error": True,
                    }
                    orders_for_template.append(minimal_data)
                except:
                    logger.error("최소 주문 정보 추출 실패", exc_info=True)
                continue

        # 클라이언트 초기 데이터 객체 생성
        initial_data_object = {
            "orders": orders_for_template,
            "pagination": standardized_pagination,
            "start_date": initial_start_date.isoformat(),
            "end_date": initial_end_date.isoformat(),
            "error_message": error_message,
            "current_user": user_data,
        }

        # 안전한 JSON 변환 사용
        initial_data_json_str = safe_json_dumps(initial_data_object)

        # 템플릿 컨텍스트 구성
        context = {
            "request": request,
            "initial_data_object": initial_data_object,
            "initial_data_json": initial_data_json_str,
            "current_user": user_data,
        }

        return templates.TemplateResponse("dashboard.html", context)

    except Exception as e:
        logger.error(f"대시보드 페이지 렌더링 오류: {e}", exc_info=True)
        context = {
            "request": request,
            "error_message": "페이지를 로드하는 중 오류가 발생했습니다.",
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
    """
    대시보드 목록 조회 API (JSON) - 날짜 범위 전체 조회 (목록 최적화)
    """
    logger.info(
        f"대시보드 목록 API 호출: startDate={start_date}, endDate={end_date}, user={current_user.get('user_id')}"
    )
    try:
        if start_date is None or end_date is None:
            today = datetime.now().date()
            start_date = start_date or today
            end_date = end_date or today
            logger.info(f"기본 날짜 범위 설정: {start_date} ~ {end_date}")

        if start_date > end_date:
            logger.warning(
                f"잘못된 날짜 범위: 시작일({start_date}) > 종료일({end_date})"
            )
            # 빈 데이터 반환 (DashboardListResponse 스키마 준수)
            return DashboardListResponse(
                success=True,
                message="잘못된 날짜 범위입니다. 시작일은 종료일보다 빠르거나 같아야 합니다.",
                data=[],
            )

        all_orders = get_dashboard_list(db=db, start_date=start_date, end_date=end_date)
        logger.info(
            f"{start_date} ~ {end_date} 범위 데이터 {len(all_orders)}건 조회 완료"
        )

        # 목록용 데이터로 변환 (get_dashboard_list_item_data 사용)
        orders_data = [get_dashboard_list_item_data(order) for order in all_orders]

        return DashboardListResponse(
            success=True, message="주문 목록 조회 성공", data=orders_data
        )

    except SQLAlchemyError as db_err:
        error_response = handle_exception(db_err, "대시보드 목록 조회 (DB)")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_response
        )
    except Exception as e:
        error_response = handle_exception(e, "대시보드 목록 조회")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_response
        )


@api_router.get("/dashboard/search")
async def search_order_api(
    order_no: str = Query(..., description="검색할 주문번호"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    주문번호로 정확히 일치하는 단일 주문 검색 API
    """
    logger.info(
        f"주문번호 검색 API 호출: orderNo='{order_no}', user={current_user.get('user_id')}"
    )
    order_no_trimmed = order_no.strip()
    if not order_no_trimmed:
        logger.warning("검색어(주문번호)가 비어 있습니다.")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "message": "검색할 주문번호를 입력해주세요.",
                "data": {"order": None},
            },
        )

    try:
        order = search_dashboard_by_order_no(db=db, order_no=order_no_trimmed)

        order_data = None
        if order:
            logger.info(f"주문번호 '{order_no_trimmed}' 검색 성공")
            order_data = get_dashboard_response_data(order, False)
            message = f"주문번호 '{order_no_trimmed}' 검색 결과"
        else:
            logger.info(f"주문번호 '{order_no_trimmed}' 검색 결과 없음")
            message = f"주문번호 '{order_no_trimmed}'에 해당하는 주문이 없습니다."

        return {"success": True, "message": message, "data": {"order": order_data}}

    except SQLAlchemyError as db_err:
        error_response = handle_exception(db_err, "주문번호 검색 (DB)")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_response
        )
    except Exception as e:
        error_response = handle_exception(e, "주문번호 검색")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_response
        )


@api_router.get("/orders/lock/{dashboard_id}", response_model=LockStatusResponse)
async def check_order_lock_api(
    dashboard_id: int = Path(..., ge=1, description="락 상태 확인할 주문 ID"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """설명서 2.10 (추정): 주문 락 상태 확인 API"""
    user_id = current_user.get("user_id")
    logger.info(f"주문 락 상태 확인 API 요청: id={dashboard_id}, user={user_id}")

    try:
        # 서비스 함수 호출 (경로 통일 후 해당 함수 사용)
        lock_status = get_lock_status(db=db, dashboard_id=dashboard_id, user_id=user_id)
        logger.info(
            f"주문 락 상태 확인 완료: id={dashboard_id}, editable={lock_status.get('editable')}"
        )
        # 서비스에서 반환된 딕셔너리를 LockStatusResponse 모델로 자동 변환하여 반환
        return lock_status

    except HTTPException as http_exc:
        logger.warning(
            f"주문 락 상태 확인 오류 (HTTPException): id={dashboard_id}, status={http_exc.status_code}, detail={http_exc.detail}"
        )
        raise http_exc  # 그대로 전달하여 FastAPI가 처리하도록 함
    except Exception as e:
        logger.error(f"주문 락 상태 확인 API 오류: {str(e)}", exc_info=True)
        # 일관된 오류 응답 반환 (스키마에 맞춰)
        return LockStatusResponse(
            success=False,
            editable=False,
            locked_by=None,
            message="락 상태 확인 중 서버 오류 발생",
        )


# --- 주문 생성 페이지 (order_routes.py 에서 이동) ---
@page_router.get("/orders/new", name="order_create_page")
async def order_create_page(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """주문 생성 페이지 렌더링"""
    logger.info(f"order_create_page 시작: 사용자={current_user.get('user_id')}")
    try:
        logger.debug("템플릿 렌더링 시작: order_form.html")

        user_data = {
            "user_id": current_user.get("user_id"),
            "user_role": current_user.get("user_role"),
            "department": current_user.get("department"),
        }

        initial_data_obj = {
            "is_edit": False,
            "order": None,
            "current_user": user_data,
        }

        initial_data_json_str = json.dumps(initial_data_obj)

        logger.info("order_create_page 완료: 결과=성공")
        return templates.TemplateResponse(
            "order_form.html",
            {
                "request": request,
                "current_user": user_data,
                "initial_data_json": initial_data_json_str,
                "is_edit": False,
                "order": None,
            },
        )
    except Exception as e:
        logger.error(f"주문 생성 페이지 렌더링 중 오류 발생: {str(e)}", exc_info=True)
        logger.info(f"order_create_page 완료: 결과=오류, 메시지={str(e)[:100]}")
        error_message = quote("페이지를 불러오는 중 오류가 발생했습니다")
        return RedirectResponse(
            url=f"/dashboard?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )


# --- 주문 상세 페이지 (order_routes.py 에서 이동) ---
@page_router.get("/orders/{dashboard_id}", name="order_detail_page")
async def order_detail_page(
    request: Request,
    dashboard_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """주문 상세 페이지 렌더링"""
    logger.info(
        f"order_detail_page 시작: dashboard_id={dashboard_id}, 사용자={current_user.get('user_id')}"
    )
    try:
        logger.debug(f"DB 쿼리 시작: 주문 ID={dashboard_id} 상세 조회")
        order = get_dashboard_by_id(db, dashboard_id)
        if not order:
            logger.warning(f"존재하지 않는 주문 조회 시도: ID={dashboard_id}")
            error_message = quote("주문을 찾을 수 없습니다")
            return RedirectResponse(
                url=f"/dashboard?error={error_message}",
                status_code=status.HTTP_303_SEE_OTHER,
            )

        logger.debug(
            f"락 상태 확인: 주문 ID={dashboard_id}, 사용자={current_user.get('user_id')}"
        )
        lock_status = get_lock_status(db, dashboard_id, current_user.get("user_id"))
        is_editable = lock_status.get("editable", False)

        order_data = get_dashboard_response_data(order, is_editable)
        user_data = {
            "user_id": current_user.get("user_id"),
            "user_role": current_user.get("user_role"),
            "department": current_user.get("department"),
        }

        page_data_obj = {
            "order": order_data,
            "lock_status": lock_status,
            "current_user": user_data,
        }

        page_data_json_str = json.dumps(page_data_obj)

        logger.debug(f"템플릿 렌더링 시작: order_page.html, 주문={order.order_no}")
        logger.info(f"order_detail_page 완료: 결과=성공, 주문={order.order_no}")
        return templates.TemplateResponse(
            "order_page.html",
            {
                "request": request,
                "current_user": user_data,
                "order": order_data,
                "page_data_json": page_data_json_str,
            },
        )
    except Exception as e:
        logger.error(f"주문 상세 페이지 렌더링 중 오류 발생: {str(e)}", exc_info=True)
        logger.info(f"order_detail_page 완료: 결과=오류, 메시지={str(e)[:100]}")
        error_message = quote("주문 정보를 불러오는 중 오류가 발생했습니다")
        return RedirectResponse(
            url=f"/dashboard?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )


# --- 주문 수정 페이지 (order_routes.py 에서 이동) ---
@page_router.get(
    "/orders/{dashboard_id}/edit", include_in_schema=False, name="order_edit_page"
)
async def order_edit_page(
    request: Request,
    dashboard_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """설명서 2.6: 주문 수정 페이지 로드 및 락 확인"""
    user_id = current_user.get("user_id")
    logger.info(f"주문 수정 페이지 로드 시작: id={dashboard_id}, user={user_id}")

    try:
        order = get_dashboard_by_id(db, dashboard_id)
        if not order:
            logger.warning(f"수정 대상 주문 없음: id={dashboard_id}")
            error_message = quote("수정할 주문을 찾을 수 없습니다.")
            return RedirectResponse(
                url=f"/dashboard?error={error_message}",
                status_code=status.HTTP_303_SEE_OTHER,
            )

        lock_info = get_lock_status(db, dashboard_id, user_id)
        is_editable = lock_info.get("editable", False)

        if not is_editable:
            locked_by_user = lock_info.get("locked_by", "다른 사용자")
            error_message = f"{locked_by_user}님이 현재 수정 중입니다."
            logger.warning(
                f"락으로 인해 수정 페이지 접근 불가: id={dashboard_id}, locked_by={locked_by_user}"
            )
            detail_page_url = request.url_for(
                "order_detail_page", dashboard_id=dashboard_id
            )
            redirect_url = f"{detail_page_url}?error={quote(error_message)}"
            return RedirectResponse(
                url=redirect_url, status_code=status.HTTP_303_SEE_OTHER
            )

        # 락이 없거나 내가 소유 -> 수정 페이지 렌더링
        order_data = get_dashboard_response_data(order, True)

        # JSON 직렬화 전에 current_user에서 필요한 정보만 추출
        user_data = {
            "user_id": current_user.get("user_id"),
            "user_role": current_user.get("user_role"),
            "department": current_user.get("department"),
        }

        initial_data_obj = {
            "is_edit": True,
            "order": order_data,
            "current_user": user_data,
        }

        initial_data_json_str = json.dumps(initial_data_obj)

        context = {
            "request": request,
            "current_user": user_data,
            "initial_data_json": initial_data_json_str,
            "is_edit": True,
            "order": order_data,
        }
        return templates.TemplateResponse("order_form.html", context)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"주문 수정 페이지 로드 오류: {str(e)}", exc_info=True)
        context = {
            "request": request,
            "error_message": "페이지 로드 중 오류 발생",
            "current_user": current_user,
        }
        return templates.TemplateResponse("error.html", context, status_code=500)


# --- 주문 생성 처리 API (order_routes.py 에서 이동, 개선사항 반영) ---
@api_router.post("/orders", status_code=status.HTTP_302_FOUND)
async def create_order_action(
    request: Request,  # 리다이렉트 URL 생성에 필요
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    # Form 필드명 snake_case
    order_no: str = Form(...),
    type: str = Form(...),
    department: str = Form(...),
    warehouse: str = Form(...),
    sla: str = Form(...),
    eta: str = Form(..., description="YYYY-MM-DDTHH:MM 또는 YYYY-MM-DD HH:MM"),
    postal_code: str = Form(...),
    address: str = Form(...),
    customer: str = Form(...),
    contact: Optional[str] = Form(None),
    remark: Optional[str] = Form(None),
):
    """설명서 2.5: 주문 생성 처리 API"""
    user_id = current_user.get("user_id")
    logger.info(
        f"주문 생성 API 시작: 사용자={user_id}, Form Data={{'order_no': '{order_no}', ...}}"
    )

    eta_dt = None
    try:
        eta_dt = datetime.fromisoformat(eta)
    except ValueError:
        try:
            eta_dt = datetime.strptime(eta, "%Y-%m-%d %H:%M")
        except ValueError:
            logger.error(f"잘못된 ETA 형식 수신: {eta}")
            # 오류 발생 시 생성 페이지로 에러 메시지와 함께 리다이렉트
            error_message = quote(
                "ETA 형식이 잘못되었습니다 (YYYY-MM-DDTHH:MM 또는 YYYY-MM-DD HH:MM)."
            )
            # 이전 입력값 유지를 위해선 복잡한 처리 필요, 여기서는 메시지만 전달
            return RedirectResponse(
                url=f"/orders/new?error={error_message}",
                status_code=status.HTTP_303_SEE_OTHER,
            )

    try:
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
        logger.debug(f"생성할 DashboardCreate 객체: {dashboard_data.model_dump()}")

        new_dashboard = create_dashboard(db=db, data=dashboard_data, user_id=user_id)
        logger.info(f"주문 생성 API 성공: ID={new_dashboard.dashboard_id}")

        # 성공 메시지와 함께 상세 페이지로 리다이렉트
        success_message = quote("주문이 성공적으로 생성되었습니다.")
        detail_url = request.url_for(
            "order_detail_page", dashboard_id=new_dashboard.dashboard_id
        )
        return RedirectResponse(
            url=f"{detail_url}?success={success_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    except HTTPException as http_exc:
        logger.warning(
            f"주문 생성 API 실패 (HTTPException): 사용자={user_id}, Detail={http_exc.detail}"
        )
        error_message = quote(http_exc.detail or "주문 생성 중 오류 발생")
        return RedirectResponse(
            url=f"/orders/new?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )
    except Exception as e:
        logger.error(f"주문 생성 API 오류: 사용자={user_id}, Error={e}", exc_info=True)
        error_message = quote("주문 생성 중 서버 오류가 발생했습니다.")
        return RedirectResponse(
            url=f"/orders/new?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )


# --- 주문 수정 처리 API (order_routes.py 에서 이동, 개선사항 반영) ---
@api_router.post("/orders/{dashboard_id}", status_code=status.HTTP_302_FOUND)
async def update_order_action(
    request: Request,  # 리다이렉트 URL 생성에 필요
    dashboard_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    # Form 필드명 snake_case
    type: str = Form(...),
    department: str = Form(...),
    warehouse: str = Form(...),
    sla: str = Form(...),
    eta: str = Form(..., description="YYYY-MM-DDTHH:MM 또는 YYYY-MM-DD HH:MM"),
    postal_code: str = Form(...),
    address: str = Form(...),
    customer: str = Form(...),
    contact: Optional[str] = Form(None),
    remark: Optional[str] = Form(None),
    status_val: Optional[str] = Form(
        None, alias="status"
    ),  # alias 유지 또는 name="status"
    driver_name: Optional[str] = Form(None),
    driver_contact: Optional[str] = Form(None),
):
    """설명서 2.7: 주문 수정 처리 API"""
    user_id = current_user.get("user_id")
    logger.info(
        f"주문 수정 API 시작: ID={dashboard_id}, 사용자={user_id}, Form Data={{'type': '{type}', 'status': '{status_val}', ...}}"
    )

    eta_dt = None
    try:
        eta_dt = datetime.fromisoformat(eta)
    except ValueError:
        try:
            eta_dt = datetime.strptime(eta, "%Y-%m-%d %H:%M")
        except ValueError:
            logger.error(f"잘못된 ETA 형식 수신 (수정): {eta}")
            error_message = quote(
                "ETA 형식이 잘못되었습니다 (YYYY-MM-DDTHH:MM 또는 YYYY-MM-DD HH:MM)."
            )
            edit_url = request.url_for("order_edit_page", dashboard_id=dashboard_id)
            return RedirectResponse(
                url=f"{edit_url}?error={error_message}",
                status_code=status.HTTP_303_SEE_OTHER,
            )

    try:
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
        logger.debug(
            f"업데이트할 DashboardUpdate 객체: {update_data.model_dump(exclude_none=True)}"
        )

        updated_dashboard = update_dashboard(
            db=db, dashboard_id=dashboard_id, data=update_data, user_id=user_id
        )
        logger.info(f"주문 수정 API 성공: ID={dashboard_id}")

        # 성공 메시지와 함께 상세 페이지로 리다이렉트
        success_message = quote("주문 정보가 성공적으로 수정되었습니다.")
        detail_url = request.url_for("order_detail_page", dashboard_id=dashboard_id)
        return RedirectResponse(
            url=f"{detail_url}?success={success_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    except HTTPException as http_exc:
        logger.warning(
            f"주문 수정 API 실패 (HTTPException): ID={dashboard_id}, 사용자={user_id}, Detail={http_exc.detail}"
        )
        error_message = quote(http_exc.detail or "주문 수정 중 오류 발생")
        edit_url = request.url_for("order_edit_page", dashboard_id=dashboard_id)
        return RedirectResponse(
            url=f"{edit_url}?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )
    except Exception as e:
        logger.error(
            f"주문 수정 API 오류: ID={dashboard_id}, 사용자={user_id}, Error={e}",
            exc_info=True,
        )
        error_message = quote("주문 수정 중 서버 오류가 발생했습니다.")
        edit_url = request.url_for("order_edit_page", dashboard_id=dashboard_id)
        return RedirectResponse(
            url=f"{edit_url}?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )


# --- 주문 삭제 처리 API (order_routes.py 에서 이동, 개선사항 반영) ---
@api_router.post("/orders/{dashboard_id}/delete", status_code=status.HTTP_302_FOUND)
async def delete_order_action(
    request: Request,  # 리다이렉트 URL 생성에 필요
    dashboard_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),
):
    """설명서 2.8: 주문 삭제 처리 API (ADMIN 전용)"""
    user_id = current_user.get("user_id")
    logger.info(
        f"delete_order_action 시작: dashboard_id={dashboard_id}, 사용자={user_id}"
    )

    try:
        result_list = delete_dashboard(
            db=db,
            dashboard_ids=[dashboard_id],
            user_id=user_id,
            user_role=current_user.get("user_role"),
        )

        if result_list and result_list[0].get("success"):
            logger.info(f"delete_order_action 완료: 결과=성공, ID={dashboard_id}")
            success_message = quote("주문이 성공적으로 삭제되었습니다.")
            # 삭제 성공 시 대시보드로 리다이렉트
            dashboard_url = request.url_for("dashboard_page")
            return RedirectResponse(
                url=f"{dashboard_url}?success={success_message}",
                status_code=status.HTTP_303_SEE_OTHER,
            )
        else:
            error_message = (
                result_list[0].get("message", "삭제 실패")
                if result_list
                else "삭제 실패"
            )
            logger.warning(
                f"delete_order_action 완료: 결과=실패, ID={dashboard_id}, 메시지={error_message}"
            )
            # 실패 시 상세 페이지로 리다이렉트
            detail_url = request.url_for("order_detail_page", dashboard_id=dashboard_id)
            return RedirectResponse(
                url=f"{detail_url}?error={quote(error_message)}",
                status_code=status.HTTP_303_SEE_OTHER,
            )

    except HTTPException as http_exc:
        logger.warning(
            f"주문 삭제 실패 (HTTPException): ID={dashboard_id}, Detail={http_exc.detail}"
        )
        error_message = quote(
            http_exc.detail or "삭제 권한이 없거나 오류가 발생했습니다."
        )
        detail_url = request.url_for("order_detail_page", dashboard_id=dashboard_id)
        return RedirectResponse(
            url=f"{detail_url}?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )
    except Exception as e:
        logger.error(f"주문 삭제 중 오류 발생: {str(e)}", exc_info=True)
        error_message = quote("주문 삭제 중 오류가 발생했습니다")
        detail_url = request.url_for("order_detail_page", dashboard_id=dashboard_id)
        return RedirectResponse(
            url=f"{detail_url}?error={error_message}",
            status_code=status.HTTP_303_SEE_OTHER,
        )
