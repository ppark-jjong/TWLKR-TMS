"""
응답 형식 표준화 미들웨어

기능:
1. 필드 이름은 Pydantic의 alias 기능을 통해 변환
2. 날짜 형식은 Pydantic의 json_encoders를 통해 통일 ('YYYY-MM-DD HH:MM:SS' 형식으로)
3. region 필드 자동 생성과 같은 특수 처리 유지
"""

import json
import re
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from typing import Dict, Any, List, Union
import datetime

from backend.utils.logger import logger


# 이 함수는 이제 사용하지 않음 - Pydantic의 json_encoders가 모든 날짜 변환 담당
# 호환성을 위해 함수는 남겨둠
def format_datetime(date_str: str) -> str:
    """ISO 형식 날짜에서 T를 공백으로 변환 (레거시 지원)"""
    if not date_str:
        return date_str
    return re.sub(r'(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})', r'\1 \2', date_str)


def process_json_value(value: Any) -> Any:
    """JSON 값 처리 - Pydantic에서 대부분 처리되므로 간소화"""
    if isinstance(value, dict):
        return process_json_dict(value)
    elif isinstance(value, list):
        return [process_json_value(item) for item in value]
    # datetime 객체는 이미 Pydantic 모델에서 처리됨
    return value


def process_json_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """딕셔너리 처리 (필드 이름 변환 없이 값만 처리)"""
    result = {}
    for key, value in data.items():
        # region 필드가 없는 경우 처리는 유지 (Dashboard 모델)
        if key == 'dashboard_id' and 'region' not in data and all(k in data for k in ['city', 'county', 'district']):
            # city, county, district가 있지만 region이 없는 경우, region 필드 생성
            city = data.get('city', '')
            county = data.get('county', '')
            district = data.get('district', '')
            parts = [p for p in [city, county, district] if p]
            result['region'] = ' '.join(parts)
        
        # 값 처리 (재귀적으로) - 키 이름은 변경하지 않음
        result[key] = process_json_value(value)
    
    return result


from starlette.responses import StreamingResponse, JSONResponse, Response as StarletteResponse

class JSONResponseMiddleware(BaseHTTPMiddleware):
    """
    JSON 응답 형식을 표준화하는 미들웨어
    - ISO 8601 형식의 날짜 문자열에서 T를 공백으로 변환
    - 누락 필드 자동 보완
    - 변수명 변환은 제거 (Pydantic alias로 대체)
    """
    async def dispatch(self, request: Request, call_next):
        # 원래 응답 호출
        response = await call_next(request)
        
        # Content-Type 헤더가 없는 경우도 처리
        content_type = response.headers.get("content-type", "")
        
        # JSON 응답인 경우에만 처리 (StreamingResponse는 제외)
        if ('application/json' in content_type and 
            not isinstance(response, StreamingResponse)):
            try:
                # JSONResponse는 직접 body 접근 가능
                if isinstance(response, JSONResponse):
                    # JSONResponse에서 직접 데이터 추출
                    data = response.body_iterator
                    if isinstance(data, (bytes, bytearray)):
                        body_str = data.decode('utf-8')
                    else:
                        # 문자열로 변환 (iterator 등의 경우)
                        body_str = json.dumps(response.body)
                else:
                    # 일반 Response의 경우
                    try:
                        # Response.body가 있는 경우
                        body = response.body
                        body_str = body.decode('utf-8')
                    except (AttributeError, UnicodeDecodeError):
                        # body 접근 불가 또는 디코딩 불가 - 로깅 없이 원본 반환
                        return response
                
                # JSON 파싱 시도
                try:
                    data = json.loads(body_str)
                    
                    # 데이터 처리 (날짜 형식만 변환)
                    processed_data = process_json_dict(data)
                    
                    # 새 JSON 문자열 생성
                    new_body = json.dumps(processed_data).encode('utf-8')
                    
                    # 새 응답 생성
                    return StarletteResponse(
                        content=new_body,
                        status_code=response.status_code,
                        headers=dict(response.headers),
                        media_type="application/json"
                    )
                except json.JSONDecodeError:
                    # 유효한 JSON이 아닌 경우 - 로깅 제거
                    return response
            except Exception as e:
                # 심각한 오류만 간결하게 로깅
                logger.error(f"[API] 응답 변환 오류")
                # 오류 발생 시 원본 응답 반환
        
        # JSON이 아니거나 처리할 수 없는 응답은 그대로 반환
        return response