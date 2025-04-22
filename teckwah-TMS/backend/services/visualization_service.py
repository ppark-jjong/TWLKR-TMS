"""
시각화 데이터 처리 서비스
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models.visualization import (
    VisualizationResponse,
    TimeStatEntry,
    DepartmentStatEntry,
)
from backend.database import get_db
from backend.models.dashboard import Dashboard, OrderStatus


class VisualizationService:
    def __init__(self):
        self.db = next(get_db())

def get_visualization_stats(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        visualization_type: str = "time",
    ) -> VisualizationResponse:
        """시각화 통계 데이터 생성

        Args:
            date_from: 시작 날짜 (YYYY-MM-DD)
            date_to: 종료 날짜 (YYYY-MM-DD)
            visualization_type: 시각화 유형 (time 또는 department)

        Returns:
            VisualizationResponse: 시각화 데이터 응답 객체
        """
        # 날짜 파싱
        start_date, end_date = self._parse_date_range(date_from, date_to)

                try:
            # 데이터 조회
            orders = self._get_orders_in_date_range(start_date, end_date)

            # 시간별 통계
            time_stats = (
                self._calculate_time_stats(orders)
                if visualization_type == "time"
                else []
            )

            # 부서별 통계
            department_stats = (
                self._calculate_department_stats(orders)
                if visualization_type == "department"
                else []
            )

            return VisualizationResponse(
                success=True,
                message="데이터를 성공적으로 조회했습니다.",
                timeStats=time_stats,
                departmentStats=department_stats,
                    )

                except Exception as e:
            return VisualizationResponse(
                success=False,
                message=f"시각화 데이터 처리 중 오류가 발생했습니다: {str(e)}",
                timeStats=[],
                departmentStats=[],
            )

    def _parse_date_range(self, date_from: Optional[str], date_to: Optional[str]):
        """날짜 범위 파싱"""
        today = datetime.now().date()

        # 기본값: 최근 30일
        if not date_from:
            start_date = today - timedelta(days=30)
        else:
            start_date = datetime.strptime(date_from, "%Y-%m-%d").date()

        if not date_to:
            end_date = today
        else:
            end_date = datetime.strptime(date_to, "%Y-%m-%d").date()

        return start_date, end_date

    def _get_orders_in_date_range(self, start_date, end_date):
        """날짜 범위 내 주문 조회"""
        return (
            self.db.query(Dashboard)
            .filter(
                Dashboard.created_at >= start_date, Dashboard.created_at <= end_date
            )
            .all()
        )

    def _calculate_time_stats(self, orders) -> List[TimeStatEntry]:
        """시간대별 통계 계산"""
        # 시간대별로 분류
        time_groups = {
            "오전 (9-12시)": [],
            "오후 (12-18시)": [],
            "야간 (18-21시)": [],
        }

        for order in orders:
            created_time = order.created_at
            hour = created_time.hour

            if 9 <= hour < 12:
                time_groups["오전 (9-12시)"].append(order)
            elif 12 <= hour < 18:
                time_groups["오후 (12-18시)"].append(order)
            elif 18 <= hour < 21:
                time_groups["야간 (18-21시)"].append(order)

        # 시간대별 부서 통계
        result = []
        for time_range, orders_in_range in time_groups.items():
            entry = TimeStatEntry(
                timeRange=time_range,
                총무=self._count_by_department("총무", orders_in_range),
                회계=self._count_by_department("회계", orders_in_range),
                인사=self._count_by_department("인사", orders_in_range),
                영업=self._count_by_department("영업", orders_in_range),
                개발=self._count_by_department("개발", orders_in_range),
            )
            result.append(entry)

        return result

    def _calculate_department_stats(self, orders) -> List[DepartmentStatEntry]:
        """부서별 통계 계산"""
        departments = ["총무", "회계", "인사", "영업", "개발"]
        result = []

        for dept in departments:
            dept_orders = [o for o in orders if o.department == dept]
            total_count = len(dept_orders)

            # 상태별 카운트
            status_counts = defaultdict(int)
            for order in dept_orders:
                status_counts[order.status] += 1

            # 응답 형식으로 변환
            entry = DepartmentStatEntry(
                department=dept,
                totalCount=total_count,
                statusCounts={
                    OrderStatus.PENDING.value: status_counts.get(
                        OrderStatus.PENDING, 0
                    ),
                    OrderStatus.IN_PROGRESS.value: status_counts.get(
                        OrderStatus.IN_PROGRESS, 0
                    ),
                    OrderStatus.COMPLETED.value: status_counts.get(
                        OrderStatus.COMPLETED, 0
                    ),
                    OrderStatus.REJECTED.value: status_counts.get(
                        OrderStatus.REJECTED, 0
                    ),
                },
            )
            result.append(entry)

        return result

    def _count_by_department(self, department: str, orders: List[Dashboard]) -> int:
        """특정 부서의 주문 수 계산"""
        return len([o for o in orders if o.department == department])
