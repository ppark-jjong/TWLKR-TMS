"""기사 레포지토리"""

from typing import List, Optional, Dict
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.driver_model import Driver
from app.models.dashboard_model import Dashboard
from app.utils.logger_util import Logger


class DriverRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_list(self) -> List[Driver]:
        """기사 목록 조회"""
        try:
            return self.db.query(Driver).order_by(Driver.driver_name.asc()).all()
        except Exception as e:
            Logger.error(f"기사 목록 조회 중 오류 발생: {str(e)}")
            raise

    def get_by_id(self, driver_id: int) -> Optional[Driver]:
        """기사 ID로 조회"""
        try:
            return self.db.query(Driver).filter(Driver.driver_id == driver_id).first()
        except Exception as e:
            Logger.error(f"기사 조회 중 오류 발생: {str(e)}")
            raise

    def get_by_contact(self, contact: str) -> Optional[Driver]:
        """기사 연락처로 조회"""
        try:
            return self.db.query(Driver).filter(Driver.driver_contact == contact).first()
        except Exception as e:
            Logger.error(f"기사 연락처 조회 중 오류 발생: {str(e)}")
            raise

    def create(self, data: Dict) -> Driver:
        """기사 등록"""
        try:
            driver = Driver(**data)
            self.db.add(driver)
            self.db.commit()
            self.db.refresh(driver)
            return driver
        except Exception as e:
            Logger.error(f"기사 등록 중 오류 발생: {str(e)}")
            self.db.rollback()
            raise

    def update(self, driver_id: int, data: Dict) -> Optional[Driver]:
        """기사 정보 수정"""
        try:
            driver = self.get_by_id(driver_id)
            if not driver:
                return None

            for key, value in data.items():
                setattr(driver, key, value)

            self.db.commit()
            self.db.refresh(driver)
            return driver
        except Exception as e:
            Logger.error(f"기사 정보 수정 중 오류 발생: {str(e)}")
            self.db.rollback()
            raise

    def delete(self, driver_id: int) -> bool:
        """기사 삭제"""
        try:
            result = self.db.query(Driver).filter(Driver.driver_id == driver_id).delete()
            self.db.commit()
            return bool(result)
        except Exception as e:
            Logger.error(f"기사 삭제 중 오류 발생: {str(e)}")
            self.db.rollback()
            raise

    def has_active_deliveries(self, driver_id: int) -> bool:
        """진행 중인 배송건 확인"""
        try:
            active_count = (
                self.db.query(Dashboard)
                .filter(
                    Dashboard.driver_id == driver_id,
                    Dashboard.status.in_(["waiting", "in_progress"])
                )
                .count()
            )
            return active_count > 0
        except Exception as e:
            Logger.error(f"진행 중인 배송건 확인 중 오류 발생: {str(e)}")
            raise
