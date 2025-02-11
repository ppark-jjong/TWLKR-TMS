# backend/app/services/visualization_service.py

from datetime import date
from typing import Dict, Any
from fastapi import HTTPException

from app.schemas.visualization_schema import (
    DeliveryStatusResponse, HourlyOrderResponse,
    StatusCount, HourlyOrderCount, VisualizationType
)
from app.repositories.visualization_repository import VisualizationRepository
from app.utils.logger import log_error, log_info
from app.utils.error_handler import (
    validate_date_range, ValidationError, 
    create_error_response
)

class VisualizationService:
    def __init__(self, visualization_repository: VisualizationRepository):
        self.repository = visualization_repository
        self.status_map = {
            "WAITING": "대기",
            "IN_PROGRESS": "진행",
            "COMPLETE": "완료",
            "ISSUE": "이슈"
        }

    def get_delivery_status(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """배송 현황 시각화 데이터 생성"""
        try:
            log_info("배송 현황 데이터 조회", {
                "start_date": start_date,
                "end_date": end_date
            })
            
            status_counts = self.repository.get_status_counts(start_date, end_date)
            total_count = sum(count for _, count in status_counts)
            
            if total_count == 0:
                return DeliveryStatusResponse(
                    total_count=0,
                    status_breakdown=[]
                ).dict()

            status_breakdown = [
                StatusCount(
                    status=self.status_map.get(status, status),
                    count=count,
                    percentage=round((count / total_count) * 100, 2)
                )
                for status, count in status_counts
            ]

            log_info("배송 현황 데이터 처리 완료", {"total_count": total_count})
            return DeliveryStatusResponse(
                total_count=total_count,
                status_breakdown=status_breakdown
            ).dict()

        except Exception as e:
            log_error(e, "배송 현황 데이터 처리 실패")
            raise HTTPException(
                status_code=500,
                detail=create_error_response(e)
            )

    def get_hourly_orders(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """시간별 접수량 시각화 데이터 생성"""
        try:
            log_info("시간별 접수량 데이터 조회", {
                "start_date": start_date,
                "end_date": end_date
            })
            
            hourly_counts = self.repository.get_hourly_counts(start_date, end_date)
            
            # 0-23시간대 데이터 초기화
            hour_dict = {hour: 0 for hour in range(24)}
            
            # 조회된 데이터로 업데이트
            total_count = 0
            for hour, count in hourly_counts:
                hour_dict[int(hour)] = count
                total_count += count

            # 시간별 데이터 리스트 생성
            hourly_breakdown = [
                HourlyOrderCount(hour=hour, count=count)
                for hour, count in hour_dict.items()
            ]

            log_info("시간별 접수량 데이터 처리 완료", {"total_count": total_count})
            return HourlyOrderResponse(
                total_count=total_count,
                hourly_breakdown=hourly_breakdown
            ).dict()

        except Exception as e:
            log_error(e, "시간별 접수량 데이터 처리 실패")
            raise HTTPException(
                status_code=500,
                detail=create_error_response(e)
            )

    def get_visualization_data(self, viz_type: VisualizationType, 
                             start_date: date, end_date: date) -> Dict[str, Any]:
        """시각화 타입에 따른 데이터 조회"""
        try:
            log_info("시각화 데이터 요청", {
                "type": viz_type,
                "start_date": start_date,
                "end_date": end_date
            })
            
            # 날짜 범위 검증
            validate_date_range(start_date, end_date)

            if viz_type == VisualizationType.DELIVERY_STATUS:
                data = self.get_delivery_status(start_date, end_date)
            elif viz_type == VisualizationType.HOURLY_ORDERS:
                data = self.get_hourly_orders(start_date, end_date)
            else:
                raise ValidationError("지원하지 않는 시각화 유형입니다")

            log_info("시각화 데이터 처리 완료", {"type": viz_type})
            return {
                "type": viz_type,
                "data": data
            }

        except ValidationError as e:
            log_error(e, "시각화 데이터 검증 실패")
            raise HTTPException(
                status_code=400,
                detail=str(e)
            )
        except Exception as e:
            log_error(e, "시각화 데이터 처리 실패")
            raise HTTPException(
                status_code=500,
                detail=create_error_response(e)
            )