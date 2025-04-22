"""
날짜 변환 관련 유틸리티 함수
"""

from datetime import datetime, timedelta
from typing import Tuple, Optional
from backend.utils.logger import logger

# 지원할 날짜/시간 형식 리스트
SUPPORTED_FORMATS = [
    "%Y-%m-%d %H:%M",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d",
]


def _parse_flexible_datetime(date_str: str) -> Optional[datetime]:
    """지원하는 형식으로 날짜 문자열 파싱 시도"""
    if not date_str:
        return None
    for fmt in SUPPORTED_FORMATS:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    logger.warning(
        f"지원되지 않는 날짜 형식 또는 잘못된 값: '{date_str}'. 지원 형식: {SUPPORTED_FORMATS}"
    )
    return None


def get_date_range(
    start_date: Optional[str], end_date: Optional[str]
) -> Tuple[datetime, datetime]:
    """
    문자열 형식의 시작일과 종료일을 기반으로 날짜 범위(naive datetime) 반환.
    YYYY-MM-DD HH:MM 형식을 포함한 여러 형식 지원.
    """
    now = datetime.now()
    start_datetime_naive, end_datetime_naive = None, None

    # 시작일 파싱 (naive)
    if start_date:
        parsed_start = _parse_flexible_datetime(start_date)
        if parsed_start:
            start_datetime_naive = parsed_start
            # 시간 정보가 없으면 00:00으로 간주
            if (
                start_datetime_naive.hour == 0
                and start_datetime_naive.minute == 0
                and start_datetime_naive.second == 0
            ):
                pass  # YYYY-MM-DD 형식으로 들어온 경우 그대로 사용 (00:00)
        else:
            logger.warn(
                f"시작 날짜 파싱 실패: '{start_date}'. 기본값(오늘 00:00) 사용."
            )
            start_datetime_naive = now.replace(
                hour=0, minute=0, second=0, microsecond=0
            )
    else:
        # 기본값: 오늘 00:00
        start_datetime_naive = now.replace(hour=0, minute=0, second=0, microsecond=0)
        logger.debug(f"시작 날짜 없음. 기본값 사용: {start_datetime_naive}")

    # 종료일 파싱 (naive)
    if end_date:
        parsed_end = _parse_flexible_datetime(end_date)
        if parsed_end:
            end_datetime_naive = parsed_end
            # 시간 정보가 없거나 자정으로 들어오면 해당 일의 끝(23:59:59)으로 간주
            if (
                end_datetime_naive.hour == 0
                and end_datetime_naive.minute == 0
                and end_datetime_naive.second == 0
            ):
                end_datetime_naive = end_datetime_naive.replace(
                    hour=23, minute=59, second=59, microsecond=999999
                )
                logger.debug(f"종료 날짜 시간 조정: 자정 -> 23:59:59")
        else:
            logger.warn(f"종료 날짜 파싱 실패: '{end_date}'. 기본값(오늘 23:59) 사용.")
            # 기본값: 오늘 23:59:59
            end_datetime_naive = now.replace(
                hour=23, minute=59, second=59, microsecond=999999
            )
    else:
        # 기본값: 오늘 23:59:59
        end_datetime_naive = now.replace(
            hour=23, minute=59, second=59, microsecond=999999
        )
        logger.debug(f"종료 날짜 없음. 기본값 사용: {end_datetime_naive}")

    # 시작일/종료일 유효성 검사 (naive 객체로 비교)
    if end_datetime_naive < start_datetime_naive:
        logger.warning(
            f"종료일({end_datetime_naive})이 시작일({start_datetime_naive})보다 빠릅니다. 기본 범위(오늘 하루) 사용."
        )
        start_datetime_naive = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_datetime_naive = now.replace(
            hour=23, minute=59, second=59, microsecond=999999
        )

    logger.debug(
        f"최종 계산된 날짜 범위: {start_datetime_naive} ~ {end_datetime_naive}"
    )
    return start_datetime_naive, end_datetime_naive


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
    지원하는 형식의 날짜 문자열을 datetime 객체로 변환
    """
    return _parse_flexible_datetime(date_str)


# 기존 함수 호환성 유지
parse_iso_datetime = parse_datetime
