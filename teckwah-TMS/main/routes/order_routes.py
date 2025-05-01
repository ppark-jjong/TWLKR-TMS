"""
주문 상세 페이지 라우터
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, status, Path, Form
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import logging

from main.core.templating import templates
from main.utils.database import get_db
from main.utils.security import get_current_user, get_admin_user
from main.utils.permission import get_status_options
from main.service.dashboard_service import (
    get_dashboard_by_id,
    delete_dashboard,
    get_lock_status,
)

logger = logging.getLogger(__name__)

# 라우터 생성
router = APIRouter(prefix="/orders")


@router.get("/{dashboard_id}")
async def order_detail_page(
    request: Request,
    dashboard_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    주문 상세 페이지 렌더링
    """
    # 함수 진입점 로깅
    logging.info(
        f"order_detail_page 시작: dashboard_id={dashboard_id}, 사용자={current_user.get('user_id')}"
    )

    try:
        # 주문 정보 조회
        logging.debug(f"DB 쿼리 시작: 주문 ID={dashboard_id} 상세 조회")

        order = get_dashboard_by_id(db, dashboard_id)
        if not order:
            logging.warning(f"존재하지 않는 주문 조회 시도: ID={dashboard_id}")
            return RedirectResponse(
                url="/dashboard?error=주문을 찾을 수 없습니다",
                status_code=status.HTTP_303_SEE_OTHER,
            )

        # 락 상태 확인
        logging.debug(
            f"락 상태 확인: 주문 ID={dashboard_id}, 사용자={current_user.get('user_id')}"
        )
        lock_status = get_lock_status(db, dashboard_id, current_user.get("user_id"))

        # 상태 레이블 및 유형 레이블 매핑
        status_labels = {
            "WAITING": "대기",
            "IN_PROGRESS": "진행",
            "COMPLETE": "완료",
            "ISSUE": "이슈",
            "CANCEL": "취소",
        }
        type_labels = {"DELIVERY": "배송", "RETURN": "회수"}

        # 응답 데이터 가공
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

        # 중간 포인트 로깅
        logging.debug(f"템플릿 렌더링 시작: order_page.html, 주문={order.order_no}")

        # 함수 종료 로깅
        logging.info(f"order_detail_page 완료: 결과=성공, 주문={order.order_no}")

        # 템플릿 렌더링
        return templates.TemplateResponse(
            "order_page.html",
            {
                "request": request,
                "user": current_user,
                "order": order_data,
                "lock_status": lock_status,
            },
        )

    except Exception as e:
        logging.error(f"주문 상세 페이지 렌더링 중 오류 발생: {str(e)}", exc_info=True)

        # 함수 종료 로깅 (오류 발생)
        logging.info(f"order_detail_page 완료: 결과=오류, 메시지={str(e)[:100]}")

        return RedirectResponse(
            url="/dashboard?error=주문 정보를 불러오는 중 오류가 발생했습니다",
            status_code=status.HTTP_303_SEE_OTHER,
        )


