# backend/app/api/download_router.py
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
import io

from app.schemas.download_schema import DownloadRequest, DownloadResponse, DownloadDateRangeResponse
from app.repositories.download_repository import DownloadRepository
from app.services.download_service import DownloadService
from app.config.database import get_db
from app.api.deps import get_current_user, check_admin_access
from app.schemas.auth_schema import TokenData
from app.utils.logger import log_info, log_error
from app.utils.datetime_helper import get_date_range
from app.utils.api_decorators import error_handler

router = APIRouter()


def get_download_service(db: Session = Depends(get_db)) -> DownloadService:
    """DownloadService 의존성 주입"""
    repository = DownloadRepository(db)
    return DownloadService(repository)


@router.post("/excel", response_model=DownloadResponse)
@error_handler("대시보드 데이터 Excel 다운로드")
async def download_dashboard_excel(
    download_request: DownloadRequest,
    service: DownloadService = Depends(get_download_service),
    current_user: TokenData = Depends(get_current_user),
):
    """대시보드 데이터 Excel 다운로드 API
    - create_time 기준으로 지정된 날짜 범위 내 데이터 다운로드
    - Excel(.xlsx) 형식으로 제공
    """
    log_info(f"Excel 다운로드 요청: {download_request.start_date} ~ {download_request.end_date}")
    
    try:
        # 1. 날짜 문자열을 datetime 객체로 변환
        start_date_obj, _ = get_date_range(download_request.start_date)
        _, end_date_obj = get_date_range(download_request.end_date)
        
        # 2. 다운로드용 데이터 준비
        result = service.get_dashboard_data_for_download(start_date_obj, end_date_obj)
        
        if not result["success"] or not result["file_data"]:
            return DownloadResponse(
                success=False,
                message=result["message"] or "다운로드할 데이터가 없습니다",
                file_name=None,
                total_count=0
            )
        
        # 3. 파일 스트리밍 응답 생성
        file_data = result["file_data"]
        file_name = result["file_name"]
        
        response = StreamingResponse(
            io.BytesIO(file_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response.headers["Content-Disposition"] = f'attachment; filename="{file_name}"'
        
        return response
        
    except ValueError as e:
        log_error(e, f"Excel 다운로드 실패: 날짜 형식 오류")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": f"날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)"}
        )
    except Exception as e:
        log_error(e, "Excel 다운로드 실패")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": f"Excel 다운로드 중 오류가 발생했습니다: {str(e)}"}
        )


@router.get("/date-range", response_model=DownloadDateRangeResponse)
@error_handler("다운로드 가능 날짜 범위 조회")
async def get_download_date_range(
    service: DownloadService = Depends(get_download_service),
    current_user: TokenData = Depends(get_current_user),
):
    """다운로드 가능한 날짜 범위 조회 API
    - create_time 컬럼의 최소/최대 값을 기준으로 다운로드 가능 기간 제공
    """
    log_info("다운로드 가능 날짜 범위 조회 요청")
    
    date_range = service.get_download_date_range()
    
    return DownloadDateRangeResponse(
        success=True,
        message="다운로드 가능 날짜 범위를 조회했습니다",
        date_range=date_range
    )