"""기사 관련 스키마"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class DriverResponse(BaseModel):
    """기사 정보 응답 스키마"""
    driver_id: int
    driver_name: str
    driver_contact: str
    driver_remark: Optional[str] = None

    class Config:
        from_attributes = True

class DriverListResponse(BaseModel):
    """기사 목록 응답 스키마"""
    driver_id: int
    driver_name: str
    driver_contact: str
    driver_remark: Optional[str] = None
    active_deliveries: int = 0

    class Config:
        from_attributes = True

