"""
날짜 변환 관련 유틸리티 함수
"""

from datetime import datetime, timedelta
from typing import Tuple, Optional
from dateutil import parser
from backend.utils.logger import logger


def get_date_range(
    start_date: Optional[str], end_date: Optional[str]
) -> Tuple[datetime, datetime]:
    """
    문자열 형식의 시작일과 종료일을 기반으로 날짜 범위(naive datetime) 반환.
    다양한 날짜 형식을 지원 (YYYY-MM-DD HH:mm:ss 포함).
    파싱 실패 시 기본값 사용.
    """
    now = datetime.now()
    start_datetime, end_datetime = None, None

    # 시작일 파싱 (ignoretz=True 로 타임존 무시)
    if start_date:
        try:
            start_datetime = parser.parse(start_date, ignoretz=True)
            # 시간 정보가 없는 경우 00:00:00으로 설정
            if (
                start_datetime.hour == 0
                and start_datetime.minute == 0
                and start_datetime.second == 0
            ):
                start_datetime = start_datetime.replace(microsecond=0)  # 밀리초 제거
        except Exception as e:
            logger.warn(f"시작 날짜 파싱 실패: '{start_date}', 오류: {e}. 기본값 사용.")
            start_datetime = now.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        # 기본값: 오늘 시작
        start_datetime = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # 종료일 파싱 (ignoretz=True 로 타임존 무시)
    if end_date:
        try:
            end_datetime = parser.parse(end_date, ignoretz=True)
            # 시간 정보가 없는 경우 23:59:59.999999 로 설정되므로, 이를 명시적으로 조정 준비
            if (
                end_datetime.hour == 0
                and end_datetime.minute == 0
                and end_datetime.second == 0
            ):
                # 날짜만 입력된 경우, 해당 일자의 끝으로 설정 (23:59:59)
                end_datetime = end_datetime.replace(
                    hour=23, minute=59, second=59, microsecond=999999
                )
            else:
                # 시간까지 명시된 경우 그대로 사용 (밀리초 유지 가능)
                pass  # end_datetime은 파싱된 값 그대로 사용
        except Exception as e:
            logger.warn(f"종료 날짜 파싱 실패: '{end_date}', 오류: {e}. 기본값 사용.")
            # 기본값: 내일 시작 (오늘 자정 + 1일)
            end_datetime = now.replace(
                hour=0, minute=0, second=0, microsecond=0
            ) + timedelta(days=1)
    else:
        # 기본값: 내일 시작 (오늘 자정 + 1일)
        end_datetime = now.replace(
            hour=0, minute=0, second=0, microsecond=0
        ) + timedelta(days=1)

    # 종료일 최종 조정: 23:59:59... 인 경우 다음날 00:00:00으로 만들어 '<' 비교 용이하게 함
    if (
        end_datetime
        and end_datetime.hour == 23
        and end_datetime.minute == 59
        and end_datetime.second == 59
    ):
        end_datetime = end_datetime.replace(
            hour=0, minute=0, second=0, microsecond=0
        ) + timedelta(days=1)

    # 시작일/종료일 유효성 검사 (필요시 추가)
    if start_datetime and end_datetime and end_datetime < start_datetime:
        logger.warn(
            f"종료일({end_datetime})이 시작일({start_datetime})보다 빠릅니다. 기본 범위 사용."
        )
        start_datetime = now.replace(hour=0, minute=0, second=0, microsecond=0)
        # 종료일도 시작일에 맞춰 재설정
        end_datetime = start_datetime.replace(
            hour=0, minute=0, second=0, microsecond=0
        ) + timedelta(days=1)

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
    다양한 형식의 날짜 문자열을 datetime 객체로 변환 (dateutil 사용)
    """
    if not date_str:
        return None
    try:
        # 타임존 정보 무시하고 파싱 (필요 시 조정)
        return parser.parse(date_str, ignoretz=True)
    except Exception as e:
        logger.warn(f"날짜 파싱 실패 (parse_datetime): '{date_str}', 오류: {e}")
        return None


# 기존 함수 호환성 유지
parse_iso_datetime = parse_datetime
