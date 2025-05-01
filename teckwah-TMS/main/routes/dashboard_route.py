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
from main.utils.database import get_db
from main.utils.security import get_current_user, get_admin_user
from main.models.dashboard_model import Dashboard
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
    get_dashboard_list_paginated,
)

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

# 라우터 생성 (인증 의존성 추가)
router = APIRouter(dependencies=[Depends(get_current_user)])


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


# 데이터 변환 및 직렬화 유틸리티
class EnhancedJSONEncoder(json.JSONEncoder):
    """
    개선된 JSON 직렬화 핸들러
    """

    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if hasattr(obj, "__dict__"):
            return obj.__dict__
        return super().default(obj)


def safe_serialize(data: Any) -> Any:
    """
    안전한 데이터 직렬화
    """
    try:
        return json.loads(json.dumps(data, cls=EnhancedJSONEncoder))
    except Exception as e:
        logger.error(f"직렬화 오류: {e}")
        return None


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


@router.get("/dashboard/list", response_model=DashboardListResponse)
async def get_dashboard_list_api(
    request: Request,
    db: Session = Depends(get_db),
    start_date: Optional[date] = Query(None, description="조회 시작일"),
    end_date: Optional[date] = Query(None, description="조회 종료일"),
):
    """
    대시보드 목록 조회 API (JSON) - 날짜 범위 전체 조회
    최적화된 데이터 로드 및 변환. 페이지네이션 없음.
    """
    logger.info(
        f"대시보드 목록 조회 API 호출: startDate={start_date}, endDate={end_date}"
    )
    try:
        # 날짜 범위 설정 (기본값: 오늘)
        if start_date is None or end_date is None:
            today = datetime.now().date()
            start_date = start_date or today
            end_date = end_date or today
            logger.info(f"기본 날짜 범위 설정: {start_date} ~ {end_date}")

        # 시작일이 종료일보다 늦으면 오류 처리
        if start_date > end_date:
            logger.warning(
                f"잘못된 날짜 범위: 시작일({start_date}) > 종료일({end_date})"
            )
            # 오류 응답 대신 빈 데이터 반환 또는 적절한 HTTP 오류 고려
            return create_response(
                success=True,
                message="잘못된 날짜 범위입니다. 시작일은 종료일보다 빠르거나 같아야 합니다.",
                data=[],  # 빈 리스트 반환
            )

        # 서비스 함수 호출 (페이지네이션 파라미터 없이 날짜 범위만 전달)
        # *** 참고: dashboard_service.get_dashboard_list 함수는 페이지네이션 없이
        # *** 지정된 날짜 범위의 모든 데이터를 반환하도록 수정되어야 합니다.
        # *** 여기서는 수정되었다고 가정합니다.
        all_orders = get_dashboard_list(
            db=db,
            start_date=start_date,
            end_date=end_date,
            # page, page_size 인자 제거
        )
        logger.info(
            f"{start_date} ~ {end_date} 범위 데이터 {len(all_orders)}건 조회 완료"
        )

        # 상태 및 타입 라벨 (기존 유지)
        status_labels = {
            "WAITING": "대기",
            "IN_PROGRESS": "진행",
            "COMPLETE": "완료",
            "ISSUE": "이슈",
            "CANCEL": "취소",
        }
        type_labels = {"DELIVERY": "배송", "RETURN": "회수"}

        # 데이터 변환 최적화 (DashboardListItem 스키마 반영, dashboardId 포함)
        orders_data = [
            safe_serialize(
                {
                    "dashboardId": order.dashboard_id,
                    "orderNo": order.order_no,
                    "type": order.type,
                    "status": order.status,
                    "department": order.department,
                    "warehouse": order.warehouse,
                    "sla": order.sla,
                    "region": getattr(order, "region", None),
                    "eta": order.eta,
                    "customer": order.customer,
                    "driverName": order.driver_name,
                }
            )
            for order in all_orders
        ]

        # 표준화된 응답 반환 (데이터만 포함)
        response_data = create_response(
            success=True, message="주문 목록 조회 성공", data=orders_data
        )
        return response_data

    except SQLAlchemyError as db_err:
        # 데이터베이스 오류 처리
        error_response = handle_exception(db_err, "대시보드 목록 조회 (DB)")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=error_response
        )
    except Exception as e:
        # 기타 예외 처리 최적화
        error_response = handle_exception(e, "대시보드 목록 조회")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=error_response
        )


