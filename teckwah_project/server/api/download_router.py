# teckwah_project/server/api/download_router.py
from fastapi import APIRouter, Depends, Query, Response, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import io
import pandas as pd

from server.config.database import get_db
from server.api.deps import get_current_user, check_admin_access
from server.schemas.auth_schema import TokenData
from server.models.dashboard_model import Dashboard
from server.schemas.download_schema import DownloadParams
from server.schemas.common_schema import ApiResponse, MetaBuilder
from server.utils.error import error_handler, ValidationException
from server.utils.datetime import get_kst_now, get_date_range, format_datetime

router = APIRouter(prefix="/download", tags=["데이터 다운로드"])


@router.post("/excel", response_class=StreamingResponse)
@error_handler("엑셀 다운로드")
async def download_excel(
    params: DownloadParams,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(check_admin_access),  # 관리자 권한 필요
):
    """대시보드 데이터 엑셀 다운로드 API"""

    # 날짜 범위 계산
    start_date = params.start_date
    end_date = params.end_date

    # 날짜 범위 검증 (최대 3개월)
    if start_date and end_date:
        date_range = get_date_range(start_date, end_date)
        start = date_range["start_date"]
        end = date_range["end_date"]

        date_diff = (end - start).days
        if date_diff > 90:
            raise ValidationException("최대 3개월 내의 데이터만 다운로드할 수 있습니다")
    else:
        # 기본값: 최근 1주일
        end = get_kst_now()
        start = end - timedelta(days=7)

    # 쿼리 구성
    query = db.query(Dashboard).filter(Dashboard.create_time.between(start, end))

    # 필터 적용
    if params.status:
        query = query.filter(Dashboard.status == params.status)
    if params.type:
        query = query.filter(Dashboard.type == params.type)
    if params.department:
        query = query.filter(Dashboard.department == params.department)
    if params.warehouse:
        query = query.filter(Dashboard.warehouse == params.warehouse)

    # 데이터 조회
    results = query.all()

    # 데이터가 없는 경우 에러 응답
    if not results:
        return Response(
            content="조회된 데이터가 없습니다".encode("utf-8"),
            media_type="text/plain",
            status_code=404,
        )

    # 결과를 DataFrame으로 변환
    data = []
    for item in results:
        data.append(
            {
                "주문번호": item.order_no,
                "유형": "배송" if item.type == "DELIVERY" else "회수",
                "상태": {
                    "WAITING": "대기",
                    "IN_PROGRESS": "진행",
                    "COMPLETE": "완료",
                    "ISSUE": "이슈",
                    "CANCEL": "취소",
                }.get(item.status, item.status),
                "부서": item.department,
                "창고": {
                    "SEOUL": "서울",
                    "BUSAN": "부산",
                    "GWANGJU": "광주",
                    "DAEJEON": "대전",
                }.get(item.warehouse, item.warehouse),
                "SLA": item.sla,
                "ETA": format_datetime(item.eta, "%Y-%m-%d %H:%M"),
                "생성일시": format_datetime(item.create_time, "%Y-%m-%d %H:%M"),
                "출발일시": (
                    format_datetime(item.depart_time, "%Y-%m-%d %H:%M")
                    if item.depart_time
                    else ""
                ),
                "완료일시": (
                    format_datetime(item.complete_time, "%Y-%m-%d %H:%M")
                    if item.complete_time
                    else ""
                ),
                "우편번호": item.postal_code,
                "지역": item.region,
                "주소": item.address,
                "거리(km)": item.distance,
                "소요시간(분)": item.duration_time,
                "고객명": item.customer,
                "연락처": item.contact,
                "기사명": item.driver_name,
                "기사연락처": item.driver_contact,
                "메모": item.remark,
            }
        )

    # DataFrame 생성
    df = pd.DataFrame(data)

    # 엑셀 파일로 변환
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        df.to_excel(writer, index=False, sheet_name="Dashboard")

        # 열 너비 자동 조정
        worksheet = writer.sheets["Dashboard"]
        for i, col in enumerate(df.columns):
            max_width = max(df[col].astype(str).map(len).max(), len(col)) + 2
            worksheet.set_column(i, i, max_width)

    output.seek(0)

    # 파일명 생성 (KST 기준 현재 시간)
    filename = f"dashboard_{get_kst_now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/date-range", response_model=ApiResponse[Dict[str, str]])
@error_handler("다운로드 가능 날짜 범위 조회")
async def get_download_date_range(
    db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)
):
    """다운로드 가능 날짜 범위 조회 API"""

    # 가장 오래된 데이터와 최신 데이터의 날짜 조회
    oldest_create_time = db.query(func.min(Dashboard.create_time)).scalar()
    latest_create_time = db.query(func.max(Dashboard.create_time)).scalar()

    # 데이터가 없는 경우 현재를 기준으로 범위 설정
    if not oldest_create_time or not latest_create_time:
        now = get_kst_now()
        oldest_create_time = now - timedelta(days=90)  # 최대 3개월
        latest_create_time = now

    # 최대 3개월로 제한
    max_range_date = latest_create_time - timedelta(days=90)
    if oldest_create_time < max_range_date:
        oldest_create_time = max_range_date

    # 응답 생성
    date_range = {
        "oldest_date": format_datetime(oldest_create_time, "%Y-%m-%d"),
        "latest_date": format_datetime(latest_create_time, "%Y-%m-%d"),
    }

    return ApiResponse(
        success=True, message="다운로드 가능 날짜 범위를 조회했습니다", data=date_range
    )
