"""
시각화 관련 라우트 (관리자 전용)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from backend.utils.logger import logger
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
import traceback
import json
from pydantic import ValidationError

from backend.database import get_db
from backend.models.dashboard import Dashboard, OrderStatus
from backend.models.visualization import (
    VisualizationResponse,
    VisualizationData,
    TimeStatEntry,
    DepartmentStatEntry,
    DepartmentStatusCounts,
)
from backend.middleware.auth import get_current_user, admin_required
from backend.services.visualization_service import (
    get_visualization_stats as service_get_stats,
)

router = APIRouter()


@router.get(
    "/stats",
    response_model=VisualizationResponse,
    # dependencies=[Depends(admin_required)], # 임시 제거
)
async def get_visualization_stats(
    start_date: Optional[str] = Query(None, description="시작 날짜 (문자열)"),
    end_date: Optional[str] = Query(None, description="종료 날짜 (문자열)"),
    visualization_type: Optional[str] = Query(
        "time_based", description="시각화 유형 (time_based 또는 department_based)"
    ),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> VisualizationResponse:
    """
    시각화를 위한 통계 데이터 조회 (관리자 전용) + 디버깅 로그 추가
    """
    # --- [임시 권한 확인 추가] ---
    if current_user["user_role"] != UserRole.ADMIN:
        logger.warning(
            f"관리자 전용 기능 접근 시도 (임시 확인): {current_user['user_id']}, 경로: /visualization/stats"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다"
        )
    # --------------------------
    try:
        # --- [로그 1] 라우터 진입 시 파라미터 값 로깅 (str 타입) ---
        logger.debug(f"라우터 get_visualization_stats 진입")
        logger.debug(f"  입력 start_date: {start_date} (타입: {type(start_date)})")
        logger.debug(f"  입력 end_date: {end_date} (타입: {type(end_date)})")
        logger.debug(f"  입력 visualization_type: {visualization_type}")
        # ---------------------------------

        logger.info(
            f"시각화 통계 요청 - 사용자: {current_user['user_id']}, 타입: {visualization_type}"
        )

        # 서비스 레이어 호출 (문자열 전달, 서비스에서 get_date_range 사용)
        result_dict = service_get_stats(
            db=db,
            start_date=start_date,
            end_date=end_date,
            visualization_type=visualization_type,
        )

        # --- [로그 6] 서비스 반환 결과 상세 로깅 ---
        logger.debug(
            f"서비스 get_visualization_stats 반환값 (타입): {type(result_dict)}"
        )
        logger.debug(
            f"서비스 get_visualization_stats 반환 keys: {list(result_dict.keys())}"
        )

        # 디버깅용 로깅 함수 추가
        log_model_data("서비스 반환값", result_dict, "VisualizationResponse")

        # data 키의 내용 자세히 로깅
        if "data" in result_dict and isinstance(result_dict["data"], dict):
            logger.debug(f"data 키 구조: {list(result_dict['data'].keys())}")

            # visualization_type 확인
            vis_type = result_dict["data"].get("visualizationType", "없음")
            logger.debug(f"visualizationType: {vis_type}")

            # 날짜 값 확인
            start_date_val = result_dict["data"].get("startDate")
            end_date_val = result_dict["data"].get("endDate")
            logger.debug(f"startDate: {start_date_val} (타입: {type(start_date_val)})")
            logger.debug(f"endDate: {end_date_val} (타입: {type(end_date_val)})")

            # time_stats 확인
            time_stats = result_dict["data"].get("timeStats")
            if time_stats is not None:
                logger.debug(
                    f"timeStats: {type(time_stats)}, 길이: {len(time_stats) if isinstance(time_stats, list) else 'not list'}"
                )
                if isinstance(time_stats, list) and len(time_stats) > 0:
                    logger.debug(f"첫 번째 timeStats 항목: {time_stats[0]}")
            else:
                logger.debug("timeStats 키가 없거나 None입니다")

            # department_stats 확인
            dept_stats = result_dict["data"].get("departmentStats")
            if dept_stats is not None:
                logger.debug(
                    f"departmentStats: {type(dept_stats)}, 길이: {len(dept_stats) if isinstance(dept_stats, list) else 'not list'}"
                )
                if isinstance(dept_stats, list) and len(dept_stats) > 0:
                    logger.debug(f"첫 번째 departmentStats 항목: {dept_stats[0]}")
            else:
                logger.debug("departmentStats 키가 없거나 None입니다")
        # ----------------------------

        if not result_dict.get("success", False):
            logger.error(
                f"시각화 서비스 오류: {result_dict.get('message', 'Unknown error')}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result_dict.get("message", "통계 조회 오류"),
            )

        # 디버깅 모드: 서비스에서 받은 데이터를 그대로 반환 (422 오류 확인 용도)
        # return result_dict

        # --- [로그 5] Pydantic 모델 변환 시도 전 상세 로깅 ---
        logger.debug(f"VisualizationResponse 변환 시도 시작")
        logger.debug(f"모델 필수 필드: success, message, data")
        logger.debug(f"data 필드 모델: VisualizationData")
        logger.debug(
            f"VisualizationData 필수 필드: visualization_type, start_date, end_date"
        )
        # ----------------------------------------

        # 서비스 결과를 Pydantic 모델로 변환하여 반환
        try:
            # 디버깅: result_dict 내용 로깅
            logger.debug(
                f"변환 전 result_dict: {json.dumps({k: str(type(v)) for k, v in result_dict.items()})}"
            )

            # data 부분 분석 로깅
            if "data" in result_dict and isinstance(result_dict["data"], dict):
                data_part = result_dict["data"]
                logger.debug(f"data 키: {list(data_part.keys())}")

                # 필수 키 존재 여부 확인
                required_keys = ["visualizationType", "startDate", "endDate"]
                for key in required_keys:
                    logger.debug(
                        f"data[{key}] 존재: {key in data_part}, 값: {data_part.get(key)}"
                    )

                # time_stats 또는 department_stats 확인
                if "timeStats" in data_part:
                    ts = data_part["timeStats"]
                    logger.debug(
                        f"timeStats 타입: {type(ts)}, 길이: {len(ts) if isinstance(ts, list) else 'N/A'}"
                    )
                    if isinstance(ts, list) and ts:
                        logger.debug(f"첫 번째 timeStats 항목: {ts[0]}")
                        # timeStats 항목 검증
                        if isinstance(ts[0], dict):
                            required_ts_keys = ["timeRange", "CS", "HES", "LENOVO"]
                            for k in required_ts_keys:
                                logger.debug(
                                    f"timeStats[0][{k}] 존재: {k in ts[0]}, 값: {ts[0].get(k)}"
                                )

                if "departmentStats" in data_part:
                    ds = data_part["departmentStats"]
                    logger.debug(
                        f"departmentStats 타입: {type(ds)}, 길이: {len(ds) if isinstance(ds, list) else 'N/A'}"
                    )
                    if isinstance(ds, list) and ds:
                        logger.debug(f"첫 번째 departmentStats 항목: {ds[0]}")
                        # departmentStats 항목 검증
                        if isinstance(ds[0], dict):
                            required_ds_keys = [
                                "department",
                                "totalCount",
                                "statusCounts",
                            ]
                            for k in required_ds_keys:
                                logger.debug(
                                    f"departmentStats[0][{k}] 존재: {k in ds[0]}, 값: {ds[0].get(k)}"
                                )

            # 실제 변환 시도
            final_response = VisualizationResponse(**result_dict)

            # --- 최종 응답 객체 로깅 (일부) ---
            logger.debug(f"VisualizationResponse 변환 성공!")
            if final_response and final_response.data:
                logger.debug(
                    f"생성된 VisualizationResponse: success={final_response.success}, message={final_response.message}, data_type={final_response.data.visualization_type}"
                )
                if (
                    hasattr(final_response.data, "time_stats")
                    and final_response.data.time_stats
                ):
                    logger.debug(
                        f"time_stats 길이: {len(final_response.data.time_stats)}"
                    )
                if (
                    hasattr(final_response.data, "department_stats")
                    and final_response.data.department_stats
                ):
                    logger.debug(
                        f"department_stats 길이: {len(final_response.data.department_stats)}"
                    )
            else:
                logger.warning("최종 VisualizationResponse 생성 후 data가 비어있음")
            # ---------------------------------

            return final_response

        except ValidationError as ve:
            # ValidationError 상세 정보 로깅
            logger.error(f"VisualizationResponse 검증 실패: {ve.errors()}")
            logger.error(f"검증 실패 위치: {[e.get('loc', []) for e in ve.errors()]}")
            logger.error(f"검증 실패 메시지: {[e.get('msg', '') for e in ve.errors()]}")

            # 실패한 데이터 구조 로깅
            if "data" in result_dict and isinstance(result_dict["data"], dict):
                data_keys = list(result_dict["data"].keys())
                logger.error(f"data 키 구조: {data_keys}")

                # 각 키별 타입과 값 확인
                for key in data_keys:
                    value = result_dict["data"][key]
                    logger.error(f"data[{key}] 타입: {type(value)}")
                    if isinstance(value, list):
                        logger.error(f"data[{key}] 길이: {len(value)}")
                        if value and len(value) > 0:
                            logger.error(f"data[{key}][0] 타입: {type(value[0])}")
                            if isinstance(value[0], dict):
                                logger.error(
                                    f"data[{key}][0] 키: {list(value[0].keys())}"
                                )
                    elif value is None:
                        logger.error(f"data[{key}] 값이 None입니다")

            # 디버깅 목적으로 수정된 데이터로 응답 생성 시도
            logger.info("원본 데이터를 직접 반환하여 클라이언트 응답 확인")
            return result_dict

        except Exception as e:
            logger.error(f"VisualizationResponse 생성 실패: {e}", exc_info=True)
            # 실패 시 어떤 데이터로 생성하려 했는지 다시 로깅 (중요 부분만)
            log_on_fail = {k: v for k, v in result_dict.items() if k != "data"}
            if "data" in result_dict and isinstance(result_dict["data"], dict):
                log_on_fail["data_keys"] = list(result_dict["data"].keys())
            logger.error(f"실패 당시 result_dict (요약): {log_on_fail}")

            # 디버깅 중이므로 원본 데이터 그대로 반환
            logger.info("오류 발생으로 인해 원본 데이터를 직접 반환")
            return result_dict

    except HTTPException as http_exc:
        logger.error(f"HTTP 예외 발생: {http_exc.detail}", exc_info=True)
        raise http_exc
    except Exception as e:
        logger.error(f"시각화 통계 처리 중 예상치 못한 오류 발생", exc_info=True)
        logger.error(f"예외 정보: {str(e)}")
        logger.error(f"스택 트레이스: {traceback.format_exc()}")

        # 디버깅을 위해 자세한 오류 정보 반환
        error_response = {
            "success": False,
            "message": f"시각화 통계를 불러오는 중 오류 발생: {str(e)}",
            "error_detail": {
                "type": str(type(e).__name__),
                "location": "visualization.py/get_visualization_stats",
            },
        }

        return error_response


# 디버깅용 엔드포인트 추가
@router.get("/debug_stats")
async def debug_visualization_stats(
    start_date: Optional[str] = Query(None, description="시작 날짜 (문자열)"),
    end_date: Optional[str] = Query(None, description="종료 날짜 (문자열)"),
    visualization_type: Optional[str] = Query(
        "time_based", description="시각화 유형 (time_based 또는 department_based)"
    ),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    디버깅용 시각화 통계 엔드포인트 - 원본 데이터와 모델 구조를 함께 반환
    """
    try:
        # 서비스 레이어 호출
        result_dict = service_get_stats(
            db=db,
            start_date=start_date,
            end_date=end_date,
            visualization_type=visualization_type,
        )

        # 모델 구조 정보 수집
        model_info = {
            "VisualizationResponse": {
                "fields": [
                    field
                    for field in dir(VisualizationResponse)
                    if not field.startswith("_")
                ],
                "required": (
                    VisualizationResponse.__annotations__
                    if hasattr(VisualizationResponse, "__annotations__")
                    else {}
                ),
            },
            "VisualizationData": {
                "fields": [
                    field
                    for field in dir(VisualizationData)
                    if not field.startswith("_")
                ],
                "required": (
                    VisualizationData.__annotations__
                    if hasattr(VisualizationData, "__annotations__")
                    else {}
                ),
            },
            "TimeStatEntry": {
                "fields": [
                    field for field in dir(TimeStatEntry) if not field.startswith("_")
                ],
                "required": (
                    TimeStatEntry.__annotations__
                    if hasattr(TimeStatEntry, "__annotations__")
                    else {}
                ),
            },
        }

        # 반환 데이터에 추가 디버그 정보 포함
        debug_info = {
            "raw_result": result_dict,
            "model_info": model_info,
            "data_structure": {
                "top_level_keys": list(result_dict.keys()),
                "data_keys": (
                    list(result_dict.get("data", {}).keys())
                    if isinstance(result_dict.get("data"), dict)
                    else "N/A"
                ),
            },
        }

        # 데이터 필드 구조 분석 시도
        if "data" in result_dict and isinstance(result_dict["data"], dict):
            data_field = result_dict["data"]
            field_analysis = {}

            for key, value in data_field.items():
                field_info = {"type": str(type(value)), "is_none": value is None}

                if isinstance(value, list):
                    field_info["length"] = len(value)
                    if value and len(value) > 0:
                        field_info["first_item_type"] = str(type(value[0]))
                        if isinstance(value[0], dict):
                            field_info["first_item_keys"] = list(value[0].keys())

                field_analysis[key] = field_info

            debug_info["field_analysis"] = field_analysis

        return debug_info

    except Exception as e:
        logger.error(f"디버깅 엔드포인트 오류: {e}", exc_info=True)
        return {
            "error": str(e),
            "traceback": traceback.format_exc(),
            "visualization_type": visualization_type,
        }
