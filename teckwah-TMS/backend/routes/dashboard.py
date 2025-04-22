"""
대시보드(주문) 관련 라우트
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from backend.utils.logger import logger
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

from backend.database import get_db
from backend.models.dashboard import (
    Dashboard,
    OrderCreate,
    OrderUpdate,
    OrderResponse,
    OrderStatusUpdate,
    DriverAssign,
    OrderStatus,
    OrderFilter,
    OrderDeleteMultiple,
    OrderListResponse,
    GetOrderResponse,
    LockResponse,
    BasicSuccessResponse,
    DeleteMultipleResponse,
    StatusUpdateMultipleResponse,
    AssignDriverResponse,
    AssignDriverResponseData,
    GetOrderResponseData,
)
from backend.middleware.auth import get_current_user, admin_required
from backend.models.user import UserRole
from backend.utils.lock import (
    acquire_lock,
    release_lock,
    validate_lock,
    check_lock_status,
)
from backend.services.dashboard_service import (
    get_dashboard_orders as service_get_dashboard_orders,
    create_order as service_create_order,
    update_order as service_update_order,
    delete_order as service_delete_order,
    delete_multiple_orders as service_delete_multiple_orders,
    update_multiple_orders_status as service_update_multiple_orders_status,
    assign_driver_to_orders as service_assign_driver_to_orders,
)

router = APIRouter()


@router.get("/list", response_model=OrderListResponse)
async def get_dashboard_orders(
    start_date: Optional[str] = Query(
        None, alias="startDate", description="조회 시작일 (YYYY-MM-DD HH:MM:SS)"
    ),
    end_date: Optional[str] = Query(
        None, alias="endDate", description="조회 종료일 (YYYY-MM-DD HH:MM:SS)"
    ),
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(10, ge=1, le=100, description="페이지당 항목 수"),
    order_no: Optional[str] = Query(None, description="주문 번호", alias="orderNo"),
    status: Optional[str] = Query(None, description="주문 상태", alias="status"),
    department: Optional[str] = Query(None, description="부서", alias="department"),
    warehouse: Optional[str] = Query(None, description="창고", alias="warehouse"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderListResponse:
    """
    대시보드 주문 목록 조회 (response_model 사용) + 디버깅 로그 추가
    """
    # --- [로그 1] 라우트 핸들러 시작 및 수신 파라미터 로깅 ---
    logger.debug(f"라우트 get_dashboard_orders 시작")
    logger.debug(
        f"  수신 파라미터: start_date='{start_date}', end_date='{end_date}', page={page}, limit={limit}, "
        f"order_no='{order_no}', status='{status}', department='{department}', warehouse='{warehouse}', "
        f"user_id='{current_user.get('user_id')}'"
    )
    # -------------------------------------------------------

    # --- [로그 2] 서비스 함수 호출 직전 파라미터 로깅 ---
    service_params = {
        "db": "Session object",  # 실제 객체 로깅은 생략
        "start_date": start_date,
        "end_date": end_date,
        "page": page,
        "limit": limit,
        "order_no": order_no,
        "status": status,
        "department": department,
        "warehouse": warehouse,
        "current_user_id": current_user["user_id"],
    }
    logger.debug(
        f"서비스 service_get_dashboard_orders 호출 전 파라미터: {service_params}"
    )
    # ---------------------------------------------------

    # 서비스 레이어 호출
    try:
        response_data_dict = service_get_dashboard_orders(
            db=db,
            start_date=start_date,
            end_date=end_date,
            page=page,
            limit=limit,
            order_no=order_no,
            status=status,
            department=department,
            warehouse=warehouse,
            current_user_id=current_user["user_id"],
        )
    except Exception as service_exc:
        logger.error(
            f"서비스 service_get_dashboard_orders 호출 중 오류 발생: {service_exc}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="주문 목록 조회 서비스 오류")

    # --- [로그 6] 서비스 함수 반환 결과 로깅 ---
    # 서비스 반환값이 클 수 있으므로, 구조나 주요 값 위주로 로깅
    if isinstance(response_data_dict, dict):
        log_data_summary = {
            k: type(v) if k == "data" else v for k, v in response_data_dict.items()
        }
        if "data" in response_data_dict and isinstance(
            response_data_dict["data"], dict
        ):
            log_data_summary["data_summary"] = {
                "items_type": type(response_data_dict["data"].get("items")),
                "items_len": (
                    len(response_data_dict["data"].get("items", []))
                    if isinstance(response_data_dict["data"].get("items"), list)
                    else "N/A"
                ),
                "total": response_data_dict["data"].get("total"),
                "page": response_data_dict["data"].get("page"),
                "limit": response_data_dict["data"].get("limit"),
                "statusCounts_type": type(
                    response_data_dict["data"].get("statusCounts")
                ),
                "filter_type": type(response_data_dict["data"].get("filter")),
            }
        logger.debug(
            f"서비스 service_get_dashboard_orders 반환 결과 (요약): {log_data_summary}"
        )
    else:
        logger.debug(
            f"서비스 service_get_dashboard_orders 반환 결과 타입: {type(response_data_dict)}"
        )
        logger.warning(
            f"서비스 service_get_dashboard_orders가 예상된 dict 형식이 아님: {response_data_dict}"
        )  # 예상치 못한 타입일 경우 값도 로깅
    # -------------------------------------------

    # --- 기존 로깅 보강 (response_model 변환 전) ---
    # logger.debug(
    #     f"서비스 반환 데이터 구조 (타입: {type(response_data_dict)}): {response_data_dict}"
    # ) # 전체 로깅은 너무 클 수 있으므로 주석 처리 또는 위 요약 로그로 대체
    if isinstance(response_data_dict, dict) and "data" in response_data_dict:
        data_part = response_data_dict["data"]
        raw_items = data_part.get("items", []) if isinstance(data_part, dict) else []
        logger.debug(f"Pydantic 변환 전 raw_items 개수: {len(raw_items)}")  # 개수 로깅
        # 모든 아이템 로깅은 과도하므로 주석 처리하거나 첫 몇개만 로깅
        # for i, item in enumerate(raw_items):
        #     logger.debug(
        #         f"  Item {i} (타입: {type(item)}): ID={getattr(item, 'dashboard_id', 'N/A')}, OrderNo={getattr(item, 'order_no', 'N/A')}, ..."
        #     )
    # ---------------------------------------

    # 서비스가 Pydantic 모델 객체를 반환하는 경우 바로 반환 (이 경로는 현재 로직상 거의 없음)
    if isinstance(response_data_dict, OrderListResponse):
        logger.debug("서비스가 OrderListResponse 객체를 반환하여 바로 사용.")
        # --- [로그 7] 최종 응답 반환 직전 로깅 ---
        log_final_response(response_data_dict)  # 공통 로깅 함수 호출
        # ---------------------------------------
        return response_data_dict
    # 서비스가 딕셔너리를 반환하는 경우 (주요 경로)
    elif isinstance(response_data_dict, dict):
        try:
            logger.debug(
                "서비스가 딕셔너리를 반환. FastAPI의 response_model을 통해 Pydantic 변환/검증 시도."
            )
            # FastAPI가 response_model을 사용하여 딕셔너리를 OrderListResponse로 자동 변환 및 검증
            # --- [로그 7] 최종 응답 반환 직전 로깅 ---
            # FastAPI 자동 변환 전에 로깅할 수 없으므로, 변환 성공을 가정하고 구조 로깅
            logger.debug(
                f"FastAPI에 최종 반환될 데이터 구조 예상 (response_model 적용 전 dict): {list(response_data_dict.keys())}"
            )
            if "data" in response_data_dict and isinstance(
                response_data_dict["data"], dict
            ):
                logger.debug(
                    f"  반환될 data 키 구조 예상: {list(response_data_dict['data'].keys())}"
                )
            # ---------------------------------------
            return response_data_dict  # FastAPI가 처리하도록 위임
        except (
            Exception
        ) as e:  # FastAPI의 response_model 변환/검증 실패 시는 FastAPI가 422 또는 500 반환
            # 이 부분은 거의 실행되지 않음. FastAPI 내부 처리.
            logger.error(
                f"FastAPI 응답 모델 처리 중 예상치 못한 오류: {e}", exc_info=True
            )
            raise HTTPException(
                status_code=500, detail="주문 목록 응답 처리 중 오류 발생"
            )
    else:
        logger.error(
            f"서비스에서 예기치 않은 타입 반환: {type(response_data_dict)}. 값: {response_data_dict}"
        )
        raise HTTPException(
            status_code=500, detail="주문 목록 응답 처리 중 내부 오류 발생"
        )


@router.post("/", response_model=OrderResponse)
async def create_order(
    order: OrderCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dashboard:
    """
    새 주문 생성 (response_model 사용)
    """
    new_order = service_create_order(
        db=db, order_data=order.dict(), current_user_id=current_user["user_id"]
    )
    return new_order


@router.get("/{order_id}", response_model=GetOrderResponse)
async def get_order(
    order_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GetOrderResponse:
    """
    특정 주문 조회 (response_model 사용) + 디버깅 로그 추가
    """
    logger.debug(f"라우트 get_order 시작 - order_id: {order_id}")
    # --- [로그 4] DB 조회 직후 로깅 ---
    try:
        order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()
    except Exception as db_exc:
        logger.error(
            f"DB 조회 중 오류 발생 (order_id={order_id}): {db_exc}", exc_info=True
        )
        raise HTTPException(status_code=500, detail="주문 조회 중 DB 오류 발생")

    if not order:
        logger.warning(f"주문 조회 실패 - ID={order_id}, 주문 없음")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다"
        )
    else:
        # ORM 객체 상세 로깅 (Pydantic 변환 전 확인용)
        try:
            order_dict = {
                c.name: getattr(order, c.name, "N/A") for c in order.__table__.columns
            }
            logger.debug(f"DB 조회 결과 (ORM 객체 dict 변환): {order_dict}")
        except Exception as e_dict:
            logger.error(f"  ORM 객체 dict 변환 중 오류: {e_dict}")
            logger.debug(
                f"  DB 조회 결과 (ORM 객체 타입): {type(order)}"
            )  # 타입이라도 로깅
    # ----------------------------------

    # 락 상태 확인
    try:
        lock_status_dict = check_lock_status(
            db, Dashboard, order_id, current_user["user_id"]
        )
        logger.debug(f"락 상태 확인 결과: {lock_status_dict}")
    except Exception as lock_exc:
        logger.error(
            f"락 상태 확인 중 오류 발생 (order_id={order_id}): {lock_exc}",
            exc_info=True,
        )
        # 락 확인 실패 시에도 주문 정보는 반환할 수 있도록 처리 (또는 오류 반환 결정 필요)
        lock_status_dict = {
            "locked": False,
            "editable": False,
            "message": "락 상태 확인 오류",
        }

    # --- [로그 5] Pydantic 모델 변환 시도 및 로깅 ---
    try:
        logger.debug(f"GetOrderResponseData.from_orm 변환 시도")
        # from_orm 대신 model_validate 사용 (Pydantic v2)
        order_resp_data = GetOrderResponseData.model_validate(order)
        logger.debug(
            f"  GetOrderResponseData 변환 성공 (일부): ID={order_resp_data.dashboard_id}, OrderNo={order_resp_data.order_no}"
        )

        # 락 정보는 별도 Pydantic 모델로 변환 후 할당
        try:
            lock_status_model = LockStatus.model_validate(lock_status_dict)
            order_resp_data.locked_info = lock_status_model
            logger.debug(f"  LockStatus 변환 및 할당 성공: {lock_status_model.dict()}")
        except Exception as lock_model_exc:
            logger.error(
                f"LockStatus 모델 변환 실패 (order_id={order_id}): {lock_model_exc}",
                exc_info=True,
            )
            logger.error(f"  실패한 락 데이터: {lock_status_dict}")
            order_resp_data.locked_info = None  # 변환 실패 시 None 할당 또는 오류 처리

        logger.debug(
            f"  최종 order_resp_data (일부): ID={order_resp_data.dashboard_id}, LockedInfo={order_resp_data.locked_info}"
        )

    except ValidationError as ve:
        logger.error(
            f"GetOrderResponseData Pydantic 유효성 검사 실패 (Order ID: {order_id}): {ve.errors()}",
            exc_info=True,
        )
        try:
            failed_data_dict = {
                c.name: getattr(order, c.name, "N/A") for c in order.__table__.columns
            }
            logger.error(f"  유효성 검사 실패한 원본 ORM 데이터: {failed_data_dict}")
        except Exception as e_fail_dict:
            logger.error(f"  실패 데이터 dict 변환 오류: {e_fail_dict}")
        raise HTTPException(
            status_code=422, detail=f"주문 데이터 유효성 검증 실패: {ve.errors()}"
        )
    except Exception as e:
        logger.error(
            f"GetOrderResponseData 변환 중 일반 오류 (Order ID: {order_id}): {e}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="주문 상세 정보 처리 중 오류 발생")
    # -------------------------------------------

    # --- [로그 7] 최종 응답 반환 직전 로깅 ---
    try:
        # 최종 응답 모델 생성
        final_response = GetOrderResponse(data=order_resp_data)
        # 최종 응답 객체 로깅 (요약)
        log_subset = {
            "success": final_response.success,
            "message": final_response.message,
            "data_type": type(final_response.data),
        }
        if final_response.data:
            log_subset["data_summary"] = {
                "dashboard_id": final_response.data.dashboard_id,
                "order_no": final_response.data.order_no,
                "status": final_response.data.status,
                "locked_info_type": type(final_response.data.locked_info),
            }
        logger.debug(f"최종 응답 반환 직전 (GetOrderResponse 객체 요약): {log_subset}")
        return final_response
    except Exception as final_resp_exc:
        logger.error(
            f"최종 GetOrderResponse 생성/로깅 실패: {final_resp_exc}", exc_info=True
        )
        raise HTTPException(status_code=500, detail="주문 상세 응답 생성 중 오류 발생")
    # ---------------------------------------


@router.post("/{order_id}/lock", response_model=LockResponse)
async def lock_order(
    order_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LockResponse:
    """
    주문 락 획득 (response_model 사용)
    """
    order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다"
        )

    # 락 획득 시도
    lock_acquired = acquire_lock(db, Dashboard, order_id, current_user["user_id"])

    if not lock_acquired:
        # 현재 락 상태 확인
        lock_status_data = check_lock_status(
            db, Dashboard, order_id, current_user["user_id"]
        )
        return LockResponse(
            success=False,
            message=lock_status_data["message"],
            lock_status=lock_status_data,
        )

    return LockResponse(
        success=True,
        message="주문 락 획득 성공",
        lock_status={
            "locked": True,
            "editable": True,
            "message": "현재 사용자가 편집 중입니다",
        },
    )


@router.post("/{order_id}/unlock", response_model=LockResponse)
async def unlock_order(
    order_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LockResponse:
    """
    주문 락 해제 (response_model 사용)
    """
    order = db.query(Dashboard).filter(Dashboard.dashboard_id == order_id).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다"
        )

    # 락 해제 시도
    lock_released = release_lock(db, Dashboard, order_id, current_user["user_id"])

    if not lock_released:
        # 현재 락 상태 확인
        lock_status_data = check_lock_status(
            db, Dashboard, order_id, current_user["user_id"]
        )
        return LockResponse(
            success=False,
            message="락을 해제할 권한이 없습니다",
            lock_status=lock_status_data,
        )

    return LockResponse(
        success=True,
        message="주문 락 해제 성공",
        lock_status={
            "locked": False,
            "editable": True,
            "message": "편집 가능합니다",
        },
    )


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: int,
    order_update: OrderUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderResponse:  # 반환 타입 수정
    """
    주문 정보 업데이트 (response_model 사용) + 디버깅 로그 추가
    """
    logger.debug(f"라우트 update_order 시작 - order_id: {order_id}")
    # --- [로그 1] 요청 본문 로깅 ---
    try:
        request_body_dict = order_update.dict(exclude_unset=True)  # 입력된 값만 로깅
        logger.debug(f"  수신된 요청 본문 (OrderUpdate): {request_body_dict}")
    except Exception as req_log_exc:
        logger.warning(f"요청 본문 로깅 중 오류: {req_log_exc}")
    # ----------------------------

    # 락 검증
    try:
        validate_lock(db, Dashboard, order_id, current_user["user_id"])
        logger.debug(f"주문 락 검증 통과 (order_id={order_id})")
    except HTTPException as lock_http_exc:
        logger.warning(
            f"주문 락 검증 실패 (order_id={order_id}): {lock_http_exc.detail}"
        )
        raise lock_http_exc  # 락 실패는 그대로 오류 반환
    except Exception as lock_exc:
        logger.error(
            f"주문 락 검증 중 오류 발생 (order_id={order_id}): {lock_exc}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="주문 락 확인 중 오류 발생")

    # 서비스 호출 전 파라미터 로깅 등 추가...
    logger.debug(
        f"서비스 service_update_order 호출 전 - order_id={order_id}, data={request_body_dict}"
    )

    try:
        # 주의: 서비스 함수는 ORM 객체를 반환함
        updated_order_orm = service_update_order(
            db=db,
            order_id=order_id,
            # exclude={'status'} 는 서비스 레벨에서 처리하거나 여기서 명시
            order_data=order_update.dict(exclude_unset=True, exclude={"status"}),
            current_user_id=current_user["user_id"],
        )
        if not updated_order_orm:
            # 서비스에서 None 반환 시 (업데이트 실패 등)
            logger.error(f"서비스 update_order가 None 반환 (Order ID: {order_id})")
            raise HTTPException(
                status_code=500, detail="주문 업데이트 실패 (서비스 내부 오류)"
            )

        logger.debug(
            f"서비스 update_order 반환 ORM 객체 타입: {type(updated_order_orm)}"
        )
        if updated_order_orm:
            try:
                updated_dict = {
                    c.name: getattr(updated_order_orm, c.name, "N/A")
                    for c in updated_order_orm.__table__.columns
                }
                logger.debug(f"  반환된 ORM 객체 데이터 (dict 변환): {updated_dict}")
            except Exception as e_upd_dict:
                logger.error(f"  업데이트된 ORM 객체 dict 변환 오류: {e_upd_dict}")

    except ValueError as val_err:  # 서비스에서 주문 못찾을 때 발생 가능
        logger.error(f"서비스 update_order 오류: {val_err}")
        raise HTTPException(status_code=404, detail=str(val_err))
    except Exception as service_exc:
        logger.error(f"서비스 update_order 호출 중 오류: {service_exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="주문 업데이트 서비스 오류")

    # --- [로그 5] Pydantic 모델 변환 시도 ---
    try:
        logger.debug(f"OrderResponse.from_orm 변환 시도 (order_id={order_id})")
        # Pydantic v2: model_validate 사용
        response_obj = OrderResponse.model_validate(updated_order_orm)
        logger.debug(
            f"OrderResponse 변환 성공 (일부): ID={response_obj.dashboard_id}, Status={response_obj.status}"
        )

    except ValidationError as ve:
        logger.error(
            f"OrderResponse Pydantic 유효성 검사 실패 (Order ID: {order_id}): {ve.errors()}",
            exc_info=True,
        )
        try:
            failed_data_dict = {
                c.name: getattr(updated_order_orm, c.name, "N/A")
                for c in updated_order_orm.__table__.columns
            }
            logger.error(f"  유효성 검사 실패한 원본 ORM 데이터: {failed_data_dict}")
        except Exception as e_fail_dict:
            logger.error(f"  실패 데이터 dict 변환 오류: {e_fail_dict}")
        raise HTTPException(
            status_code=422,
            detail=f"업데이트된 주문 데이터 유효성 검증 실패: {ve.errors()}",
        )
    except Exception as e:
        logger.error(
            f"OrderResponse 변환 중 일반 오류 (Order ID: {order_id}): {e}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=500, detail="업데이트된 주문 정보 처리 중 오류 발생"
        )
    # ---------------------------------------

    # --- [로그 7] 최종 응답 반환 직전 로깅 ---
    try:
        log_subset = {
            "dashboard_id": response_obj.dashboard_id,
            "order_no": response_obj.order_no,
            "status": response_obj.status,
            # 필요한 다른 주요 필드 추가...
        }
        logger.debug(f"최종 응답 반환 직전 (OrderResponse 객체 요약): {log_subset}")
        return response_obj
    except Exception as final_resp_exc:
        logger.error(
            f"최종 OrderResponse 로깅/반환 실패: {final_resp_exc}", exc_info=True
        )
        raise HTTPException(
            status_code=500, detail="주문 업데이트 응답 생성 중 오류 발생"
        )
    # ---------------------------------------


@router.delete("/{order_id}", response_model=BasicSuccessResponse)
async def delete_order(
    order_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BasicSuccessResponse:
    """
    주문 삭제 (response_model 사용)
    """
    success = service_delete_order(db, order_id, current_user["user_id"])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="삭제할 주문을 찾을 수 없습니다",
        )
    return BasicSuccessResponse(message="주문 삭제 성공")


@router.post("/delete-multiple", response_model=DeleteMultipleResponse)
async def delete_multiple_orders(
    delete_data: OrderDeleteMultiple,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DeleteMultipleResponse:
    """
    주문 다중 삭제 (response_model 사용)
    """
    result = service_delete_multiple_orders(
        db, delete_data.order_ids, current_user["user_id"]
    )
    return DeleteMultipleResponse(**result)


# 상태 일괄 변경 API 명시적 파라미터 정의를 위한 모델
class StatusUpdateMultiple(BaseModel):
    order_ids: List[int] = Field(..., description="주문 ID 목록", alias="orderIds")
    status: OrderStatus = Field(..., description="변경할 상태")


@router.post("/status-multiple", response_model=StatusUpdateMultipleResponse)
async def update_multiple_orders_status(
    status_data: StatusUpdateMultiple,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StatusUpdateMultipleResponse:
    """
    주문 상태 일괄 변경 (response_model 사용)
    """
    result = service_update_multiple_orders_status(
        db, status_data.order_ids, status_data.status, current_user
    )
    return StatusUpdateMultipleResponse(**result)


# 기사 배정용 요청 모델 추가
class DriverAssignRequest(BaseModel):
    order_ids: List[int] = Field(..., description="주문 ID 목록", alias="orderIds")
    driver_name: str = Field(..., description="기사 이름", alias="driverName")
    driver_contact: Optional[str] = Field(
        None, description="기사 연락처", alias="driverContact"
    )


@router.post("/assign-driver", response_model=AssignDriverResponse)
async def assign_driver(
    driver_data: DriverAssignRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssignDriverResponse:
    """
    기사 일괄 배정 (response_model 사용)
    """
    assigned_count = service_assign_driver_to_orders(
        db,
        driver_data.order_ids,
        driver_data.driver_name,
        driver_data.driver_contact,
        current_user["user_id"],
    )
    return AssignDriverResponse(
        data=AssignDriverResponseData(assigned_count=assigned_count)
    )


# --- [로그 7] 최종 응답 로깅을 위한 도우미 함수 ---
def log_final_response(final_response):
    try:
        if isinstance(final_response, OrderListResponse):
            log_subset = {
                "success": final_response.success,
                "message": final_response.message,
                "data_type": type(final_response.data),
            }
            if final_response.data:
                log_subset["data_summary"] = {
                    "items_type": type(final_response.data.items),
                    "items_len": (
                        len(final_response.data.items)
                        if isinstance(final_response.data.items, list)
                        else "N/A"
                    ),
                    "total": final_response.data.total,
                    "page": final_response.data.page,
                    "limit": final_response.data.limit,
                    "statusCounts_type": type(final_response.data.status_counts),
                    "filter_type": type(final_response.data.filter),
                }
            logger.debug(
                f"최종 응답 반환 직전 (OrderListResponse 객체 요약): {log_subset}"
            )
        elif isinstance(
            final_response, dict
        ):  # 서비스가 dict를 반환하고 FastAPI가 처리하는 경우
            logger.debug(
                f"최종 응답 반환 직전 (dict 키 목록): {list(final_response.keys())}"
            )
        else:
            logger.debug(
                f"최종 응답 반환 직전 (타입: {type(final_response)}): {final_response}"
            )  # 예상치 못한 타입
    except Exception as log_exc:
        logger.warning(f"최종 응답 로깅 중 오류: {log_exc}")


# ---------------------------------------------
