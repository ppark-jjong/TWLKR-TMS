"""기사 관련 API 라우터"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.user_model import User
from app.schemas.driver_schema import (
    DriverResponse,
    DriverListResponse,
)
from app.services.driver_service import DriverService
from app.services.auth_service import get_current_user
from app.utils.logger_util import Logger

router = APIRouter(prefix="/drivers", tags=["기사"])

def get_driver_service(db: Session = Depends(get_db)) -> DriverService:
    """DriverService 의존성 주입"""
    return DriverService(db)

@router.get("/", response_model=List[DriverResponse])
async def get_drivers(
    service: DriverService = Depends(get_driver_service),
    current_user: User = Depends(get_current_user)
):
    """기사 목록 조회"""
    try:
        Logger.info("기사 목록 조회 시도")
        drivers = await service.get_drivers()
        Logger.info(f"기사 목록 조회 성공: {len(drivers)}건")
        return drivers
    except Exception as e:
        Logger.error(f"기사 목록 조회 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="기사 목록 조회 중 오류가 발생했습니다."
        )
