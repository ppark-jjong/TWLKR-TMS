# teckwah_project/server/utils/datetime.py
import pytz
from datetime import datetime, timedelta, date, timezone
from typing import Tuple, Optional, Union, Dict, Any

# KST 시간대 상수 정의
KST = timezone(timedelta(hours=9))


def get_kst_now() -> datetime:
    """현재 KST 시간 반환"""
    return datetime.now(KST)


def get_kst_utcnow() -> datetime:
    """현재 UTC 시간을 KST로 변환하여 반환"""
    return datetime.now(timezone.utc).astimezone(KST)


def localize_to_kst(dt: Optional[datetime]) -> Optional[datetime]:
    """datetime 객체에 KST 시간대 정보 추가"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return KST.localize(dt)
    return dt.astimezone(KST)


def get_unix_timestamp(dt: Optional[datetime] = None) -> int:
    """datetime 객체를 UNIX 타임스탬프로 변환 (초 단위)"""
    if dt is None:
        dt = get_kst_now()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=KST)
    return int(dt.timestamp())


def get_date_range(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    default_days: int = 7,
) -> Dict[str, datetime]:
    """날짜 범위 계산"""
    end = get_kst_now()
    if end_date:
        end = parse_datetime(end_date)

    if start_date:
        start = parse_datetime(start_date)
    else:
        start = end - timedelta(days=default_days)

    return {"start_date": start, "end_date": end}


def format_datetime(dt: datetime, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """datetime 객체를 문자열로 변환"""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=KST)
    return dt.astimezone(KST).strftime(format_str)


def parse_datetime(dt_str: str) -> datetime:
    """문자열을 datetime 객체로 변환"""
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=KST)
        return dt.astimezone(KST)
    except ValueError as e:
        raise ValueError(f"잘못된 날짜/시간 형식입니다: {str(e)}")


def get_month_start_end(year: int, month: int) -> Tuple[datetime, datetime]:
    """주어진 연/월의 시작일과 종료일 반환 (KST)"""
    start_date = KST.localize(datetime(year, month, 1, 0, 0, 0))

    if month == 12:
        end_month = 1
        end_year = year + 1
    else:
        end_month = month + 1
        end_year = year

    end_date = KST.localize(datetime(end_year, end_month, 1, 0, 0, 0)) - timedelta(
        seconds=1
    )
    return start_date, end_date


def is_future_date(dt: datetime) -> bool:
    """주어진 날짜가 미래인지 확인"""
    now = get_kst_now()
    return dt > now


def date_diff_days(date1: Union[date, datetime], date2: Union[date, datetime]) -> int:
    """두 날짜 간의 일수 차이 계산"""
    if isinstance(date1, datetime):
        date1 = date1.date()
    if isinstance(date2, datetime):
        date2 = date2.date()
    return (date1 - date2).days


def calculate_eta(
    distance: int, duration_time: int, base_time: Optional[datetime] = None
) -> datetime:
    """예상 도착 시간 계산"""
    if base_time is None:
        base_time = get_kst_now()

    # 거리와 소요시간을 고려하여 ETA 계산
    # 실제 구현에서는 더 복잡한 로직이 필요할 수 있음
    eta = base_time + timedelta(minutes=duration_time)
    return eta


def is_expired(dt: datetime, max_age: timedelta) -> bool:
    """만료 여부 확인"""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=KST)
    return get_kst_now() - dt > max_age


def get_time_diff(start_time: datetime, end_time: datetime) -> timedelta:
    """두 시간의 차이 계산"""
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=KST)
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=KST)
    return end_time - start_time


def format_duration(duration: timedelta) -> str:
    """시간 차이를 읽기 쉬운 문자열로 변환"""
    total_seconds = int(duration.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60

    if hours > 0:
        return f"{hours}시간 {minutes}분"
    elif minutes > 0:
        return f"{minutes}분 {seconds}초"
    else:
        return f"{seconds}초"