@router.get("/dashboard/search")
async def search_order(
    request: Request,
    order_no: str = Query(..., description="검색할 주문번호"),
    db: Session = Depends(get_db),
    # page, page_size 파라미터 제거
):  # 반환 모델 제거 또는 단순화
    """
    주문번호로 정확히 일치하는 단일 주문 검색 API
    """
    logger.info(f"주문번호 검색 API 호출: orderNo='{order_no}'")
    order_no_trimmed = order_no.strip()
    if not order_no_trimmed:
        logger.warning("검색어(주문번호)가 비어 있습니다.")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=create_response(
                success=False,
                message="검색할 주문번호를 입력해주세요.",
                data={"order": None},
            ),
        )

    try:
        # 수정된 서비스 함수 호출 (단일 객체 또는 None 반환)
        order = search_dashboard_by_order_no(db=db, order_no=order_no_trimmed)

        if order:
            logger.info(f"주문번호 '{order_no_trimmed}' 검색 성공")
            # DashboardListItem 스키마 형식으로 변환 (필요 필드만 포함)
            order_data = safe_serialize(
                {
                    "dashboardId": order.dashboard_id,
                    "orderNo": order.order_no,
                    "type": order.type,
                    "status": order.status,
                    "department": order.department,
                    "warehouse": order.warehouse,
                    "sla": order.sla,
                    "eta": order.eta,
                    "region": getattr(order, "region", None),
                    "customer": order.customer,
                    "driverName": order.driver_name,
                }
            )
            return create_response(
                success=True,
                message=f"주문번호 '{order_no_trimmed}' 검색 결과",
                data={"order": order_data},  # 단일 객체 또는 null
            )
        else:
            logger.info(f"주문번호 '{order_no_trimmed}' 검색 결과 없음")
            return create_response(
                success=True,  # 검색 자체는 성공
                message=f"주문번호 '{order_no_trimmed}'에 해당하는 주문이 없습니다.",
                data={"order": None},
            )

    except SQLAlchemyError as db_err:
        error_response = handle_exception(db_err, "주문번호 검색 (DB)")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=error_response
        )
    except Exception as e:
        error_response = handle_exception(e, "주문번호 검색")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=error_response
        )


# === 최종 수정된 /dashboard (SSR) 엔드포인트 ===
@router.get("/dashboard", include_in_schema=False)
async def get_dashboard_page(
    request: Request,
    db: Session = Depends(get_db),  # DB 세션 다시 필요
    start_date: Optional[date] = Query(
        None, description="초기 조회 시작일"
    ),  # 파라미터 다시 필요
    end_date: Optional[date] = Query(
        None, description="초기 조회 종료일"
    ),  # 파라미터 다시 필요
):
    """
    대시보드 페이지 SSR 렌더링 - 첫 페이지 데이터 포함
    """
    # 인증 확인은 Depends(get_current_user) 등으로 FastAPI 의존성 주입 시스템 활용 권장
    # 여기서는 라우터 데코레이터에 Depends 추가 또는 아래에서 직접 호출 가정
    # 예: current_user: dict = Depends(get_current_user)
    current_user = request.session.get("user")  # 세션 방식 유지 시
    if not current_user:
        # 실제로는 Depends 에서 처리되거나 미들웨어에서 리디렉션될 것임
        return RedirectResponse("/login", status_code=status.HTTP_302_FOUND)

    logger.info(
        f"대시보드 페이지 SSR 요청 (첫 페이지): startDate={start_date}, endDate={end_date}, user={current_user.get('user_id')}"
    )
    try:
        # 초기 날짜 설정 (기본값: 오늘)
        today = datetime.now().date()
        initial_start_date = start_date or today
        initial_end_date = end_date or today
        error_message = None

        if initial_start_date > initial_end_date:
            logger.warning("초기 로드 시 잘못된 날짜 범위, 오늘 날짜로 조정")
            initial_start_date = today
            initial_end_date = today
            error_message = "잘못된 날짜 범위가 지정되어 오늘 날짜로 조회합니다."

        # 페이지네이션 서비스 함수 호출 (첫 페이지)
        initial_page = 1
        initial_page_size = 30

        logger.debug(
            f"get_dashboard_list_paginated 호출: start={initial_start_date}, end={initial_end_date}, page={initial_page}, size={initial_page_size}"
        )
        orders, pagination_info = get_dashboard_list_paginated(
            db=db,
            start_date=initial_start_date,
            end_date=initial_end_date,
            page=initial_page,
            page_size=initial_page_size,
        )
        logger.info(
            f"초기 데이터 로드 완료: {len(orders)}건 (페이지 {initial_page}/{pagination_info.get('totalPages', 0)})"
        )

        # 상태 및 타입 라벨 정의 (템플릿에서 사용)
        status_labels = {
            "WAITING": "대기",
            "IN_PROGRESS": "진행",
            "COMPLETE": "완료",
            "ISSUE": "이슈",
            "CANCEL": "취소",
        }
        type_labels = {"DELIVERY": "배송", "RETURN": "회수"}

        # 템플릿에 전달할 데이터 가공 (DashboardListItem 형식과 유사하게)
        orders_for_template = [
            {
                "dashboardId": order.dashboard_id,
                "orderNo": order.order_no,
                "type": order.type,
                "department": order.department,
                "warehouse": order.warehouse,
                "sla": order.sla,
                "region": getattr(order, "region", None),
                "eta": order.eta.strftime("%Y-%m-%d %H:%M") if order.eta else None,
                "customer": order.customer,
                "status": order.status,
                "driverName": order.driver_name,
                # 템플릿에서 직접 사용할 라벨 추가
                "statusLabel": status_labels.get(order.status, order.status),
                "typeLabel": type_labels.get(order.type, order.type),
            }
            for order in orders
        ]

        # 템플릿 컨텍스트 구성
        context = {
            "request": request,
            "initial_data": {  # initial_data 객체로 묶어서 전달
                "orders": orders_for_template,
                "pagination": pagination_info,  # 서비스에서 받은 페이지네이션 정보
                "start_date": initial_start_date.isoformat(),
                "end_date": initial_end_date.isoformat(),
                "error_message": error_message,
            },
            "current_user": current_user,
        }

        # logger.debug(f"템플릿 컨텍스트: {context}")
        return templates.TemplateResponse("dashboard.html", context)

    except Exception as e:
        logger.error(f"대시보드 페이지 렌더링 오류: {e}", exc_info=True)
        context = {
            "request": request,
            "error_message": "페이지를 로드하는 중 오류가 발생했습니다.",
        }
        return templates.TemplateResponse("error.html", context, status_code=500)


