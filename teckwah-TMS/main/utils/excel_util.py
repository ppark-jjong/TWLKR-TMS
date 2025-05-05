"""
엑셀 파일 생성 유틸리티
"""

import io
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import xlsxwriter
from fastapi.responses import Response

logger = logging.getLogger(__name__)


def create_excel_file(
    data: List[Dict[str, Any]],
    headers: Dict[str, str],
    sheet_name: str = "데이터",
    filename: str = None,
) -> Response:
    """
    데이터와 헤더를 받아 엑셀 파일을 생성하여 Response 객체로 반환합니다.

    Args:
        data: 엑셀 파일에 저장할 데이터 리스트
        headers: 엑셀 파일 컬럼 헤더 (key: 데이터 필드명, value: 표시될 헤더명)
        sheet_name: 워크시트 이름
        filename: 다운로드 파일명 (기본값: '데이터_YYYY-MM-DD.xlsx')

    Returns:
        Response: 엑셀 파일을 담은 FastAPI Response 객체
    """
    if not filename:
        now = datetime.now().strftime("%Y-%m-%d")
        filename = f"{sheet_name}_{now}.xlsx"

    # 메모리 내 파일 객체 생성
    output = io.BytesIO()

    # 워크북 및 워크시트 생성
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet(sheet_name)

    # 헤더 스타일 정의
    header_format = workbook.add_format(
        {
            "bold": True,
            "align": "center",
            "valign": "vcenter",
            "fg_color": "#D9D9D9",
            "border": 1,
        }
    )

    # 데이터 셀 포맷 정의
    cell_format = workbook.add_format(
        {
            "align": "left",
            "valign": "vcenter",
            "border": 1,
        }
    )

    # 데이터가 없는 경우
    if not data:
        # 헤더만 작성
        for col, header_name in enumerate(headers.values()):
            worksheet.write(0, col, header_name, header_format)
        workbook.close()

        # 파일을 위치 0으로 되돌림
        output.seek(0)

        # 응답 생성
        return Response(
            content=output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    # 헤더 작성
    header_keys = list(headers.keys())
    for col, header_name in enumerate(headers.values()):
        worksheet.write(0, col, header_name, header_format)

    # 데이터 작성
    for row, item in enumerate(data):
        for col, key in enumerate(header_keys):
            value = item.get(key, "")
            worksheet.write(row + 1, col, value, cell_format)

    # 컬럼 너비 자동 조정 (최소 10, 최대 50)
    for col, _ in enumerate(headers):
        max_len = len(str(headers[header_keys[col]]))
        for row in range(len(data)):
            value = str(data[row].get(header_keys[col], ""))
            max_len = max(max_len, min(len(value), 50))
        worksheet.set_column(col, col, max(10, min(max_len + 2, 50)))

    # 워크북 닫기 (필수: 데이터를 파일로 쓰기 위해)
    workbook.close()

    # 파일을 위치 0으로 되돌림
    output.seek(0)

    # 응답 생성
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def create_dashboard_excel(
    data: List[Dict[str, Any]],
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Response:
    """
    대시보드 데이터를 엑셀 파일로 변환합니다.

    Args:
        data: 대시보드 데이터 목록
        start_date: 조회 시작일 (YYYY-MM-DD)
        end_date: 조회 종료일 (YYYY-MM-DD)

    Returns:
        Response: 엑셀 파일 응답
    """
    # 기간이 있으면 파일명에 포함
    filename = "배송_목록"
    if start_date and end_date:
        filename = f"배송_목록_{start_date}_{end_date}"
    elif start_date:
        filename = f"배송_목록_{start_date}_이후"
    elif end_date:
        filename = f"배송_목록_{end_date}_이전"

    filename = f"{filename}.xlsx"

    # 엑셀 헤더 정의 - 필드명:표시명 형식
    headers = {
        "order_no": "주문번호",
        "type_label": "유형",
        "department": "부서",
        "warehouse": "창고",
        "sla": "SLA",
        "eta": "ETA",
        "postal_code": "우편번호",
        "address": "주소",
        "customer": "고객명",
        "contact": "연락처",
        "status_label": "상태",
        "driver_name": "기사명",
        "driver_contact": "기사 연락처",
        "region": "지역",
        "distance": "거리",
        "remark": "비고",
        "update_at": "수정일시",
        "update_by": "수정자",
    }

    # 날짜 포맷팅 처리
    for item in data:
        # ISO 포맷 날짜를 '년-월-일 시:분' 형식으로 변환
        if item.get("eta"):
            try:
                eta_dt = datetime.fromisoformat(item["eta"])
                item["eta"] = eta_dt.strftime("%Y-%m-%d %H:%M")
            except (ValueError, TypeError):
                pass

        if item.get("update_at"):
            try:
                update_dt = datetime.fromisoformat(item["update_at"])
                item["update_at"] = update_dt.strftime("%Y-%m-%d %H:%M")
            except (ValueError, TypeError):
                pass

    return create_excel_file(data, headers, sheet_name="배송목록", filename=filename)
