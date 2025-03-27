# teckwah_project/main/server/utils/datetime_helper.py
import pytz
from datetime import datetime, timedelta

# KST 시간대 상수 정의
KST = pytz.timezone("Asia/Seoul")


def get_kst_now():
    """현재 시간을 KST로 반환"""
    return datetime.now(KST)


def get_kst_utcnow():
    """UTC 시간을 KST로 변환하여 반환 (auth_service와의 호환성용)"""
    return datetime.utcnow().replace(tzinfo=pytz.UTC).astimezone(KST)


def localize_to_kst(dt):
    """datetime 객체에 KST 시간대 정보 추가"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return KST.localize(dt)
    return dt.astimezone(KST)


def get_date_range(date_str):
    """
    날짜 문자열(YYYY-MM-DD)을 받아 해당 날짜의 시작과 끝 datetime 객체 반환
    KST 시간대로 설정하여 반환
    """
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        # 시간대 정보 추가
        start_date = KST.localize(
            datetime(date_obj.year, date_obj.month, date_obj.day, 0, 0, 0)
        )
        end_date = KST.localize(
            datetime(date_obj.year, date_obj.month, date_obj.day, 23, 59, 59)
        )
        return start_date, end_date
    except ValueError:
        raise ValueError(f"Invalid date format: {date_str}. Expected: YYYY-MM-DD")


def format_datetime(dt, format_str="%Y-%m-%d %H:%M:%S"):
    """datetime 객체를 지정된 형식의 문자열로 변환"""
    if dt is None:
        return None
    # KST 시간대로 변환
    dt = localize_to_kst(dt)
    return dt.strftime(format_str)


def parse_datetime(dt_str, format_str="%Y-%m-%d %H:%M:%S"):
    """문자열을 datetime 객체로 변환하고 KST 시간대 정보 추가"""
    if dt_str is None:
        return None
    try:
        dt = datetime.strptime(dt_str, format_str)
        return localize_to_kst(dt)
    except ValueError:
        raise ValueError(f"Invalid datetime format: {dt_str}. Expected: {format_str}")