# backend/app/services/visualization_service.py
from datetime import datetime
from typing import Dict, Any
from fastapi import HTTPException, status
from app.schemas.visualization_schema import (
    ChartType,
    DeliveryStatusResponse,
    HourlyOrdersResponse,
    StatusData,
    HourlyData,
)
from app.repositories.visualization_repository import VisualizationRepository
from app.utils.logger import log_info, log_error


class VisualizationService:
    def __init__(self, repository: VisualizationRepository):
        self.repository = repository
        self.status_map = {
            "WAITING": "대기",
            "IN_PROGRESS": "진행",
            "COMPLETE": "완료",
            "ISSUE": "이슈",
        }

    def get_delivery_status(
        self, start_date: datetime, end_date: datetime
    ) -> DeliveryStatusResponse:
        """배송 현황 데이터 조회"""
        try:
            status_counts = self.repository.get_status_counts(start_date, end_date)
            total_count = sum(count for _, count in status_counts)

            if total_count == 0:
                return DeliveryStatusResponse(total_count=0, status_breakdown=[])

            status_breakdown = [
                StatusData(
                    status=self.status_map[status],
                    count=count,
                    percentage=round((count / total_count) * 100, 2),
                )
                for status, count in status_counts
            ]

            return DeliveryStatusResponse(
                total_count=total_count, status_breakdown=status_breakdown
            )

        except Exception as e:
            log_error(e, "배송 현황 데이터 조회 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="배송 현황 데이터 조회 중 오류가 발생했습니다",
            )

    def get_hourly_orders(
        self, start_date: datetime, end_date: datetime
    ) -> HourlyOrdersResponse:
        """시간대별 접수량 데이터 조회"""
        try:
            hourly_counts = self.repository.get_hourly_counts(start_date, end_date)

            # 0-23시간대 데이터 초기화
            hour_dict = {hour: 0 for hour in range(24)}

            # 조회된 데이터로 업데이트
            total_count = 0
            for hour, count in hourly_counts:
                hour_dict[int(hour)] = count
                total_count += count

            hourly_breakdown = [
                HourlyData(hour=hour, count=count)
                for hour, count in sorted(hour_dict.items())
            ]

            return HourlyOrdersResponse(
                total_count=total_count, hourly_breakdown=hourly_breakdown
            )

        except Exception as e:
            log_error(e, "시간대별 접수량 데이터 조회 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="시간대별 접수량 데이터 조회 중 오류가 발생했습니다",
            )

    def get_visualization_data(
        self, chart_type: ChartType, start_date: datetime, end_date: datetime
    ) -> Dict[str, Any]:
        """시각화 데이터 조회"""
        try:
            # 시작/종료 시간을 각각 00:00:00과 23:59:59로 보정
            start_datetime = start_date.replace(hour=0, minute=0, second=0)
            end_datetime = end_date.replace(hour=23, minute=59, second=59)

            # 1개월 초과 검증
            if (end_datetime - start_datetime).days > 31:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="조회 기간은 1개월을 초과할 수 없습니다",
                )

            if chart_type == ChartType.DELIVERY_STATUS:
                status_counts = self.repository.get_status_counts(
                    start_datetime, end_datetime
                )
                total_count = sum(count for _, count in status_counts)

                # 상태별 비율 계산 추가
                status_breakdown = [
                    {
                        "status": self.status_map[status],
                        "count": count,
                        "percentage": (
                            round((count / total_count * 100), 2)
                            if total_count > 0
                            else 0
                        ),
                    }
                    for status, count in status_counts
                ]

                return {
                    "total_count": total_count,
                    "status_breakdown": status_breakdown,
                }
            else:
                hourly_counts = self.repository.get_hourly_counts(
                    start_datetime, end_datetime
                )

                # 0-23시간대 데이터 초기화
                hour_dict = {hour: 0 for hour in range(24)}
                total_count = 0

                # 조회된 데이터로 업데이트
                for hour, count in hourly_counts:
                    hour_dict[int(hour)] = count
                    total_count += count

                return {
                    "total_count": total_count,
                    "hourly_breakdown": [
                        {"hour": hour, "count": count}
                        for hour, count in sorted(hour_dict.items())
                    ],
                }

        except HTTPException:
            raise
        except Exception as e:
            log_error(e, "시각화 데이터 조회 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="시각화 데이터 조회 중 오류가 발생했습니다",
            )
