"""기사 관련 서비스"""

from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.driver_repository import DriverRepository
from app.schemas.driver_schema import (
    DriverResponse,
    DriverListResponse,
)
from app.utils.error_handler_util import handle_service_error, NotFoundError
from app.utils.logger_util import Logger


class DriverService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = DriverRepository(db)

    @handle_service_error()
    async def get_drivers(self) -> List[DriverResponse]:
        """기사 목록 조회"""
        try:
            Logger.info("기사 목록 조회 시도")
            drivers = self.repository.get_all()
            Logger.info(f"기사 목록 조회 성공: {len(drivers)}건")
            return [DriverResponse.from_orm(d) for d in drivers]
        except Exception as e:
            Logger.error(f"기사 목록 조회 중 오류 발생: {str(e)}")
            raise

    @handle_service_error()
    async def get_driver_deliveries(self, driver_id: str) -> List[DriverListResponse]:
        """기사별 배송 이력 조회"""
        try:
            Logger.info(f"기사 배송 이력 조회 시도: driver_id={driver_id}")
            deliveries = self.repository.get_deliveries(driver_id)
            Logger.info(f"기사 배송 이력 조회 성공: {len(deliveries)}건")
            return [DriverListResponse.from_orm(d) for d in deliveries]
        except Exception as e:
            Logger.error(f"기사 배송 이력 조회 중 오류 발생: {str(e)}")
            raise