@router.get("/create")
async def order_create_page(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    주문 생성 페이지 렌더링
    """
    # 함수 진입점 로깅
    logging.info(f"order_create_page 시작: 사용자={current_user.get('user_id')}")

    try:
        # 중간 포인트 로깅
        logging.debug(f"템플릿 렌더링 시작: order_create.html")

        # 함수 종료 로깅
        logging.info(f"order_create_page 완료: 결과=성공")

        # 템플릿 렌더링
        return templates.TemplateResponse(
            "order_create.html",
            {
                "request": request,
                "user": current_user,
            },
        )

    except Exception as e:
        logging.error(f"주문 생성 페이지 렌더링 중 오류 발생: {str(e)}", exc_info=True)

        # 함수 종료 로깅 (오류 발생)
        logging.info(f"order_create_page 완료: 결과=오류, 메시지={str(e)[:100]}")

        return RedirectResponse(
            url="/dashboard?error=페이지를 불러오는 중 오류가 발생했습니다",
            status_code=status.HTTP_303_SEE_OTHER,
        )


@router.get("/{dashboard_id}/edit")
async def order_edit_page(
    request: Request,
    dashboard_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    주문 수정 페이지 렌더링
    """
    # 함수 진입점 로깅
    logging.info(
        f"order_edit_page 시작: dashboard_id={dashboard_id}, 사용자={current_user.get('user_id')}"
    )

    try:
        # 주문 정보 조회
        logging.debug(f"DB 쿼리 시작: 주문 ID={dashboard_id} 상세 조회")

        order = get_dashboard_by_id(db, dashboard_id)
        if not order:
            logging.warning(f"존재하지 않는 주문 수정 시도: ID={dashboard_id}")
            return RedirectResponse(
                url="/dashboard?error=주문을 찾을 수 없습니다",
                status_code=status.HTTP_303_SEE_OTHER,
            )

        # 락 상태 확인
        logging.debug(
            f"락 상태 확인: 주문 ID={dashboard_id}, 사용자={current_user.get('user_id')}"
        )
        lock_status = get_lock_status(db, dashboard_id, current_user.get("user_id"))

        # 수정 권한 확인
        if not lock_status.get("editable", False):
            logging.warning(
                f"락 획득 실패로 수정 불가: 주문 ID={dashboard_id}, 사용자={current_user.get('user_id')}"
            )
            return RedirectResponse(
                url=f"/orders/{dashboard_id}?error=현재 다른 사용자가 수정 중입니다",
                status_code=status.HTTP_303_SEE_OTHER,
            )

        # 상태 레이블 및 유형 레이블 매핑
        status_labels = {
            "WAITING": "대기",
            "IN_PROGRESS": "진행",
            "COMPLETE": "완료",
            "ISSUE": "이슈",
            "CANCEL": "취소",
        }
        type_labels = {"DELIVERY": "배송", "RETURN": "회수"}

        # 응답 데이터 가공
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

        # 상태 변경 옵션 구성
        status_options = get_status_options(current_user, order.status)

        # 중간 포인트 로깅
        logging.debug(f"상태 변경 옵션: {status_options}")
        logging.debug(f"템플릿 렌더링 시작: order_edit.html, 주문={order.order_no}")

        # 함수 종료 로깅
        logging.info(f"order_edit_page 완료: 결과=성공, 주문={order.order_no}")

        # 템플릿 렌더링
        return templates.TemplateResponse(
            "order_edit.html",
            {
                "request": request,
                "user": current_user,
                "order": order_data,
                "lock_status": lock_status,
                "status_options": status_options,
            },
        )

    except Exception as e:
        logging.error(f"주문 수정 페이지 렌더링 중 오류 발생: {str(e)}", exc_info=True)

        # 함수 종료 로깅 (오류 발생)
        logging.info(f"order_edit_page 완료: 결과=오류, 메시지={str(e)[:100]}")

        return RedirectResponse(
            url="/dashboard?error=페이지를 불러오는 중 오류가 발생했습니다",
            status_code=status.HTTP_303_SEE_OTHER,
        )


@router.post("/{dashboard_id}/delete")
async def delete_order_action(
    request: Request,
    dashboard_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_admin_user),  # 관리자만 삭제 가능
):
    """
    주문 삭제 액션 처리
    """
    # 함수 진입점 로깅
    logging.info(
        f"delete_order_action 시작: dashboard_id={dashboard_id}, 사용자={current_user.get('user_id')}"
    )

    try:
        # 주문 삭제
        logging.debug(f"DB 삭제 시작: 주문 ID={dashboard_id}")

        result = delete_dashboard(
            db=db,
            dashboard_ids=[dashboard_id],
            user_id=current_user.get("user_id"),
            user_role=current_user.get("user_role"),
        )

        # 결과 확인
        success = any(r.get("success", False) for r in result)

        if success:
            # 함수 종료 로깅 (성공)
            logging.info(f"delete_order_action 완료: 결과=성공, ID={dashboard_id}")

            return RedirectResponse(
                url="/dashboard?success=주문이 성공적으로 삭제되었습니다",
                status_code=status.HTTP_303_SEE_OTHER,
            )
        else:
            error_message = next(
                (
                    r.get("message", "삭제 실패")
                    for r in result
                    if not r.get("success", False)
                ),
                "삭제 실패",
            )

            # 함수 종료 로깅 (실패)
            logging.warning(
                f"delete_order_action 완료: 결과=실패, ID={dashboard_id}, 메시지={error_message}"
            )

            return RedirectResponse(
                url=f"/orders/{dashboard_id}?error={error_message}",
                status_code=status.HTTP_303_SEE_OTHER,
            )

    except Exception as e:
        logging.error(f"주문 삭제 중 오류 발생: {str(e)}", exc_info=True)

        # 함수 종료 로깅 (오류 발생)
        logging.info(f"delete_order_action 완료: 결과=오류, 메시지={str(e)[:100]}")

        return RedirectResponse(
            url=f"/orders/{dashboard_id}?error=주문 삭제 중 오류가 발생했습니다",
            status_code=status.HTTP_303_SEE_OTHER,
        )
