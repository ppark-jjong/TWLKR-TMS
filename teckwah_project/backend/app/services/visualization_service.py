# backend/app/services/visualization_service.py (수정)

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
            raw_data = self.repository.get_raw_delivery_data(start_date, end_date)

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

            # 데이터 조회 - create_time 기준
            raw_data = self.repository.get_raw_hourly_data(start_date, end_date)

            # 시간대 정의 (주간: 09-19시 1시간 단위, 야간: 19-09시 통합)
            day_slots = [f"{h:02d}-{(h+1):02d}" for h in range(9, 19)]
            time_slots = ["야간(19-09)"] + day_slots  # 야간을 맨 앞에 두어 표시상 구분

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
                    "time_slots": [
                        {"label": slot, "is_night": slot == "야간(19-09)"}
                        for slot in time_slots
                    ],
                }

            # pandas DataFrame으로 변환
            df = pd.DataFrame(
                raw_data,
                columns=["department", "create_time"],
            )

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
                if dept in hourly_pivot.index:
                    dept_data = hourly_pivot.loc[dept]

                    hourly_counts = {}
                    for slot in time_slots:
                        count = int(dept_data.get(slot, 0))
                        hourly_counts[slot] = count
                        total_count += count

                    department_breakdown[dept] = {
                        "total": int(dept_data.sum()),
                        "hourly_counts": hourly_counts,
                    }
                else:
                    department_breakdown[dept] = {
                        "total": 0,
                        "hourly_counts": {slot: 0 for slot in time_slots},
                    }

            # 조회 기간의 일수 계산
            days_between = (end_date - start_date).days + 1
            average_count = round(total_count / max(days_between, 1), 1)

            # 시간대 정보 구성
            time_slot_info = []
            for slot in time_slots:
                if slot == "야간(19-09)":
                    time_slot_info.append({"label": slot, "is_night": True})
                else:
                    time_slot_info.append({"label": slot, "is_night": False})

            log_info(f"시간대별 접수량 데이터 처리 완료: {total_count}건")

            return {
                "type": "hourly_orders",
                "total_count": total_count,
                "average_count": average_count,
                "department_breakdown": department_breakdown,
                "time_slots": time_slot_info,
            }

        except Exception as e:
            log_error(e, "시간대별 접수량 데이터 분석 실패")

            # 에러 발생 시 빈 결과 반환
            day_slots = [f"{h:02d}-{(h+1):02d}" for h in range(9, 19)]
            time_slots = ["야간(19-09)"] + day_slots

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
                "time_slots": [
                    {"label": slot, "is_night": slot == "야간(19-09)"}
                    for slot in time_slots
                ],
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
