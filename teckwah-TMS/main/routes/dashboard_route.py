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


from main.models.dashboard_model import Dashboard

@router.get("/dashboard")
async def dashboard_page(
    request: Request,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """
    날짜 기반 대시보드 조회 (기본 대시보드 페이지)
    """
    # 함수 진입점 로깅
    logger.info(f"dashboard_page 시작: 매개변수={{'page': {page}, 'page_size': {page_size}, 'start_date': {start_date}, 'end_date': {end_date}}}")
    
    try:
        # 세션에서 사용자 정보 확인
        user = request.session.get("user")
        logger.debug(f"대시보드 접근 - 세션 정보: {user}")

        if not user:
            logger.warning("인증되지 않은 사용자의 대시보드 접근 시도")
            # 중간 포인트 로깅 - 인증 실패
            logger.info("dashboard_page 종료: 인증 실패로 로그인 페이지로 리다이렉트")
            return RedirectResponse(
                url="/login?return_to=/dashboard", status_code=status.HTTP_303_SEE_OTHER
            )

        # 기본값 설정
        today = datetime.now().date()
        logger.debug(f"현재 날짜: {today}")

        # 날짜 범위 설정
        start_date_obj = None
        end_date_obj = None

        # 날짜 파싱 로깅
        logger.debug(f"날짜 파싱 시작: start_date={start_date}, end_date={end_date}")
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
                logger.debug(f"시작 날짜 파싱 성공: {start_date} -> {start_date_obj}")
            except ValueError:
                logger.warning(f"잘못된 시작 날짜 형식: {start_date}")

        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
                logger.debug(f"종료 날짜 파싱 성공: {end_date} -> {end_date_obj}")
            except ValueError:
                logger.warning(f"잘못된 종료 날짜 형식: {end_date}")

        # 날짜 범위 조정 로직
        logger.debug(f"날짜 범위 조정 전: start_date_obj={start_date_obj}, end_date_obj={end_date_obj}")
        
        # 날짜 범위가 없으면 오늘 날짜 사용
        if not start_date_obj and not end_date_obj:
            start_date_obj = today
            end_date_obj = today
            logger.debug(f"날짜 미지정: 오늘 날짜로 설정 ({today})")
        elif start_date_obj and not end_date_obj:
            end_date_obj = start_date_obj  # 시작일만 있으면 종료일도 같게 설정
            logger.debug(f"종료일 미지정: 시작일로 설정 ({start_date_obj})")
        elif not start_date_obj and end_date_obj:
            start_date_obj = end_date_obj  # 종료일만 있으면 시작일도 같게 설정
            logger.debug(f"시작일 미지정: 종료일로 설정 ({end_date_obj})")
            
        logger.debug(f"날짜 범위 조정 완료: {start_date_obj} ~ {end_date_obj}")

        # 주문 데이터 조회 전 로깅
        logger.debug(f"DB 쿼리 시작: 주문 목록 조회 (날짜: {start_date_obj} ~ {end_date_obj}, 페이지: {page}/{page_size})")
        
        # 주문 데이터 조회
        orders, pagination, stats = get_dashboard_list(
            db=db,
            start_date=start_date_obj,
            end_date=end_date_obj,
            page=page,
            page_size=page_size,
        )

        # 중요 중간 포인트 로깅
        logger.info(
            f"날짜 범위 조회: {start_date_obj} ~ {end_date_obj}, 결과: {len(orders)}건"
        )
        logger.debug(f"DB 쿼리 결과: 총={pagination.get('total', 0)}건, 현재 페이지={pagination.get('current', 0)}/{pagination.get('total_pages', 0)}")

        # 데이터 가공
        orders_data = format_order_list(orders)

        # 템플릿에 전달할 날짜 문자열 형식으로 변환
        start_date_str = start_date_obj.strftime("%Y-%m-%d")
        end_date_str = end_date_obj.strftime("%Y-%m-%d")

        # 세션이 있는 경우 대시보드 페이지 렌더링 (초기 데이터 포함)
        logger.info(
            f"대시보드 페이지 접근: {user.get('user_id', 'N/A')}, 데이터: {len(orders_data)}건"
        )
        
        initial_data = {
            "orders": orders_data,
            "pagination": pagination,
            "stats": stats,
            "today": start_date_str,
            "end_date": end_date_str,
            "search_mode": "date",
            "order_no": "",
        }
        
        # 템플릿 렌더링 로깅
        logger.debug(f"템플릿 렌더링 시작: dashboard.html, 사용자={user.get('user_id', 'N/A')}")
        
        # 함수 종료 로깅
        logger.info(f"dashboard_page 완료: 결과=성공, 데이터={len(orders_data)}건")
        
        return templates.TemplateResponse(
            "dashboard.html",
            {
                "request": request,
                "user": user,
                "initial_data": initial_data,
            },
        )
    except Exception as e:
        # 오류 상세 로깅
        logger.error(f"대시보드 페이지 렌더링 중 오류 발생: {str(e)}", exc_info=True)
        
        # 함수 종료 로깅 (오류 발생)
        logger.info(f"dashboard_page 완료: 결과=오류, 메시지={str(e)[:100]}")
        
        return render_error_response(request, str(e))


@router.get("/dashboard/search")
async def search_order_page(
    request: Request,
    order_no: str,
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    """
    주문번호 검색 전용 엔드포인트 (간소화된 검색 기능)
    """
    # 함수 진입점 로깅
    logger.info(f"search_order_page 시작: 매개변수={{'order_no': '{order_no}', 'page': {page}, 'page_size': {page_size}}}")
    
    try:
        # 세션에서 사용자 정보 확인
        user = request.session.get("user")
        logger.debug(f"주문번호 검색 접근 - 세션 정보: {user}")

        if not user:
            logger.warning("인증되지 않은 사용자의 검색 접근 시도")
            # 중간 포인트 로깅 - 인증 실패
            logger.info("search_order_page 종료: 인증 실패로 로그인 페이지로 리다이렉트")
            return RedirectResponse(
                url="/login?return_to=/dashboard/search", status_code=status.HTTP_303_SEE_OTHER
            )

        # 주문번호로 간단히 검색
        logger.info(f"주문번호 검색 시작: {order_no}")
        logger.debug(f"DB 쿼리 시작: 주문번호 검색 (검색어: '{order_no}')")
        
        # 간소화된 검색 쿼리
        logger.debug(f"SQL 쿼리 실행: SELECT * FROM dashboard WHERE order_no LIKE '%{order_no}%'")
        query = db.query(Dashboard).filter(Dashboard.order_no.ilike(f"%{order_no}%"))
        orders = query.all()
        
        # 쿼리 결과 로깅
        logger.debug(f"DB 쿼리 결과: 검색어='{order_no}', 결과={len(orders)}건")
        
        # 단순 페이지네이션 생성
        total = len(orders)
        total_pages = max(1, (total + page_size - 1) // page_size)  # 올림 연산
        
        # 페이지네이션 로깅
        logger.debug(f"페이지네이션 계산: 총={total}건, 페이지 크기={page_size}, 총 페이지={total_pages}")
        
        pagination = {
            "total": total,
            "page_size": page_size,
            "current": min(page, total_pages),  # 현재 페이지가 총 페이지 수를 넘지 않도록
            "total_pages": total_pages,
            "start": (page - 1) * page_size,
            "end": min(page * page_size, total),
        }
        
        # 중간 포인트 로깅
        logger.debug(f"페이지네이션 적용: 현재 페이지={pagination['current']}, 범위={pagination['start']}-{pagination['end']}")
        
        # 간단한 통계
        stats = {
            "total": total,
            "waiting": sum(1 for o in orders if o.status == "WAITING"),
            "in_progress": sum(1 for o in orders if o.status == "IN_PROGRESS"),
            "complete": sum(1 for o in orders if o.status == "COMPLETE"),
            "issue": sum(1 for o in orders if o.status == "ISSUE"),
            "cancel": sum(1 for o in orders if o.status == "CANCEL"),
        }
        
        # 통계 로깅
        logger.debug(f"주문 상태 통계: {stats}")
        
        # 페이지에 맞게 데이터 슬라이싱
        start = pagination["start"]
        end = pagination["end"]
        paged_orders = orders[start:end]
        
        # 중요 중간 포인트 로깅
        logger.info(f"주문번호 검색 결과: {total}건 (페이지 {page}/{total_pages})")

        # 데이터 가공
        orders_data = format_order_list(paged_orders)

        # 현재 날짜
        today_str = datetime.now().date().strftime("%Y-%m-%d")
        
        initial_data = {
            "orders": orders_data,
            "pagination": pagination,
            "stats": stats,
            "today": today_str,
            "end_date": today_str,
            "search_mode": "order_no",
            "order_no": order_no,
        }
        
        # 템플릿 렌더링 로깅
        logger.debug(f"템플릿 렌더링 시작: dashboard.html, 검색모드=주문번호, 사용자={user.get('user_id', 'N/A')}")
        
        # 함수 종료 로깅
        logger.info(f"search_order_page 완료: 결과=성공, 검색어='{order_no}', 결과={len(orders_data)}건")
        
        # 템플릿에 데이터 전달
        return templates.TemplateResponse(
            "dashboard.html",
            {
                "request": request,
                "user": user,
                "initial_data": initial_data,
            },
        )
    except Exception as e:
        # 상세 오류 로깅
        logger.error(f"주문번호 검색 중 오류 발생: {str(e)}", exc_info=True)
        
        # 함수 종료 로깅 (오류 발생)
        logger.info(f"search_order_page 완료: 결과=오류, 검색어='{order_no}', 메시지={str(e)[:100]}")
        
        return render_error_response(request, str(e))


# 공통 함수들
def format_order_list(orders):
    """주문 목록 데이터 가공"""
    # 함수 진입점 로깅
    logger.debug(f"format_order_list 시작: 주문 개수={len(orders)}")
    
    status_labels = {
        "WAITING": "대기",
        "IN_PROGRESS": "진행",
        "COMPLETE": "완료",
        "ISSUE": "이슈",
        "CANCEL": "취소",
    }
    type_labels = {"DELIVERY": "배송", "RETURN": "회수"}

    # 데이터 처리 시작
    orders_data = []
    date_format_error_count = 0
    
    for order in orders:
        try:
            # datetime 객체를 문자열로 변환 처리
            eta_value = order.eta
            if isinstance(eta_value, datetime):
                eta_value = eta_value.strftime('%Y-%m-%d %H:%M')
                
            # 다른 datetime 필드도 문자열로 변환
            create_time = order.create_time.strftime('%Y-%m-%d %H:%M') if order.create_time else None
            depart_time = order.depart_time.strftime('%Y-%m-%d %H:%M') if order.depart_time else None
            complete_time = order.complete_time.strftime('%Y-%m-%d %H:%M') if order.complete_time else None
            update_at = order.update_at.strftime('%Y-%m-%d %H:%M') if order.update_at else None
            
            order_dict = {
                "dashboardId": order.dashboard_id,
                "orderNo": order.order_no,
                "type": order.type,
                "status": order.status,
                "department": order.department,
                "warehouse": order.warehouse,
                "sla": order.sla,
                "eta": eta_value,
                "region": getattr(order, "region", "") or "",
                "customer": order.customer,
                "driverName": order.driver_name or "",
                "statusLabel": status_labels.get(order.status, order.status),
                "typeLabel": type_labels.get(order.type, order.type),
                "createTime": create_time,
                "departTime": depart_time,
                "completeTime": complete_time,
                "updateAt": update_at
            }
            orders_data.append(order_dict)
        except Exception as e:
            # 날짜 변환 오류 발생 시 처리
            logger.warning(f"주문 데이터 변환 중 오류 발생: 주문번호={getattr(order, 'order_no', 'N/A')}, 오류={str(e)}")
            date_format_error_count += 1
            
            # 최소한의 정보라도 추가
            try:
                orders_data.append({
                    "dashboardId": getattr(order, "dashboard_id", 0),
                    "orderNo": getattr(order, "order_no", "오류"),
                    "type": getattr(order, "type", ""),
                    "status": getattr(order, "status", ""),
                    "error": True
                })
            except:
                # 심각한 오류 시 건너뛰기
                logger.error(f"주문 데이터 변환 중 심각한 오류 발생: {str(e)}")
                continue
    
    # 중간 포인트 로깅
    if date_format_error_count > 0:
        logger.warning(f"날짜 형식 변환 오류 발생: {date_format_error_count}건")
    
    # 함수 종료 로깅
    logger.debug(f"format_order_list 완료: 입력={len(orders)}건, 출력={len(orders_data)}건")
    
    return orders_data


def render_error_response(request, error_message):
    """오류 발생 시 기본 응답 생성"""
    # 함수 진입점 로깅
    logger.info(f"render_error_response 시작: 오류='{error_message[:100]}'")
    
    # 기본 페이지네이션 객체 생성
    empty_pagination = {
        "total": 0,
        "page_size": 10,
        "current": 1,
        "total_pages": 1,
        "start": 0,
        "end": 0,
    }

    # 기본 통계 데이터 생성
    empty_stats = {
        "total": 0,
        "waiting": 0,
        "in_progress": 0,
        "complete": 0,
        "issue": 0,
        "cancel": 0,
    }

    today_str = datetime.now().date().strftime("%Y-%m-%d")
    
    # 빈 데이터 생성 로깅
    logger.debug(f"빈 데이터로 대시보드 렌더링 준비: 날짜={today_str}")
    
    # 중요 중간 포인트 로깅
    logger.info(f"오류 발생 후 기본 응답 생성: 사용자={request.session.get('user', {}).get('user_id', 'N/A')}")
    
    # 오류 메시지 로깅
    error_display = f"데이터 조회 중 오류가 발생했습니다: {error_message}"
    logger.debug(f"사용자에게 표시할 오류 메시지: '{error_display[:100]}'")
    
    # 함수 종료 로깅
    logger.info(f"render_error_response 완료: 빈 대시보드 페이지 렌더링")

    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "user": request.session.get("user"),
            "initial_data": {
                "orders": [],
                "pagination": empty_pagination,
                "stats": empty_stats,
                "today": today_str,
                "end_date": today_str,
                "search_mode": "default",
                "order_no": "",
                "error_message": error_display,
            },
        },
    )

        # 이 중복 코드 블록은 제거합니다 - 이미 위에서 동일한 로직이 실행되었습니다
        # 로그 추가: 데이터 가공 시작
        logger.debug(f"주문 데이터 가공 시작: {len(orders)}건")
        
        # JSON 응답과 동일한 형식으로 데이터 가공
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
            # datetime 객체를 문자열로 변환 처리
            eta_value = order.eta
            if isinstance(eta_value, datetime):
                eta_value = eta_value.strftime('%Y-%m-%d %H:%M')
                
            # 다른 datetime 필드도 문자열로 변환
            create_time = order.create_time.strftime('%Y-%m-%d %H:%M') if order.create_time else None
            depart_time = order.depart_time.strftime('%Y-%m-%d %H:%M') if order.depart_time else None
            complete_time = order.complete_time.strftime('%Y-%m-%d %H:%M') if order.complete_time else None
            update_at = order.update_at.strftime('%Y-%m-%d %H:%M') if order.update_at else None
            
            order_dict = {
                "dashboardId": order.dashboard_id,
                "orderNo": order.order_no,
                "type": order.type,
                "status": order.status,
                "department": order.department,
                "warehouse": order.warehouse,
                "sla": order.sla,
                "eta": eta_value,
                "region": getattr(order, "region", "") or "",
                "customer": order.customer,
                "driverName": order.driver_name or "",
                "statusLabel": status_labels.get(order.status, order.status),
                "typeLabel": type_labels.get(order.type, order.type),
                "createTime": create_time,
                "departTime": depart_time,
                "completeTime": complete_time,
                "updateAt": update_at
            }
            orders_data.append(order_dict)
        
        # 로그 추가: 데이터 가공 완료
        logger.debug(f"주문 데이터 가공 완료: {len(orders_data)}건")

        # 템플릿에 전달할 날짜 문자열 형식으로 변환
        start_date_str = start_date_obj.strftime("%Y-%m-%d")
        end_date_str = end_date_obj.strftime("%Y-%m-%d")

        # 세션이 있는 경우 대시보드 페이지 렌더링 (초기 데이터 포함)
        logger.info(
            f"대시보드 페이지 접근: {user.get('user_id', 'N/A')}, 데이터: {len(orders_data)}건"
        )
        return templates.TemplateResponse(
            "dashboard.html",
            {
                "request": request,
                "user": user,
                "initial_data": {
                    "orders": orders_data,
                    "pagination": pagination,
                    "stats": stats,
                    "today": start_date_str,
                    "end_date": end_date_str,
                    "search_mode": search_mode,
                    "order_no": order_no or "",
                },
                "debug": True,
            },
        )
    except Exception as e:
        logger.error(f"대시보드 페이지 렌더링 중 오류 발생: {str(e)}", exc_info=True)
        
        # 오류의 상세 정보 로깅
        import traceback
        error_traceback = traceback.format_exc()
        logger.error(f"오류 상세 정보: {error_traceback}")
        
        # 오류가 발생해도 리다이렉트하지 않고 빈 데이터로 대시보드 페이지를 렌더링
        # 기본 페이지네이션 객체 생성
        empty_pagination = {
            "total": 0,
            "page_size": 10,
            "current": 1,
            "total_pages": 1,
            "start": 0,
            "end": 0,
        }

        # 기본 통계 데이터 생성
        empty_stats = {
            "total": 0,
            "waiting": 0,
            "in_progress": 0,
            "complete": 0,
            "issue": 0,
            "cancel": 0,
        }

        today_str = datetime.now().date().strftime("%Y-%m-%d")
        
        # 중요 중간 포인트 로깅
        logger.info(f"오류 발생 후 기본 응답 생성: 사용자={request.session.get('user', {}).get('user_id', 'N/A')}")
        
        # 초기 데이터 로깅 (디버깅용)
        today_str = datetime.now().date().strftime("%Y-%m-%d")
        initial_data = {
            "orders": [],
            "pagination": empty_pagination,
            "stats": empty_stats,
            "today": today_str,
            "end_date": today_str,
            "search_mode": "default",
            "order_no": "",
            "error_message": f"데이터 조회 중 오류가 발생했습니다: {str(e)}",
        }
        logger.debug(f"템플릿 전달 데이터: {str(initial_data)[:200]}...")

        return templates.TemplateResponse(
            "dashboard.html",
            {
                "request": request,
                "user": request.session.get("user"),
                "initial_data": {
                    "orders": [],
                    "pagination": empty_pagination,
                    "stats": empty_stats,
                    "today": today_str,
                    "end_date": today_str,
                    "search_mode": "default",
                    "order_no": "",
                    "error_message": f"데이터 조회 중 오류가 발생했습니다: {str(e)}",
                },
                "debug": True,
            },
        )


@router.get("/dashboard/list", response_model=DashboardListResponse)
async def get_dashboard_list_api(
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
    대시보드 목록 조회 API (JSON)
    """
    # 함수 진입점 로깅 - 자세한 매개변수 정보 포함
    logger.info(f"get_dashboard_list_api 시작: 매개변수={{'start_date': {start_date}, 'end_date': {end_date}, 'status': {status}, 'department': {department}, 'warehouse': {warehouse}}}")
    logger.debug(f"API 요청 세부정보: 사용자={current_user.get('user_id', 'N/A')}, 페이지={page}/{page_size}")
    
    # 중간 포인트 로깅 - DB 쿼리 전
    logger.debug(f"DB 쿼리 시작: 대시보드 목록 조회")
    
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
    
    # 중간 포인트 로깅 - DB 쿼리 결과
    logger.debug(f"DB 쿼리 결과: 주문={len(orders)}건, 총={pagination.get('total', 0)}건")
    
    # 상태별 개수 로깅 - 주요 통계 정보
    logger.debug(f"주문 상태 통계: 대기={stats.get('waiting', 0)}, 진행={stats.get('in_progress', 0)}, 완료={stats.get('complete', 0)}, 이슈={stats.get('issue', 0)}, 취소={stats.get('cancel', 0)}건")

    # 응답 데이터 가공 - 필요한 컬럼만 포함하여 최적화
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
            "dashboardId": order.dashboard_id,  # ID는 상세 페이지 이동을 위해 필요
            "orderNo": order.order_no,
            "type": order.type,
            "status": order.status,
            "department": order.department,
            "warehouse": order.warehouse,
            "sla": order.sla,
            "eta": order.eta,
            "region": order.region or "",
            "customer": order.customer,
            "driverName": order.driver_name or "",
            "statusLabel": status_labels.get(order.status, order.status),
            "typeLabel": type_labels.get(order.type, order.type),
        }
        orders_data.append(order_dict)

    # 응답 데이터 로깅
    logger.debug(f"API 응답 데이터 준비 완료: {len(orders_data)}건")
    
    # 함수 종료 로깅
    logger.info(f"get_dashboard_list_api 완료: 결과=성공, 데이터={len(orders_data)}건")
    
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
    try:
        # 주문 검색
        orders, pagination, stats = search_dashboard_by_order_no(
            db=db, order_no=order_no, page=page, page_size=page_size
        )

        # 응답 데이터 가공 - 검색 결과도 동일하게 최적화
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
            # datetime 객체를 문자열로 변환 처리
            eta_value = order.eta
            if isinstance(eta_value, datetime):
                eta_value = eta_value.strftime('%Y-%m-%d %H:%M')
                
            # 다른 datetime 필드도 문자열로 변환
            create_time = order.create_time.strftime('%Y-%m-%d %H:%M') if order.create_time else None
            depart_time = order.depart_time.strftime('%Y-%m-%d %H:%M') if order.depart_time else None
            complete_time = order.complete_time.strftime('%Y-%m-%d %H:%M') if order.complete_time else None
            update_at = order.update_at.strftime('%Y-%m-%d %H:%M') if order.update_at else None
            
            order_dict = {
                "dashboardId": order.dashboard_id,
                "orderNo": order.order_no,
                "type": order.type,
                "status": order.status,
                "department": order.department,
                "warehouse": order.warehouse,
                "sla": order.sla,
                "eta": eta_value,
                "region": getattr(order, "region", "") or "",
                "customer": order.customer,
                "driverName": order.driver_name or "",
                "statusLabel": status_labels.get(order.status, order.status),
                "typeLabel": type_labels.get(order.type, order.type),
                "createTime": create_time,
                "departTime": depart_time,
                "completeTime": complete_time,
                "updateAt": update_at
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
    except Exception as e:
        logger.error(f"주문번호 검색 중 오류 발생: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "검색 중 오류가 발생했습니다."},
        )


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
    try:
        logger.info(f"get_order_detail 시작: 주문ID={dashboard_id}, 사용자={current_user.get('user_id')}")
        
        # 주문 정보 조회
        logger.debug(f"DB 쿼리 시작: 주문ID={dashboard_id} 상세 조회")
        order = get_dashboard_by_id(db, dashboard_id)

        if not order:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"success": False, "message": "주문을 찾을 수 없습니다."},
            )

        # 락 상태 확인
        logger.debug(f"락 상태 확인: 주문ID={dashboard_id}, 사용자={current_user.get('user_id')}")
        lock_status = get_lock_status(db, dashboard_id, current_user.get("user_id"))
        is_editable = lock_status.get("editable", False)

        # 서비스 레이어에서 응답 데이터 생성
        order_data = get_dashboard_response_data(order, is_editable)

        # 표준화된 응답 구조로 반환
        logger.info(f"get_order_detail 완료: 주문ID={dashboard_id}, 결과=성공")
        return {"success": True, "message": "주문 상세 조회 성공", "data": order_data}
    except Exception as e:
        logger.error(f"주문 상세 조회 중 오류 발생: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "서버 오류가 발생했습니다."},
        )


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
        logger.info(f"update_order 시작: 주문ID={dashboard_id}, 사용자={current_user.get('user_id')}")
        logger.debug(f"업데이트 데이터: {order_data}")
        
        # 주문 업데이트
        logger.debug(f"DB 업데이트 시작: 주문ID={dashboard_id}")
        updated_order = update_dashboard(
            db=db,
            dashboard_id=dashboard_id,
            data=order_data,
            user_id=current_user.get("user_id"),
        )

        logger.info(f"update_order 완료: 주문ID={dashboard_id}, 결과=성공")
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
