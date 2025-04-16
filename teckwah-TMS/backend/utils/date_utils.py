"""
날짜 변환 관련 유틸리티 함수
"""
from datetime import datetime, timedelta
from typing import Optional, Tuple


def parse_iso_date(date_str: Optional[str], default_today: bool = True) -> Optional[datetime]:
    """
    ISO 형식 날짜 문자열을 datetime 객체로 변환
    
    Args:
        date_str: ISO 형식 날짜 문자열 (예: '2023-01-01T00:00:00.000Z')
        default_today: 변환 실패 시 오늘 날짜 반환 여부
        
    Returns:
        변환된 datetime 객체 또는 None
    """
    if not date_str:
        return datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) if default_today else None
        
    try:
        # ISO 8601 형식 파싱 시도
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except ValueError:
        try:
            # 다른 일반적인 ISO 형식 시도
            return datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S.%fZ")
        except ValueError:
            # 기본값: 오늘
            if default_today:
                return datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            return None


def get_date_range(start_date: Optional[str], end_date: Optional[str]) -> Tuple[datetime, datetime]:
    """
    시작 및 종료 날짜 문자열을 파싱하여 적절한 datetime 범위 반환
    
    Args:
        start_date: 시작 날짜 문자열 (ISO 형식)
        end_date: 종료 날짜 문자열 (ISO 형식)
        
    Returns:
        (시작 날짜, 종료 날짜) 튜플
    """
    # 시작 날짜 처리
    start_datetime = parse_iso_date(start_date)
    
    # 종료 날짜 처리
    if end_date:
        end_datetime = parse_iso_date(end_date, default_today=False)
        if not end_datetime:
            # 시작 날짜가 있으면 +1일, 없으면 오늘 자정
            if start_datetime:
                end_datetime = start_datetime + timedelta(days=1)
            else:
                end_datetime = datetime.now().replace(
                    hour=23, minute=59, second=59, microsecond=999999
                )
    else:
        # 종료 날짜가 없으면 시작 날짜 + 1일 또는 오늘 + 1일
        end_datetime = start_datetime + timedelta(days=1)
    
    return start_datetime, end_datetime
