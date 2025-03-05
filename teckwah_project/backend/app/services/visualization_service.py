# backend/app/services/visualization_service.py

import pandas as pd
from datetime import datetime, timedelta
from typing import Tuple, Dict, Any, List
from fastapi import HTTPException, status
from app.repositories.visualization_repository import VisualizationRepository
from app.utils.datetime_helper import KST
from app.utils.logger import log_info, log_error
from app.utils.constants import Department, DeliveryStatus


class VisualizationService:
    def __init__(self, repository: VisualizationRepository):
        self.repository = repository
        self.departments = [dept.value for dept in Department]
        self.status_list = [status.value for status in DeliveryStatus]

    def get_delivery_status(
        self, start_date: datetime, end_date: datetime
    ) -> Dict[str, Any]:
        """부서별 배송 현황 데이터 조회 및 분석
        (create_time 기준으로 데이터 조회 후 분석)
        """
        try:
            log_info(f"배송 현황 데이터 조회 시작: {start_date} ~ {end_date}")

            # 데이터 조회 - create_time 기준으로 변경
            raw_data = self.repository.get_raw_delivery_data(
                start_date, end_time=end_date
            )
            log_info(f"Raw 데이터 조회 결과: {len(raw_data) if raw_data else 0}건")

            # 데이터가 없는 경우 빈 결과 반환
            if not raw_data:
                log_info("배송 현황 데이터 없음")
                return {
                    "type": "delivery_status",
                    "total_count": 0,
                    "department_breakdown": {
                        dept: {
                            "total": 0,
                            "status_breakdown": [
                                {"status": status, "count": 0, "percentage": 0}
                                for status in self.status_list
                            ],
                        }
                        for dept in self.departments
                    },
                }

            # pandas DataFrame으로 변환
            df = pd.DataFrame(
                raw_data,
                columns=["department", "status", "create_time"],
            )

            # department, status 필드 유효성 검증
            df["department"] = df["department"].fillna("CS")  # 부서 누락 시 기본값
            df["status"] = df["status"].fillna("WAITING")  # 상태 누락 시 기본값

            # 존재하지 않는 부서/상태 필터링
            df = df[df["department"].isin(self.departments)]
            df = df[df["status"].isin(self.status_list)]

            # create_time 기준으로 상태 분석
            status_pivot = pd.pivot_table(
                df,
                values="create_time",
                index="department",
                columns="status",
                aggfunc="count",
                fill_value=0,
            )

            # 결과 포맷팅
            department_breakdown = {}
            for dept in self.departments:
                if dept in status_pivot.index:
                    dept_data = status_pivot.loc[dept]
                    total = int(dept_data.sum())

                    status_breakdown = []
                    for status in self.status_list:
                        count = int(dept_data.get(status, 0))
                        percentage = round((count / total * 100), 2) if total > 0 else 0
                        status_breakdown.append(
                            {"status": status, "count": count, "percentage": percentage}
                        )

                    department_breakdown[dept] = {
                        "total": total,
                        "status_breakdown": status_breakdown,
                    }
                else:
                    department_breakdown[dept] = {
                        "total": 0,
                        "status_breakdown": [
                            {"status": status, "count": 0, "percentage": 0}
                            for status in self.status_list
                        ],
                    }

            # 전체 데이터 건수
            total_count = int(df["create_time"].count())
            log_info(f"배송 현황 데이터 처리 완료: {total_count}건")

            return {
                "type": "delivery_status",
                "total_count": total_count,
                "department_breakdown": department_breakdown,
            }

        except Exception as e:
            log_error(e, "배송 현황 데이터 분석 실패")

            # 에러 발생 시 빈 결과 반환
            return {
                "type": "delivery_status",
                "total_count": 0,
                "department_breakdown": {
                    dept: {
                        "total": 0,
                        "status_breakdown": [
                            {"status": status, "count": 0, "percentage": 0}
                            for status in self.status_list
                        ],
                    }
                    for dept in self.departments
                },
            }

    def get_hourly_orders(
        self, start_date: datetime, end_date: datetime
    ) -> Dict[str, Any]:
        """부서별 시간대별 접수량 데이터 조회 및 분석
        (create_time 기준으로 데이터 조회 후 분석)

        시간대 기준:
        - 09:00 ~ 19:00: 시간 단위로 집계
        - 19:00 ~ 익일 09:00: 하나의 단위로 통합 집계
        """
        try:
            log_info(f"시간대별 접수량 데이터 조회 시작: {start_date} ~ {end_date}")

            # 시간대 정의 (주간: 09-19시 1시간 단위, 야간: 19-09시 통합)
            day_slots = [f"{h:02d}-{(h+1):02d}" for h in range(9, 19)]
            night_slot = "야간(19-09)"
            all_slots = day_slots + [night_slot]  # 모든 시간대

            # 데이터 조회 - create_time 기준
            raw_data = self.repository.get_raw_hourly_data(start_date, end_date)
            log_info(
                f"Raw 시간대별 데이터 조회 결과: {len(raw_data) if raw_data else 0}건"
            )
            # TimeSlot 객체로 변환 (문자열이 아닌 구조화된 객체)
            formatted_slots = []
            for slot in day_slots:
                start, end = map(int, slot.split("-"))
                formatted_slots.append({"label": slot, "start": start, "end": end})
            # 야간 시간대 추가
            formatted_slots.append({"label": night_slot, "start": 19, "end": 9})
            raw_data = self.repository.get_raw_hourly_data(start_date, end_date)

            # 데이터가 없는 경우 빈 결과 반환
            if not raw_data:
                log_info("시간대별 접수량 데이터 없음")
                return {
                    "type": "hourly_orders",
                    "total_count": 0,
                    "average_count": 0,
                    "department_breakdown": {
                        dept: {
                            "total": 0,
                            "hourly_counts": {slot: 0 for slot in time_slots},
                        }
                        for dept in self.departments
                    },
                    "time_slots": time_slots,
                }

            # pandas DataFrame으로 변환
            df = pd.DataFrame(
                raw_data,
                columns=["department", "create_time"],
            )

            # 부서 필드 검증
            df["department"] = df["department"].fillna("CS")  # 부서 누락 시 기본값
            df = df[
                df["department"].isin(self.departments)
            ]  # 유효하지 않은 부서 필터링

            # 시간대 분류 함수 정의
            def categorize_time_slot(hour):
                if 9 <= hour < 19:
                    return f"{hour:02d}-{(hour+1):02d}"
                else:
                    return "야간(19-09)"

            # 생성 시간 기준으로 시간대 분석
            df["hour"] = df["create_time"].dt.hour
            df["time_slot"] = df["hour"].apply(categorize_time_slot)

            # 시간대별 집계
            hourly_pivot = pd.pivot_table(
                df,
                values="create_time",
                index="department",
                columns="time_slot",
                aggfunc="count",
                fill_value=0,
            )

            # 결과 포맷팅
            department_breakdown = {}
            total_count = 0

            for dept in self.departments:
                dept_data = {}
                dept_total = 0

                for slot in time_slots:
                    count = 0
                    if dept in hourly_pivot.index and slot in hourly_pivot.columns:
                        count = int(hourly_pivot.loc[dept, slot])
                    dept_data[slot] = count
                    dept_total += count
                    total_count += count

                department_breakdown[dept] = {
                    "total": dept_total,
                    "hourly_counts": dept_data,
                }

            # 조회 기간의 일수 계산 (1일이라도 최소 1로 설정)
            days_between = max((end_date - start_date).days + 1, 1)
            average_count = round(total_count / days_between, 1)

            log_info(
                f"시간대별 접수량 데이터 처리 완료: {total_count}건, 일평균: {average_count}건"
            )

            return {
                "type": "hourly_orders",
                "total_count": total_count,
                "average_count": average_count,
                "department_breakdown": department_breakdown,
                "time_slots": formatted_slots,  # 문자열 배열이 아닌 객체 배열 사용
            }

        except Exception as e:
            log_error(e, "시간대별 접수량 데이터 분석 실패")

            # 에러 발생 시 기본 응답 형식 준수
            day_slots = [f"{h:02d}-{(h+1):02d}" for h in range(9, 19)]
            formatted_slots = []
            for slot in day_slots:
                start, end = map(int, slot.split("-"))
                formatted_slots.append({"label": slot, "start": start, "end": end})
            formatted_slots.append({"label": "야간(19-09)", "start": 19, "end": 9})

            return {
                "type": "hourly_orders",
                "total_count": 0,
                "average_count": 0,
                "department_breakdown": {
                    dept: {
                        "total": 0,
                        "hourly_counts": {
                            slot: 0 for slot in day_slots + ["야간(19-09)"]
                        },
                    }
                    for dept in self.departments
                },
                "time_slots": formatted_slots,
            }

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 (create_time 기준)"""
        try:
            oldest_date, latest_date = self.repository.get_date_range()
            if not oldest_date or not latest_date:
                now = datetime.now(KST)
                return now - timedelta(days=30), now

            return oldest_date.astimezone(KST), latest_date.astimezone(KST)

        except Exception as e:
            log_error(e, "날짜 범위 조회 실패")
            now = datetime.now(KST)
            return now - timedelta(days=30), now
