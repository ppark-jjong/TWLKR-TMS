# teckwah_project/main/server/utils/validator.py
from datetime import datetime
from typing import Dict, Any, List, Optional, Union, Type
from main.server.utils.datetime_helper import get_kst_now


class Validator:
    """
    필수 보안 검증 유틸리티
    """

    @staticmethod
    def is_valid_postal_code(postal_code: str) -> bool:
        """우편번호 유효성 확인"""
        if not postal_code:
            return False

        # 최소한의 기본 형식 검증만 유지
        return len(postal_code) == 5 and postal_code.isdigit()

    @staticmethod
    def is_valid_contact(contact: str) -> bool:
        """연락처 유효성 확인"""
        if not contact:
            return False

        # 최소한의 기본 형식 검증만 유지
        return len(contact) >= 8

    @staticmethod
    def is_future_date(date: datetime) -> bool:
        """날짜가 미래인지 확인"""
        now = get_kst_now()
        return date > now

    @staticmethod
    def is_valid_date_range(start_date: datetime, end_date: datetime) -> bool:
        """날짜 범위 유효성 확인"""
        return start_date <= end_date

    @staticmethod
    def sanitize_input(input_data: str, max_length: int = 1000) -> str:
        """입력 데이터 검증 및 정제"""
        if not input_data:
            return ""
            
        # 기본적인 입력 정제 로직
        sanitized = input_data.strip()
        
        # 최대 길이 제한
        if max_length > 0 and len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
            
        return sanitized

    @staticmethod
    def validate_dashboard_input(data: Dict[str, Any]) -> Dict[str, str]:
        """대시보드 입력 유효성 검증"""
        errors = {}
        
        # 필수 필드 확인
        required_fields = ["order_no", "type", "warehouse", "postal_code", "address", "customer", "eta"]
        for field in required_fields:
            if field not in data or not data[field]:
                errors[field] = f"{field}은(는) 필수 항목입니다"
        
        # 개별 필드 유효성 검증
        if "postal_code" in data and data["postal_code"]:
            if not Validator.is_valid_postal_code(data["postal_code"]):
                errors["postal_code"] = "올바른 우편번호 형식이 아닙니다"
                
        if "contact" in data and data["contact"]:
            if not Validator.is_valid_contact(data["contact"]):
                errors["contact"] = "올바른 연락처 형식이 아닙니다"
                
        if "eta" in data and data["eta"]:
            if isinstance(data["eta"], datetime) and not Validator.is_future_date(data["eta"]):
                errors["eta"] = "ETA는 현재 시간 이후여야 합니다"
        
        return errors