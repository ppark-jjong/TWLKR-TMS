# app/utils/validator.py
import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Union, Type
from pydantic import BaseModel, ValidationError

class Validator:
    """
    유효성 검증 유틸리티 (로깅 목적으로만 사용, 예외 발생 없음)
    """
    
    @staticmethod
    def is_valid_postal_code(postal_code: str) -> bool:
        """우편번호 유효성 확인 (로깅용)"""
        if not postal_code:
            return False
        
        return bool(re.match(r"^\d{5}$", postal_code))
    
    @staticmethod
    def is_valid_contact(contact: str) -> bool:
        """연락처 유효성 확인 (로깅용)"""
        if not contact:
            return False
        
        return bool(re.match(r"^\d{2,3}-\d{3,4}-\d{4}$", contact))
    
    @staticmethod
    def is_valid_future_date(date: datetime) -> bool:
        """미래 날짜 유효성 확인 (로깅용)"""
        if not date:
            return False
        
        return date > datetime.now()