# backend/app/services/visualization_service.py
from datetime import datetime
from fastapi import HTTPException, status
from app.repositories.visualization_repository import VisualizationRepository
from app.utils.logger import log_error


class VisualizationService:
    def __init__(self, repository: VisualizationRepository):
        self.repository = repository
        self.status_map = {
            "WAITING": "대기",
            "IN_PROGRESS": "진행",
            "COMPLETE": "완료",
            "ISSUE": "이슈",
        }

    def get_delivery_status(self, start_date: datetime, end_date: datetime):
        """배송 현황 데이터 조회"""
        try:
            status_data = self.repository.get_status_counts(start_date, end_date)
            total_count = sum(count for _, count in status_data)

            if total_count == 0:
                return {"total_count": 0, "status_breakdown": []}

            status_breakdown = [
                {
                    "status": status,
                    "count": count,
                    "percentage": round((count / total_count * 100), 2),
                }
                for status, count in status_data
            ]

            return {"total_count": total_count, "status_breakdown": status_breakdown}

        except Exception as e:
            log_error(e, "배송 현황 데이터 조회 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="배송 현황 데이터 조회 중 오류가 발생했습니다",
            )

    def get_hourly_orders(self, start_date: datetime, end_date: datetime):
        """시간대별 접수량 데이터 조회"""
        try:
            hourly_data = self.repository.get_hourly_counts(start_date, end_date)

            # 0-23시간대 데이터 초기화
            hourly_counts = {hour: 0 for hour in range(24)}

            # 조회된 데이터로 업데이트
            for hour, count in hourly_data:
                hourly_counts[int(hour)] = count

            total_count = sum(hourly_counts.values())

            hourly_breakdown = [
                {"hour": hour, "count": count}
                for hour, count in sorted(hourly_counts.items())
            ]

            return {"total_count": total_count, "hourly_breakdown": hourly_breakdown}

        except Exception as e:
            log_error(e, "시간대별 접수량 데이터 조회 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="시간대별 접수량 데이터 조회 중 오류가 발생했습니다",
            )

    def get_oldest_data_date(self) -> datetime:
        """가장 오래된 데이터 날짜 조회"""
        try:
            return self.repository.get_oldest_data_date()
        except Exception as e:
            log_error(e, "가장 오래된 데이터 날짜 조회 실패")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="데이터 조회 중 오류가 발생했습니다",
            )
