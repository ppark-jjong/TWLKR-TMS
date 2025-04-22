"""
시각화 관련 라우트 (관리자 전용)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from backend.utils.logger import logger
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from backend.database import get_db
from backend.models.dashboard import Dashboard, OrderStatus
from backend.models.visualization import VisualizationResponse
from backend.middleware.auth import get_current_user, admin_required
from backend.services.visualization_service import (
    get_visualization_stats as service_get_stats,
)

router = APIRouter()


@router.get(
    "/stats",
    response_model=VisualizationResponse,
    dependencies=[Depends(admin_required)],
)
async def get_visualization_stats(
    start_date: Optional[str] = Query(None, description="시작 날짜 (ISO 형식)"),
    end_date: Optional[str] = Query(None, description="종료 날짜 (ISO 형식)"),
    visualization_type: Optional[str] = Query(
        "time_based", description="시각화 유형 (time_based 또는 department_based)"
    ),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> VisualizationResponse:
    """
    시각화를 위한 통계 데이터 조회 (관리자 전용) + 디버깅 로그 추가
    """
    try:
        logger.api(
            f"시각화 통계 요청 - 사용자: {current_user['user_id']}, 타입: {visualization_type}"
        )

        # 서비스 레이어 호출
        result_dict = service_get_stats(
            db=db,
            start_date=start_date,
            end_date=end_date,
            visualization_type=visualization_type,
        )

        # --- 서비스 반환 결과 로깅 ---
        # 순환 참조 가능성 때문에 전체 dict 로깅은 주의, 주요 키 위주로 로깅
        logger.debug(
            f"서비스 get_visualization_stats 반환 딕셔너리 (일부): success={result_dict.get('success')}, message={result_dict.get('message')}, data_keys={list(result_dict.get('data', {}).keys()) if isinstance(result_dict.get('data'), dict) else None}"
        )
        # ----------------------------

        if not result_dict.get("success", False):
            logger.error(
                f"시각화 서비스 오류: {result_dict.get('message', 'Unknown error')}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result_dict.get("message", "통계 조회 오류"),
            )

        # --- Pydantic 모델 변환 전 데이터 구조 로깅 ---
        if "data" in result_dict:
            # 데이터 크기가 클 수 있으므로 일부만 로깅하거나 타입만 로깅
            data_content = result_dict["data"]
            log_data_subset = {}
            if isinstance(data_content, dict):
                for key, value in data_content.items():
                    if isinstance(value, list):
                        log_data_subset[key] = f"List(len={len(value)})"
                    else:
                        log_data_subset[key] = value
            logger.debug(
                f"VisualizationResponse 생성을 위한 data 부분 (요약): {log_data_subset}"
            )
        else:
            logger.warning("서비스 결과에 'data' 키가 없습니다.")
        # ----------------------------------------

        # 서비스 결과를 Pydantic 모델로 변환하여 반환
        try:
            final_response = VisualizationResponse(**result_dict)
            # --- 최종 응답 객체 로깅 (일부) ---
            if final_response and final_response.data:
                logger.debug(
                    f"생성된 VisualizationResponse: success={final_response.success}, message={final_response.message}, data_type={final_response.data.visualization_type}, time_stats_len={len(final_response.data.time_stats) if final_response.data.time_stats else 0}, dept_stats_len={len(final_response.data.department_stats) if final_response.data.department_stats else 0}"
                )
            else:
                logger.warning("최종 VisualizationResponse 생성 후 data가 비어있음")
            # ---------------------------------
            return final_response
        except Exception as e:
            logger.error(f"VisualizationResponse 생성 실패: {e}", exc_info=True)
            # 실패 시 어떤 데이터로 생성하려 했는지 다시 로깅 (중요 부분만)
            log_on_fail = {k: v for k, v in result_dict.items() if k != "data"}
            if "data" in result_dict and isinstance(result_dict["data"], dict):
                log_on_fail["data_keys"] = list(result_dict["data"].keys())
            logger.error(f"실패 당시 result_dict (요약): {log_on_fail}")
            raise HTTPException(
                status_code=500, detail=f"시각화 응답 생성 중 오류 발생: {e}"
            )

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"시각화 통계 처리 중 예상치 못한 오류 발생", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="시각화 통계를 불러오는 중 오류 발생",
        )


# 모든 비즈니스 로직이 서비스 레이어로 이동했으므로 이 부분 제거
