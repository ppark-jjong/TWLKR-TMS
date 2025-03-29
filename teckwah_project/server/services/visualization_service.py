# teckwah_project/server/services/visualization_service.py
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import pandas as pd

from server.utils.logger import log_info, log_error
from server.utils.datetime import get_kst_now
from server.repositories.visualization_repository import VisualizationRepository
from server.utils.constants import MESSAGES


class VisualizationService:
    """시각화 서비스"""

    def __init__(self, visualization_repository: VisualizationRepository):
        self.repository = visualization_repository

    def get_delivery_status(
        self, start_time: datetime, end_time: datetime
    ) -> Dict[str, Any]:
        """배송 현황 데이터 조회 (생성 시간 기준)
        - 부서별, 상태별 통계 데이터 생성
        """
        try:
            log_info(f"배송 현황 데이터 조회: {start_time} ~ {end_time}")

            # 1. 원시 데이터 조회
            raw_data = self.repository.get_raw_delivery_data(start_time, end_time)
            if not raw_data:
                log_info(MESSAGES["DATA"]["EMPTY"])
                return self._create_empty_delivery_status()

            # 2. DataFrame 변환
            df = pd.DataFrame(raw_data, columns=["department", "status", "create_time"])

            # 3. 전체 건수 계산
            total_count = len(df)

            # 4. 부서별, 상태별 집계
            department_status_counts = (
                df.groupby(["department", "status"]).size().reset_index(name="count")
            )

            # 5. 부서별 합계 계산
            department_counts = (
                department_status_counts.groupby("department")["count"]
                .sum()
                .reset_index()
            )

            # 6. 응답 데이터 구조 생성
            department_breakdown = {}
            for _, dept_row in department_counts.iterrows():
                dept = dept_row["department"]
                dept_total = dept_row["count"]

                # 부서별 상태 데이터
                status_data = []
                for _, status_row in department_status_counts[
                    department_status_counts["department"] == dept
                ].iterrows():
                    status = status_row["status"]
                    count = status_row["count"]
                    percentage = round(count / dept_total * 100, 1)
                    status_data.append(
                        {
                            "status": status,
                            "count": int(count),
                            "percentage": percentage,
                        }
                    )

                department_breakdown[dept] = {
                    "total": int(dept_total),
                    "status_breakdown": status_data,
                }

            # 7. 결과 반환
            return {
                "type": "delivery_status",
                "total_count": total_count,
                "department_breakdown": department_breakdown,
            }

        except Exception as e:
            log_error(e, "배송 현황 데이터 조회 실패")
            # 오류 시 빈 데이터 반환
            return self._create_empty_delivery_status()

    def get_hourly_orders(
        self, start_time: datetime, end_time: datetime
    ) -> Dict[str, Any]:
        """시간대별 접수량 데이터 조회 (생성 시간 기준)
        - 부서별, 시간대별 통계 데이터 생성
        """
        try:
            log_info(f"시간대별 접수량 데이터 조회: {start_time} ~ {end_time}")

            # 1. 원시 데이터 조회
            raw_data = self.repository.get_raw_hourly_data(start_time, end_time)
            if not raw_data:
                log_info(MESSAGES["DATA"]["EMPTY"])
                return self._create_empty_hourly_orders()

            # 2. DataFrame 변환
            df = pd.DataFrame(raw_data, columns=["department", "create_time"])

            # 3. 전체 건수 계산
            total_count = len(df)

            # 4. 시간대 추출
            df["hour"] = df["create_time"].dt.hour

            # 5. 시간대 구분 (주간/야간)
            def categorize_hour(hour):
                if 9 <= hour <= 18:
                    return f"{hour:02d}-{hour+1:02d}"  # 09-10, 10-11, ...
                else:
                    return "야간(19-09)"

            df["time_slot"] = df["hour"].apply(categorize_hour)

            # 6. 시간대별 설정
            time_slots = []
            for hour in range(9, 19):
                time_slots.append(
                    {
                        "label": f"{hour:02d}-{hour+1:02d}",
                        "start": hour,
                        "end": hour + 1,
                    }
                )
            # 야간 시간대 추가
            time_slots.append({"label": "야간(19-09)", "start": 19, "end": 9})

            # 7. 부서별, 시간대별 집계
            department_hourly_counts = (
                df.groupby(["department", "time_slot"]).size().reset_index(name="count")
            )

            # 8. 전체 기간 일수 계산 (평균 계산용)
            days = (end_time - start_time).days + 1
            days = max(1, days)  # 0으로 나누기 방지

            # 9. 부서별 데이터 구성
            department_breakdown = {}
            for dept in df["department"].unique():
                hourly_counts = {}

                dept_data = department_hourly_counts[
                    department_hourly_counts["department"] == dept
                ]

                # 모든 시간대에 대해 데이터 생성
                for slot in time_slots:
                    slot_label = slot["label"]
                    row = dept_data[dept_data["time_slot"] == slot_label]
                    count = int(row["count"].sum() if not row.empty else 0)
                    hourly_counts[slot_label] = count

                dept_total = sum(hourly_counts.values())

                department_breakdown[dept] = {
                    "total": dept_total,
                    "hourly_counts": hourly_counts,
                }

            # 10. 일 평균 계산
            average_count = round(total_count / days, 1)

            # 11. 결과 반환
            return {
                "type": "hourly_orders",
                "total_count": total_count,
                "average_count": average_count,
                "department_breakdown": department_breakdown,
                "time_slots": time_slots,
                "days": days,
            }

        except Exception as e:
            log_error(e, "시간대별 접수량 데이터 조회 실패")
            # 오류 시 빈 데이터 반환
            return self._create_empty_hourly_orders()

    def get_date_range(self) -> Tuple[datetime, datetime]:
        """조회 가능한 날짜 범위 조회 (create_time 기준)"""
        try:
            return self.repository.get_date_range()
        except Exception as e:
            log_error(e, "날짜 범위 조회 실패")
            now = get_kst_now()
            return now - timedelta(days=30), now

    def _create_empty_delivery_status(self) -> Dict[str, Any]:
        """빈 배송 현황 데이터 생성"""
        return {
            "type": "delivery_status",
            "total_count": 0,
            "department_breakdown": {
                "CS": {"total": 0, "status_breakdown": []},
                "HES": {"total": 0, "status_breakdown": []},
                "LENOVO": {"total": 0, "status_breakdown": []},
            },
        }

    def _create_empty_hourly_orders(self) -> Dict[str, Any]:
        """빈 시간대별 접수량 데이터 생성"""
        # 시간대 설정
        time_slots = []
        for hour in range(9, 19):
            time_slots.append(
                {"label": f"{hour:02d}-{hour+1:02d}", "start": hour, "end": hour + 1}
            )
        time_slots.append({"label": "야간(19-09)", "start": 19, "end": 9})

        empty_hourly_counts = {}
        for slot in time_slots:
            empty_hourly_counts[slot["label"]] = 0

        return {
            "type": "hourly_orders",
            "total_count": 0,
            "average_count": 0,
            "department_breakdown": {
                "CS": {"total": 0, "hourly_counts": empty_hourly_counts.copy()},
                "HES": {"total": 0, "hourly_counts": empty_hourly_counts.copy()},
                "LENOVO": {"total": 0, "hourly_counts": empty_hourly_counts.copy()},
            },
            "time_slots": time_slots,
            "days": 1,
        }
