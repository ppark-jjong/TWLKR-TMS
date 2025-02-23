# backend/app/services/visualization_service.py
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Tuple
from fastapi import HTTPException, status
from app.repositories.visualization_repository import VisualizationRepository
from app.utils.logger import log_error


class VisualizationService:
    def __init__(self, repository: VisualizationRepository):
        self.repository = repository
        self.departments = ["CS", "HES", "LENOVO"]
        self.status_list = ["WAITING", "IN_PROGRESS", "COMPLETE", "ISSUE", "CANCEL"]

    def get_delivery_status(self, start_date: datetime, end_date: datetime):
        """부서별 배송 현황 데이터 조회 및 분석"""
        try:
            # 데이터 조회 (ETA 기준으로 데이터 조회)
            df = pd.DataFrame(
                self.repository.get_raw_delivery_data(start_date, end_date),
                columns=["department", "status", "create_time"],
            )

            if df.empty:
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

            # 부서별 상태 분석
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
                    total = dept_data.sum()

                    status_breakdown = []
                    for status in self.status_list:
                        count = int(dept_data.get(status, 0))
                        percentage = round((count / total * 100), 2) if total > 0 else 0
                        status_breakdown.append(
                            {"status": status, "count": count, "percentage": percentage}
                        )

                    department_breakdown[dept] = {
                        "total": int(total),
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

            return {
                "type": "delivery_status",
                "total_count": int(df["create_time"].count()),
                "department_breakdown": department_breakdown,
            }

        except Exception as e:
            log_error(e, "배송 현황 데이터 분석 실패")
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

    def get_hourly_orders(self, start_date: datetime, end_date: datetime):
        """부서별 시간대별 접수량 데이터 조회 및 분석"""
        try:
            # 데이터 조회 (ETA 기준으로 데이터 조회)
            df = pd.DataFrame(
                self.repository.get_raw_hourly_data(start_date, end_date),
                columns=["department", "create_time"],
            )

            if df.empty:
                time_slots = ["야간(22-08)"] + [
                    f"{h:02d}-{(h+1):02d}" for h in range(8, 22)
                ]
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
                        {
                            "label": slot,
                            "start": (
                                int(slot.split("-")[0]) if slot != "야간(22-08)" else 22
                            ),
                        }
                        for slot in time_slots
                    ],
                }

            # create_time 기준으로 시간대 분석
            df["hour"] = df["create_time"].dt.hour
            df["time_slot"] = df["hour"].apply(
                lambda x: (
                    "야간(22-08)" if (x >= 22 or x < 8) else f"{x:02d}-{(x+1):02d}"
                )
            )

            # 시간대별 집계
            hourly_pivot = pd.pivot_table(
                df,
                values="create_time",
                index="department",
                columns="time_slot",
                aggfunc="count",
                fill_value=0,
            )

            # 정렬을 위한 시간대 리스트 생성
            time_slots = ["야간(22-08)"] + [
                f"{h:02d}-{(h+1):02d}" for h in range(8, 22)
            ]

            # 결과 포맷팅
            department_breakdown = {}
            for dept in self.departments:
                if dept in hourly_pivot.index:
                    dept_data = hourly_pivot.loc[dept]

                    hourly_counts = {}
                    for slot in time_slots:
                        hourly_counts[slot] = int(dept_data.get(slot, 0))

                    department_breakdown[dept] = {
                        "total": int(dept_data.sum()),
                        "hourly_counts": hourly_counts,
                    }
                else:
                    department_breakdown[dept] = {
                        "total": 0,
                        "hourly_counts": {slot: 0 for slot in time_slots},
                    }

            total_count = int(df["create_time"].count())
            days_between = (end_date - start_date).days + 1
            average_count = round(total_count / max(days_between, 1), 1)

            return {
                "type": "hourly_orders",
                "total_count": total_count,
                "average_count": average_count,
                "department_breakdown": department_breakdown,
                "time_slots": [
                    {
                        "label": slot,
                        "start": (
                            int(slot.split("-")[0]) if slot != "야간(22-08)" else 22
                        ),
                    }
                    for slot in time_slots
                ],
            }

        except Exception as e:
            log_error(e, "시간대별 접수량 데이터 분석 실패")
            time_slots = ["야간(22-08)"] + [
                f"{h:02d}-{(h+1):02d}" for h in range(8, 22)
            ]
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
                    {
                        "label": slot,
                        "start": (
                            int(slot.split("-")[0]) if slot != "야간(22-08)" else 22
                        ),
                    }
                    for slot in time_slots
                ],
            }

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 (ETA 기준)"""
        try:
            oldest_date, latest_date = self.repository.get_date_range()
            return oldest_date, latest_date
        except Exception as e:
            log_error(e, "날짜 범위 조회 실패")
            now = datetime.now()
            return now - timedelta(days=30), now
