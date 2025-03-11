# backend/app/utils/datetime_helper.py
import pytz
from datetime import datetime, timedelta
from typing import Tuple

# 한국 시간대 상수
KST = pytz.timezone("Asia/Seoul")


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
    try:
        base_date = datetime.strptime(date_str, "%Y-%m-%d")
        start_time = KST.localize(
            base_date.replace(hour=0, minute=0, second=0, microsecond=0)
        )
        end_time = KST.localize(
            base_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        )
        return start_time, end_time
    except ValueError as e:
        raise ValueError(f"날짜 형식 오류: {date_str}. YYYY-MM-DD 형식이어야 합니다.")


# 새로 추가된 유틸리티 함수들
def ensure_timezone(dt: datetime) -> datetime:
    """시간대 정보가 없는 datetime에 KST 시간대 정보 추가"""
    if dt.tzinfo is None:
        return KST.localize(dt)
    return dt


def is_naive_datetime(dt: datetime) -> bool:
    """시간대 정보가 없는 naive datetime인지 확인"""
    return dt.tzinfo is None


def format_for_db(dt: datetime) -> datetime:
    """데이터베이스 저장용 포맷으로 변환 (필요에 따라 시간대 조정)"""
    dt = ensure_timezone(dt)
    # DB가 KST로 설정되어 있으므로 KST 그대로 반환
    return dt


def format_for_json(dt: datetime) -> str:
    """JSON 응답용 시간 포맷 (ISO 8601 형식)"""
    dt = ensure_timezone(dt)
    return dt.isoformat()


def get_date_range_from_datetime(dt: datetime) -> Tuple[datetime, datetime]:
    """datetime으로부터 해당 일자의 시작과 끝 시간을 KST datetime으로 반환"""
    if dt.tzinfo is None:
        dt = KST.localize(dt)
    else:
        dt = dt.astimezone(KST)

    date_str = dt.strftime("%Y-%m-%d")
    return get_date_range(date_str)


def get_days_between(start_date: datetime, end_date: datetime) -> int:
    """두 날짜 사이의 일수 계산"""
    if start_date.tzinfo is None:
        start_date = KST.localize(start_date)
    if end_date.tzinfo is None:
        end_date = KST.localize(end_date)

    # 같은 시간대로 맞추기
    start_date = start_date.astimezone(KST)
    end_date = end_date.astimezone(KST)

    # 날짜 부분만 추출하여 계산
    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)

    # 차이 계산 (+1은 시작일 포함)
    delta = end_date - start_date
    return delta.days + 1


def format_kst_datetime(dt: datetime, format_str: str = "%Y-%m-%d %H:%M") -> str:
    """KST datetime을 지정된 형식의 문자열로 변환"""
    if dt is None:
        return ""

    if dt.tzinfo is None:
        dt = KST.localize(dt)
    else:
        dt = dt.astimezone(KST)

    return dt.strftime(format_str)
