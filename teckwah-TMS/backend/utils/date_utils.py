"""
날짜 변환 관련 유틸리티 함수
"""

from datetime import datetime, timedelta
from typing import Tuple, Optional


def get_date_range(start_date: Optional[str], end_date: Optional[str]) -> Tuple[datetime, datetime]:
    """
    시작일과 종료일을 기반으로 날짜 범위 반환
    
    Args:
        start_date: 날짜 문자열 (YYYY-MM-DD 또는 YYYY-MM-DD HH:MM:SS 또는 YYYY-MM-DDThh:mm:ss)
        end_date: 날짜 문자열 (YYYY-MM-DD 또는 YYYY-MM-DD HH:MM:SS 또는 YYYY-MM-DDThh:mm:ss)
        
    Returns:
        시작 datetime과 종료 datetime 튜플
    """
    now = datetime.now()
    
    # 시작일이 없는 경우 오늘 날짜의 시작으로 설정
    if not start_date:
        start_datetime = datetime(now.year, now.month, now.day, 0, 0, 0)
    else:
        # 시간 정보가 없으면 00:00:00 추가
        if "T" not in start_date and " " not in start_date:
            start_date = f"{start_date} 00:00:00"  # 공백 구분자 사용
        
        start_datetime = parse_datetime(start_date)
        if not start_datetime:
            # 파싱 실패 시 오늘 날짜의 시작으로 설정
            start_datetime = datetime(now.year, now.month, now.day, 0, 0, 0)
    
    # 종료일이 없는 경우 내일 날짜의 시작으로 설정
    if not end_date:
        tomorrow = now + timedelta(days=1)
        end_datetime = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0, 0)
    else:
        # 시간 정보가 없으면 23:59:59 추가
        if "T" not in end_date and " " not in end_date:
            end_date = f"{end_date} 23:59:59"  # 공백 구분자 사용
        
        end_datetime = parse_datetime(end_date)
        if not end_datetime:
            # 파싱 실패 시 내일 날짜의 시작으로 설정
            tomorrow = now + timedelta(days=1)
            end_datetime = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0, 0)
    
    return start_datetime, end_datetime


def format_datetime(dt: datetime) -> str:
    """
    datetime 객체를 'YYYY-MM-DD HH:MM:SS' 형식의 문자열로 변환
    
    Args:
        dt: 변환할 datetime 객체
        
    Returns:
        형식화된 문자열
    """
    if not dt:
        return ""
    
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def format_date(dt: datetime) -> str:
    """
    datetime 객체를 'YYYY-MM-DD' 형식의 문자열로 변환
    
    Args:
        dt: 변환할 datetime 객체
        
    Returns:
        형식화된 문자열
    """
    if not dt:
        return ""
    
    return dt.strftime("%Y-%m-%d")


def parse_datetime(date_str: str) -> Optional[datetime]:
    """
    다양한 형식의 날짜 문자열을 datetime 객체로 변환
    
    Args:
        date_str: 날짜 문자열 (YYYY-MM-DD HH:MM:SS 또는 YYYY-MM-DDThh:mm:ss)
        
    Returns:
        datetime 객체 또는 None (변환 실패 시)
    """
    if not date_str:
        return None
    
    # 여러 형식 지원
    formats = [
        '%Y-%m-%d %H:%M:%S',  # 공백 구분자 형식 (선호)
        '%Y-%m-%dT%H:%M:%S',  # ISO 형식
        '%Y-%m-%d',           # 날짜만 있는 경우
    ]
    
    # 타임존 정보 처리
    if date_str.endswith('Z'):
        date_str = date_str[:-1] + '+00:00'
    
    # 여러 형식 시도
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    
    # 모든 형식 실패 시
    try:
        # fromisoformat 시도 (최신 Python 버전 호환성)
        return datetime.fromisoformat(date_str.replace('Z', '+00:00').replace('T', ' '))
    except ValueError:
        return None


# 기존 함수 호환성 유지
parse_iso_datetime = parse_datetime