# === 주문 CRUD 및 기타 작업 라우터 ===


# --- 주문 생성 (Form 방식) ---
@router.post(
    "/orders", status_code=status.HTTP_302_FOUND, response_class=RedirectResponse
)
async def create_order_form(
    request: Request,
    db: Session = Depends(get_db),
    # Form 데이터 필드들 (DashboardCreate 스키마 기반)
    orderNo: str = Form(...),
    type: str = Form(...),
    department: str = Form(...),
    warehouse: str = Form(...),
    sla: str = Form(...),
    eta: datetime = Form(...),
    postalCode: str = Form(...),
    address: str = Form(...),
    customer: str = Form(...),
    contact: Optional[str] = Form(None),  # 선택 필드
    remark: Optional[str] = Form(None),  # 선택 필드
):
    """
    주문 생성 처리 (Form 데이터 사용)
    """
    current_user = request.session.get("user")  # 세션에서 사용자 정보 가져오기
    user_id = current_user.get("user_id")
    logger.info(f"주문 생성 요청(Form): orderNo={orderNo}, user={user_id}")

    # Pydantic 모델 인스턴스 생성 (유효성 검증 포함)
    try:
        order_data = DashboardCreate(
            orderNo=orderNo,
            type=type,
            department=department,
            warehouse=warehouse,
            sla=sla,
            eta=eta,
            postalCode=postalCode,
            address=address,
            customer=customer,
            contact=contact,
            remark=remark,
        )
    except Exception as validation_error:  # Pydantic 유효성 검증 오류 처리
        logger.warning(f"주문 생성 데이터 유효성 검증 실패: {validation_error}")
        # TODO: 오류 메시지를 포함하여 생성 폼으로 다시 렌더링하는 로직 필요
        # 예: return templates.TemplateResponse("order_form.html", {"request": request, "error": str(validation_error), "form_data": request.form()})
        # 지금은 간단히 400 오류 발생
        raise HTTPException(
            status_code=400, detail=f"입력 데이터 오류: {validation_error}"
        )

    try:
        # 서비스 함수 호출
        new_order = create_dashboard(db=db, data=order_data, user_id=user_id)
        logger.info(f"주문 생성 성공(Form): id={new_order.dashboard_id}")
        # 성공 시 생성된 주문의 상세 페이지로 리다이렉트
        return RedirectResponse(
            url=f"/orders/{new_order.dashboard_id}", status_code=status.HTTP_302_FOUND
        )

    except HTTPException as http_exc:
        # 서비스 함수 내에서 발생한 HTTP 예외 처리 (예: DB 오류)
        logger.error(f"주문 생성 서비스 오류 (HTTPException): {http_exc.detail}")
        raise http_exc
    except Exception as e:
        logger.error(f"주문 생성(Form) 중 예상치 못한 오류: {str(e)}", exc_info=True)
        # 일반 오류 발생 시
        raise HTTPException(status_code=500, detail="주문 생성 중 오류 발생")


