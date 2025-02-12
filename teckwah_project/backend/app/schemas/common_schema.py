# backend/app/schemas/common_schema.py
from pydantic import BaseModel
from typing import Optional, Any


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Optional[dict] = None
