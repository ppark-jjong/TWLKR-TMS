"""
사용자 관리 관련 라우트 - 서비스 레이어 패턴 적용
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from backend.utils.logger import logger
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import ValidationError
import traceback
import json

from backend.database import get_db
from backend.models.user import User
from backend.schemas.user_schema import (
    UserRole,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    UserListResponseData,
)
from backend.models.dashboard import BasicSuccessResponse  # Dashboard 모델 재사용
from backend.middleware.auth import get_current_user, admin_required
from backend.services.user_service import (
    get_users as service_get_users,
    get_user as service_get_user,
    create_user as service_create_user,
    delete_user as service_delete_user,
)

router = APIRouter()


@router.get(
    "/",
    response_model=UserListResponse,
    # dependencies=[Depends(admin_required)] # 임시 제거
)
async def get_users(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> UserListResponse:
    """
    모든 사용자 목록 조회 (관리자 전용) - 페이지네이션 없음
    """
    # --- [임시 권한 확인 추가] ---
    if current_user["user_role"] != UserRole.ADMIN.value:
        logger.warning(
            f"관리자 전용 기능 접근 시도 (임시 확인): {current_user['user_id']}, 경로: /users/"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다"
        )
    # --------------------------

    # --- [로그 1] 라우트 핸들러 시작 및 파라미터 로깅 ---
    logger.debug(f"라우트 get_users 시작")
    logger.debug(f"  수신 파라미터: user_id='{current_user.get('user_id')}'")
    # ---------------------------------------------------

    # --- [로그 2] 서비스 호출 전 파라미터 로깅 ---
    service_params = {
        "db": "Session object",
        "current_user_id": current_user["user_id"],
    }
    logger.debug(f"서비스 service_get_users 호출 전 파라미터: {service_params}")
    # -------------------------------------------

    try:
        response_dict = service_get_users(
            db=db, current_user_id=current_user["user_id"]
        )
    except Exception as service_exc:
        logger.error(
            f"서비스 service_get_users 호출 중 오류 발생: {service_exc}", exc_info=True
        )
        raise HTTPException(status_code=500, detail="사용자 목록 조회 서비스 오류")

    # --- [로그 6] 서비스 함수 반환 결과 로깅 (기존 유지) ---
    logger.debug(
        f"서비스 get_users 반환 딕셔너리 (키 목록): {list(response_dict.keys()) if isinstance(response_dict, dict) else 'Invalid Type'}"
    )

    # 서비스 반환값 디버깅을 위한 상세 로깅
    log_model_data("서비스 반환 데이터", response_dict, "UserListResponse")

    if (
        isinstance(response_dict, dict)
        and "data" in response_dict
        and isinstance(response_dict["data"], dict)
    ):
        logger.debug(f"  반환된 data 키 목록: {list(response_dict['data'].keys())}")
        logger.debug(
            f"  반환된 data[items] 타입: {type(response_dict['data'].get('items'))}"
        )
        logger.debug(
            f"  반환된 data[items] 개수: {len(response_dict['data'].get('items', [])) if isinstance(response_dict['data'].get('items'), list) else 'N/A'}"
        )
        logger.debug(f"  반환된 data[total]: {response_dict['data'].get('total')}")

        # page와 limit 필드 존재 여부 확인
        logger.debug(f"  'page' 필드 존재: {'page' in response_dict['data']}")
        logger.debug(f"  'limit' 필드 존재: {'limit' in response_dict['data']}")
    else:
        logger.error("서비스 get_users 반환 형식이 잘못되었습니다.")
        logger.error(f"  잘못된 형식의 반환값: {response_dict}")  # 오류 시 실제 값 로깅
        raise HTTPException(status_code=500, detail="사용자 서비스 응답 형식 오류")
    # -------------------------------------------

    # --- [로그 5] Pydantic 모델 변환 (UserResponse) ---
    items_response = []
    problematic_items = []
    # 서비스 반환 구조 변경 확인 필요 (data 안에 items, total 이 그대로 오는지)
    if not isinstance(response_dict.get("data"), dict):
        logger.error(
            f"서비스 get_users가 예상된 data 구조를 반환하지 않음: {response_dict.get('data')}"
        )
        raise HTTPException(
            status_code=500, detail="사용자 서비스 응답 형식 오류 (data)"
        )

    raw_items = response_dict["data"].get("items", [])  # items 키 확인
    if not isinstance(raw_items, list):
        logger.error(
            f"서비스 get_users가 data['items']로 리스트를 반환하지 않음: {type(raw_items)}"
        )
        raise HTTPException(
            status_code=500, detail="사용자 서비스 응답 형식 오류 (items)"
        )

    logger.debug(f"UserResponse Pydantic 변환 시작 - 대상 {len(raw_items)} 건")

    # 문제 항목 추적
    for i, item_orm in enumerate(raw_items):
        try:
            # 변환 전 ORM 객체 로깅 (주요 필드)
            logger.debug(
                f"  UserResponse 변환 시도 [{i}]: user_id={getattr(item_orm, 'user_id', 'N/A')}, department={getattr(item_orm, 'user_department', 'N/A')}, role={getattr(item_orm, 'user_role', 'N/A')}"
            )

            # ORM 객체를 사전으로 변환
            if hasattr(item_orm, "__dict__"):
                item_dict = {
                    k: v for k, v in item_orm.__dict__.items() if not k.startswith("_")
                }
                logger.debug(f"    ORM.__dict__: {item_dict}")

            # Pydantic v2: model_validate 메서드 사용 시도
            try:
                # from_orm 대신 model_validate 사용
                user_resp = UserResponse.model_validate(item_orm)
                items_response.append(user_resp)
                logger.debug(f"    UserResponse 변환 성공 (model_validate) [{i}]")
            except Exception as validate_err:
                logger.warning(f"    model_validate 실패, 예외: {validate_err}")

                # 대체 방법: 딕셔너리로 변환 후 시도
                try:
                    # 명시적으로 딕셔너리로 변환
                    if hasattr(item_orm, "__table__"):
                        # SQLAlchemy ORM 객체
                        item_dict = {
                            c.name: getattr(item_orm, c.name)
                            for c in item_orm.__table__.columns
                        }
                    else:
                        # 일반 객체
                        item_dict = {
                            k: v
                            for k, v in item_orm.__dict__.items()
                            if not k.startswith("_")
                        }

                    logger.debug(f"    변환된 딕셔너리: {item_dict}")
                    user_resp = UserResponse(**item_dict)
                    items_response.append(user_resp)
                    logger.debug(f"    UserResponse 변환 성공 (dict) [{i}]")
                except Exception as dict_err:
                    logger.error(f"    딕셔너리 변환 후에도 실패: {dict_err}")
                    raise

        except ValidationError as ve:
            logger.error(
                f"  UserResponse.model_validate 유효성 검사 실패 [{i}]: user_id={getattr(item_orm, 'user_id', 'N/A')}, 오류={ve.errors()}",
                exc_info=True,
            )

            # 실패한 항목 상세 정보 로깅
            try:
                if hasattr(item_orm, "__table__"):
                    failed_orm_dict = {
                        c.name: getattr(item_orm, c.name, "N/A")
                        for c in item_orm.__table__.columns
                    }
                else:
                    failed_orm_dict = {
                        k: v
                        for k, v in item_orm.__dict__.items()
                        if not k.startswith("_")
                    }
                logger.error(
                    f"    유효성 검사 실패한 원본 ORM 데이터 [{i}]: {failed_orm_dict}"
                )

                # 필드별 타입 로깅
                field_types = {k: type(v).__name__ for k, v in failed_orm_dict.items()}
                logger.error(f"    필드 타입: {field_types}")

                # 디버깅용으로 문제 항목 기록
                problematic_items.append(
                    {"index": i, "data": failed_orm_dict, "error": ve.errors()}
                )
            except Exception as e_fail_log:
                logger.error(f"    실패 ORM 데이터 로깅 중 오류: {e_fail_log}")

            # 디버깅 중이므로 계속 진행
            continue

        except Exception as e:
            logger.error(
                f"  UserResponse.model_validate 변환 중 일반 오류 [{i}]: user_id={getattr(item_orm, 'user_id', 'N/A')}, 오류={e}",
                exc_info=True,
            )
            continue
    # ---------------------------------------------

    logger.debug(f"UserResponse 변환 완료된 items_response 개수: {len(items_response)}")
    if problematic_items:
        logger.debug(f"처리되지 않은 항목 개수: {len(problematic_items)}")

    # total 값 가져오기 (서비스 반환값에서)
    total_count = response_dict["data"].get("total")  # total 키 확인
    if total_count is None or not isinstance(total_count, int):
        logger.error(
            f"서비스 get_users가 data['total']로 정수를 반환하지 않음: {total_count}"
        )
        total_count = len(items_response)  # 임시로 변환된 개수 사용 또는 오류 처리
        # raise HTTPException(status_code=500, detail="사용자 서비스 응답 형식 오류 (total)")

    # --- [로그 7] 최종 응답 모델(UserListResponse) 생성 및 반환 전 로깅 ---
    try:
        # UserListResponseData 모델에 맞는 데이터 구성
        response_data = {"items": items_response, "total": total_count}

        logger.debug(f"UserListResponseData 생성 시도: {response_data.keys()}")

        try:
            # UserListResponseData 인스턴스 생성
            data_obj = UserListResponseData(**response_data)
            logger.debug("UserListResponseData 인스턴스 생성 성공")

            # UserListResponse 인스턴스 생성
            final_response = UserListResponse(
                success=True, message="사용자 목록 조회 성공", data=data_obj
            )
            logger.debug("UserListResponse 인스턴스 생성 성공")

        except Exception as model_ex:
            logger.error(f"모델 인스턴스 생성 실패: {model_ex}")

            # 디버깅 중이므로 원본 데이터 그대로 반환
            logger.info("모델 변환 실패로 인해 서비스 원본 데이터 반환")

            # 디버깅 정보 추가
            debug_info = {
                "original_response": response_dict,
                "converted_items": len(items_response),
                "problematic_items": problematic_items[:3] if problematic_items else [],
                "error": str(model_ex),
            }

            return debug_info

        # 최종 응답 객체 로깅 (요약)
        log_subset = {
            "success": final_response.success,
            "message": final_response.message,
            "data_items_count": len(final_response.data.items),
            "data_total": final_response.data.total,
        }
        if hasattr(final_response.data, "page"):
            log_subset["data_page"] = final_response.data.page
        if hasattr(final_response.data, "limit"):
            log_subset["data_limit"] = final_response.data.limit

        logger.debug(f"최종 응답 반환 직전 (UserListResponse 객체 요약): {log_subset}")

        if final_response.data.items:
            first_item = final_response.data.items[0]
            logger.debug(
                f"  첫번째 UserResponse item: user_id={first_item.user_id}, role={first_item.user_role}"
            )

        return final_response

    except ValidationError as ve:
        logger.error(f"UserListResponse 생성 실패: {ve.errors()}", exc_info=True)

        # 디버깅 정보를 포함한 응답
        debug_response = {
            "success": False,
            "message": "사용자 목록 응답 변환 중 검증 오류",
            "validation_errors": ve.errors(),
            "original_data": {
                "keys": list(response_dict.keys()),
                "data_keys": (
                    list(response_dict.get("data", {}).keys())
                    if isinstance(response_dict.get("data"), dict)
                    else []
                ),
            },
        }

        return debug_response

    except Exception as e:
        logger.error(f"최종 UserListResponse 생성 실패: {e}", exc_info=True)
        logger.error(
            f"  실패 시점 데이터: items_len={len(items_response)}, total={total_count}"
        )

        # 디버깅 응답
        debug_response = {
            "success": False,
            "message": f"사용자 목록 응답 생성 중 오류: {str(e)}",
            "error_detail": traceback.format_exc(),
            "data_summary": {"items_count": len(items_response), "total": total_count},
        }

        return debug_response
    # -------------------------------------------------------------------


@router.post("/", response_model=UserResponse, dependencies=[Depends(admin_required)])
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> UserResponse:
    """
    새 사용자 생성 (관리자 전용, response_model 사용)
    """
    logger.debug(f"라우트 create_user 시작")
    # --- [로그 1] 요청 본문 로깅 ---
    try:
        request_body_dict = user.model_dump(by_alias=True)  # camelCase로 로깅
        logger.debug(f"  수신된 요청 본문 (UserCreate): {request_body_dict}")
    except Exception as req_log_exc:
        logger.warning(f"요청 본문 로깅 중 오류: {req_log_exc}")
    # ----------------------------

    # --- [로그 2] 서비스 호출 전 파라미터 로깅 ---
    # 서비스는 snake_case dict를 기대하므로 .dict() 사용 (alias 적용 안함)
    service_payload = user.model_dump()
    logger.debug(
        f"서비스 service_create_user 호출 전 파라미터 (data): {service_payload}"
    )
    # -------------------------------------------

    try:
        response_dict = service_create_user(
            db=db,
            user_data=service_payload,
            current_user_id=current_user["user_id"],
        )
    except Exception as service_exc:
        logger.error(
            f"서비스 service_create_user 호출 중 오류: {service_exc}", exc_info=True
        )
        raise HTTPException(status_code=500, detail="사용자 생성 서비스 오류")

    # --- [로그 6] 서비스 반환 결과 로깅 ---
    logger.debug(f"서비스 service_create_user 반환 결과: {response_dict}")
    # ----------------------------------

    if not response_dict.get("success", False):
        error_code = response_dict.get("error_code", "UNKNOWN_ERROR")
        error_message = response_dict.get("message", "사용자 생성 중 오류 발생")
        logger.warning(
            f"사용자 생성 실패: code={error_code}, message='{error_message}'"
        )
        if error_code == "DUPLICATE_ID":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=error_message
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_message,
            )

    # --- [로그 5 & 7] Pydantic 모델 변환 및 최종 응답 로깅 ---
    try:
        # 서비스가 반환한 data 딕셔너리를 UserResponse 모델로 변환
        # 서비스 data는 snake_case로 가정
        created_user_data = response_dict.get("data", {})
        if not created_user_data or not isinstance(created_user_data, dict):
            logger.error(
                f"서비스 create_user가 유효한 data를 반환하지 않음: {created_user_data}"
            )
            raise HTTPException(
                status_code=500, detail="사용자 생성 서비스 응답 형식 오류"
            )

        logger.debug(f"UserResponse 변환 시도 (data): {created_user_data}")
        # Pydantic v2: model_validate 사용
        final_response_obj = UserResponse.model_validate(created_user_data)

        # 최종 응답 로깅
        log_subset = final_response_obj.model_dump(by_alias=True)
        logger.debug(f"최종 응답 반환 직전 (UserResponse 객체 dict): {log_subset}")
        return final_response_obj

    except ValidationError as ve:
        logger.error(
            f"UserResponse 변환 실패 (create_user): {ve.errors()}", exc_info=True
        )
        logger.error(f"  변환 실패한 데이터: {created_user_data}")
        raise HTTPException(
            status_code=422,
            detail=f"생성된 사용자 데이터 유효성 검증 실패: {ve.errors()}",
        )
    except Exception as e:
        logger.error(
            f"UserResponse 변환/로깅 중 오류 (create_user): {e}", exc_info=True
        )
        raise HTTPException(
            status_code=500, detail="사용자 생성 응답 처리 중 오류 발생"
        )
    # -------------------------------------------------------


@router.delete(
    "/{user_id}",
    response_model=BasicSuccessResponse,
    dependencies=[Depends(admin_required)],
)
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> BasicSuccessResponse:
    """
    사용자 삭제 (관리자 전용, response_model 사용)
    """
    logger.info(f"사용자 삭제 - 대상 ID: {user_id}, 요청자: {current_user['user_id']}")
    response_dict = service_delete_user(
        db=db, user_id=user_id, current_user_id=current_user["user_id"]
    )
    if not response_dict["success"]:
        if response_dict["error_code"] == "NOT_FOUND":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=response_dict["message"]
            )
        elif response_dict["error_code"] == "SELF_DELETE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=response_dict["message"]
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="사용자 삭제 중 오류 발생",
            )

    return BasicSuccessResponse(message=response_dict["message"])


# 디버깅용 엔드포인트 추가
@router.get("/debug")
async def debug_users(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    디버깅용 사용자 목록 조회 - 모델 검증 우회하여 원본 데이터 반환
    """
    try:
        # 서비스 호출
        response_dict = service_get_users(
            db=db, current_user_id=current_user["user_id"]
        )

        # 모델 클래스 구조 분석
        model_info = {
            "UserListResponse": {
                "fields": str(
                    UserListResponse.__annotations__
                    if hasattr(UserListResponse, "__annotations__")
                    else "정보 없음"
                ),
                "config": str(getattr(UserListResponse, "model_config", "설정 없음")),
            },
            "UserListResponseData": {
                "fields": str(
                    UserListResponseData.__annotations__
                    if hasattr(UserListResponseData, "__annotations__")
                    else "정보 없음"
                ),
                "config": str(
                    getattr(UserListResponseData, "model_config", "설정 없음")
                ),
            },
            "UserResponse": {
                "fields": str(
                    UserResponse.__annotations__
                    if hasattr(UserResponse, "__annotations__")
                    else "정보 없음"
                ),
                "config": str(getattr(UserResponse, "model_config", "설정 없음")),
            },
        }

        # 반환값 구조 분석
        data_structure = {
            "top_level_keys": list(response_dict.keys()),
            "data_keys": (
                list(response_dict["data"].keys())
                if "data" in response_dict and isinstance(response_dict["data"], dict)
                else "data 필드 없음"
            ),
        }

        # 첫 번째 아이템 상세 정보
        first_item = None
        if (
            "data" in response_dict
            and isinstance(response_dict["data"], dict)
            and "items" in response_dict["data"]
            and isinstance(response_dict["data"]["items"], list)
            and len(response_dict["data"]["items"]) > 0
        ):

            item = response_dict["data"]["items"][0]
            if hasattr(item, "__dict__"):
                first_item = {
                    k: v for k, v in item.__dict__.items() if not k.startswith("_")
                }
            elif hasattr(item, "__table__"):
                first_item = {
                    c.name: getattr(item, c.name) for c in item.__table__.columns
                }
            else:
                first_item = str(item)

        # 모든 정보를 담은 디버그 응답
        debug_response = {
            "original_response": response_dict,
            "model_info": model_info,
            "data_structure": data_structure,
            "first_item": first_item,
        }

        return debug_response

    except Exception as e:
        logger.error(f"디버그 엔드포인트 오류: {e}", exc_info=True)
        return {"error": str(e), "traceback": traceback.format_exc()}