# --- 주문 수정 (Form 방식) ---
@router.post(
    "/orders/{dashboard_id}",
    status_code=status.HTTP_302_FOUND,
    response_class=RedirectResponse,
)
async def update_order_form(
    request: Request,
    dashboard_id: int = Path(..., ge=1, description="수정할 주문 ID"),
    db: Session = Depends(get_db),
    # Form 데이터 필드들 (DashboardUpdate 스키마 기반)
    orderNo: str = Form(...),
    type: str = Form(...),
    department: str = Form(...),
    warehouse: str = Form(...),
    sla: str = Form(...),
    eta: datetime = Form(...),
    postalCode: str = Form(...),
    address: str = Form(...),
    customer: str = Form(...),
    contact: Optional[str] = Form(None),  # 선택 필드
    remark: Optional[str] = Form(None),  # 선택 필드
    # 기사 정보는 별도 라우터에서 처리하므로 여기서는 제외
    # driver_name: Optional[str] = Form(None),
    # driver_contact: Optional[str] = Form(None)
):
    """
    주문 수정 처리 (Form 데이터 사용)
    서비스 레벨에서 락(Lock) 처리.
    """
    current_user = request.session.get("user")
    user_id = current_user.get("user_id")
    logger.info(f"주문 수정 요청(Form): id={dashboard_id}, user={user_id}")

    # Pydantic 모델 인스턴스 생성 (유효성 검증 포함)
    try:
        # DashboardUpdate 스키마 사용 (모든 필드가 Optional일 수 있음, 스키마 정의 확인 필요)
        # 여기서는 생성 스키마의 필드를 그대로 사용한다고 가정하고,
        # 서비스에서 필요한 필드만 업데이트한다고 가정
        update_data = DashboardUpdate(
            order_no=orderNo,
            type=type,
            department=department,
            warehouse=warehouse,
            sla=sla,
            eta=eta,
            postal_code=postalCode,
            address=address,
            customer=customer,
            contact=contact,
            remark=remark,
            # driver_name, driver_contact 는 여기서 업데이트 안 함
        )
    except Exception as validation_error:
        logger.warning(f"주문 수정 데이터 유효성 검증 실패: {validation_error}")
        # TODO: 오류 메시지 포함하여 수정 폼으로 리다이렉트
        raise HTTPException(
            status_code=400, detail=f"입력 데이터 오류: {validation_error}"
        )

    try:
        # 서비스 함수 호출 (update_dashboard는 락 처리 포함)
        updated_order = update_dashboard(
            db=db, dashboard_id=dashboard_id, data=update_data, user_id=user_id
        )
        logger.info(f"주문 수정 성공(Form): id={updated_order.dashboard_id}")
        # 성공 시 해당 주문의 상세 페이지로 리다이렉트
        return RedirectResponse(
            url=f"/orders/{dashboard_id}", status_code=status.HTTP_302_FOUND
        )

    except HTTPException as http_exc:
        # 서비스 함수 내에서 발생한 HTTP 예외 처리 (404, 423 등)
        logger.warning(
            f"주문 수정 서비스 오류 (HTTPException): id={dashboard_id}, status={http_exc.status_code}, detail={http_exc.detail}"
        )
        # TODO: 오류 메시지 포함하여 수정 폼으로 리다이렉트
        raise http_exc  # 또는 오류 처리 페이지로
    except Exception as e:
        logger.error(f"주문 수정(Form) 중 예상치 못한 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="주문 수정 중 오류 발생")


# --- 주문 삭제 (Form 방식) ---
@router.post(
    "/orders/{dashboard_id}/delete",
    status_code=status.HTTP_302_FOUND,
    response_class=RedirectResponse,
)
async def delete_order_form(
    request: Request,
    dashboard_id: int = Path(..., ge=1, description="삭제할 주문 ID"),
    db: Session = Depends(get_db),
    # current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    주문 삭제 처리 (Form 방식)
    ADMIN 권한 필요. 서비스 레벨에서 락(Lock) 처리.
    """
    current_user = request.session.get("user")
    user_id = current_user.get("user_id")
    user_role = current_user.get("role")
    logger.info(
        f"주문 삭제 요청(Form): id={dashboard_id}, user={user_id}, role={user_role}"
    )

    # ADMIN 권한 확인
    if user_role != "ADMIN":
        logger.warning(f"권한 없는 주문 삭제 시도: id={dashboard_id}, user={user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="삭제 권한이 없습니다."
        )

    try:
        # 서비스 함수 호출 (delete_dashboard는 권한 확인 및 락 처리 포함)
        results = delete_dashboard(
            db=db, dashboard_ids=[dashboard_id], user_id=user_id, user_role=user_role
        )

        # delete_dashboard는 결과 리스트를 반환하므로, 첫 번째 결과 확인
        if results and results[0].get("success"):
            logger.info(f"주문 삭제 성공(Form): id={dashboard_id}")
            # 성공 시 대시보드 페이지로 리다이렉트
            return RedirectResponse(url="/dashboard", status_code=status.HTTP_302_FOUND)
        else:
            # 서비스 함수 내에서 오류가 발생했거나 실패 메시지를 반환한 경우
            error_message = results[0].get("message") if results else "알 수 없는 오류"
            logger.error(
                f"주문 삭제 서비스 실패: id={dashboard_id}, message={error_message}"
            )
            # TODO: 오류 메시지를 포함하여 이전 페이지(상세) 또는 대시보드로 리다이렉트
            raise HTTPException(
                status_code=500, detail=f"주문 삭제 처리 중 오류 발생: {error_message}"
            )

    except HTTPException as http_exc:
        # 서비스 함수 내에서 발생한 HTTPException (404, 423, 403 등) 처리
        logger.warning(
            f"주문 삭제 서비스 오류 (HTTPException): id={dashboard_id}, status={http_exc.status_code}, detail={http_exc.detail}"
        )
        raise http_exc
    except Exception as e:
        logger.error(f"주문 삭제(Form) 중 예상치 못한 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="주문 삭제 중 오류 발생")


# --- 주문 상태 변경 (Form 방식) ---
@router.post(
    "/orders/{dashboard_id}/status",
    status_code=status.HTTP_302_FOUND,
    response_class=RedirectResponse,
)
async def change_order_status_form(
    request: Request,
    dashboard_id: int = Path(..., ge=1, description="상태 변경할 주문 ID"),
    db: Session = Depends(get_db),
    # current_user: Dict[str, Any] = Depends(get_current_user),
    status: str = Form(...),  # 변경할 새로운 상태
):
    """
    주문 상태 변경 처리 (Form 데이터 사용)
    서비스 레벨에서 락(Lock) 및 상태 전이 규칙 처리.
    """
    current_user = request.session.get("user")
    user_id = current_user.get("user_id")
    user_role = current_user.get("role")
    logger.info(
        f"주문 상태 변경 요청(Form): id={dashboard_id}, new_status={status}, user={user_id}"
    )

    # 상태 값 유효성 검사 (선택 사항, 스키마에서 처리 가능)
    valid_statuses = ["WAITING", "IN_PROGRESS", "COMPLETE", "ISSUE", "CANCEL"]
    if status not in valid_statuses:
        logger.warning(f"잘못된 상태 값으로 변경 시도: status={status}")
        raise HTTPException(status_code=400, detail="유효하지 않은 상태 값입니다.")

    try:
        # 서비스 함수 호출 (change_status는 락, 권한, 규칙 처리 포함)
        results = change_status(
            db=db,
            dashboard_ids=[dashboard_id],
            new_status=status,
            user_id=user_id,
            user_role=user_role,
        )

        # 결과 확인
        if results and results[0].get("success"):
            logger.info(
                f"주문 상태 변경 성공(Form): id={dashboard_id}, new_status={status}"
            )
            # 성공 시 해당 주문 상세 페이지로 리다이렉트
            return RedirectResponse(
                url=f"/orders/{dashboard_id}", status_code=status.HTTP_302_FOUND
            )
        else:
            error_message = results[0].get("message") if results else "알 수 없는 오류"
            logger.error(
                f"주문 상태 변경 서비스 실패: id={dashboard_id}, message={error_message}"
            )
            # TODO: 오류 메시지(예: 규칙 위반, 락 문제 등)를 포함하여 상세 페이지로 리다이렉트
            raise HTTPException(
                status_code=400, detail=f"상태 변경 실패: {error_message}"
            )  # 400 Bad Request 또는 상황에 맞는 코드

    except HTTPException as http_exc:
        logger.warning(
            f"주문 상태 변경 서비스 오류 (HTTPException): id={dashboard_id}, status={http_exc.status_code}, detail={http_exc.detail}"
        )
        raise http_exc
    except Exception as e:
        logger.error(
            f"주문 상태 변경(Form) 중 예상치 못한 오류: {str(e)}", exc_info=True
        )
        raise HTTPException(status_code=500, detail="상태 변경 중 오류 발생")


# --- 기사 배정 (Form 방식) ---
@router.post(
    "/orders/{dashboard_id}/driver",
    status_code=status.HTTP_302_FOUND,
    response_class=RedirectResponse,
)
async def assign_driver_form(
    request: Request,
    dashboard_id: int = Path(..., ge=1, description="기사 배정할 주문 ID"),
    db: Session = Depends(get_db),
    # current_user: Dict[str, Any] = Depends(get_current_user),
    driver_name: str = Form(...),
    driver_contact: Optional[str] = Form(None),  # 선택 필드
):
    """
    기사 배정 처리 (Form 데이터 사용)
    서비스 레벨에서 락(Lock) 처리.
    """
    current_user = request.session.get("user")
    user_id = current_user.get("user_id")
    logger.info(
        f"기사 배정 요청(Form): id={dashboard_id}, driver={driver_name}, user={user_id}"
    )

    try:
        # 서비스 함수 호출 (assign_driver는 락 처리 포함)
        results = assign_driver(
            db=db,
            dashboard_ids=[dashboard_id],
            driver_name=driver_name,
            driver_contact=driver_contact,
            user_id=user_id,
        )

        # 결과 확인
        if results and results[0].get("success"):
            logger.info(
                f"기사 배정 성공(Form): id={dashboard_id}, driver={driver_name}"
            )
            # 성공 시 해당 주문 상세 페이지로 리다이렉트
            return RedirectResponse(
                url=f"/orders/{dashboard_id}", status_code=status.HTTP_302_FOUND
            )
        else:
            error_message = results[0].get("message") if results else "알 수 없는 오류"
            logger.error(
                f"기사 배정 서비스 실패: id={dashboard_id}, message={error_message}"
            )
            # TODO: 오류 메시지(예: 락 문제 등)를 포함하여 상세 페이지로 리다이렉트
            raise HTTPException(
                status_code=400, detail=f"기사 배정 실패: {error_message}"
            )

    except HTTPException as http_exc:
        logger.warning(
            f"기사 배정 서비스 오류 (HTTPException): id={dashboard_id}, status={http_exc.status_code}, detail={http_exc.detail}"
        )
        raise http_exc
    except Exception as e:
        logger.error(f"기사 배정(Form) 중 예상치 못한 오류: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="기사 배정 중 오류 발생")


# === 주문 락 상태 확인 API (JSON) ===
@router.get("/lock/order/{dashboard_id}")
async def check_order_lock_api(
    request: Request,
    dashboard_id: int = Path(..., ge=1, description="락 상태 확인할 주문 ID"),
    db: Session = Depends(get_db),
    # current_user: Dict[str, Any] = Depends(get_current_user) # 라우터 레벨 의존성으로 처리됨
):
    """
    주문 락 상태 확인 API
    """
    current_user = request.session.get("user")
    user_id = current_user.get("user_id")
    logger.info(f"주문 락 상태 확인 API 요청: id={dashboard_id}, user={user_id}")

    try:
        # 서비스 함수 호출
        lock_status = get_lock_status(db=db, dashboard_id=dashboard_id, user_id=user_id)
        logger.info(
            f"주문 락 상태 확인 완료: id={dashboard_id}, editable={lock_status.get('editable')}"
        )
        # 서비스에서 반환된 딕셔너리를 그대로 JSON 응답
        return lock_status

    except HTTPException as http_exc:
        logger.warning(
            f"주문 락 상태 확인 오류 (HTTPException): id={dashboard_id}, status={http_exc.status_code}, detail={http_exc.detail}"
        )
        raise http_exc
    except Exception as e:
        logger.error(f"주문 락 상태 확인 API 오류: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "락 상태 확인 중 오류 발생"},
        )


# === 불필요 라우터 제거 ===
# ... (주석 처리됨) ...
