# backend/app/utils/datetime_helper.py
import pytz
from datetime import datetime, timedelta
from typing import Tuple

KST = pytz.timezone('Asia/Seoul')

def convert_to_kst(dt: datetime) -> datetime:
    """UTC datetime을 KST datetime으로 변환"""
    if dt.tzinfo is None:
        dt = pytz.utc.localize(dt)
    return dt.astimezone(KST)

def get_current_time() -> datetime:
    """현재 시간을 KST로 반환"""
    return datetime.now(KST)

def get_date_range(date_str: str) -> Tuple[datetime, datetime]:
    """날짜 문자열로부터 해당 일자의 시작과 끝 시간을 KST datetime으로 반환"""
    base_date = datetime.strptime(date_str, "%Y-%m-%d")
    start_time = KST.localize(base_date.replace(hour=0, minute=0, second=0, microsecond=0))
    end_time = KST.localize(base_date.replace(hour=23, minute=59, second=59, microsecond=999999))
    return start_time, end_time

def get_date_range_from_datetime(dt: datetime) -> Tuple[datetime, datetime]:
    """datetime으로부터 해당 일자의 시작과 끝 시간을 KST datetime으로 반환"""
    if dt.tzinfo is None:
        dt = KST.localize(dt)
    else:
        dt = dt.astimezone(KST)
    return get_date_range(dt.strftime("%Y-%m-%d"))