# teckwah_project/main/server/utils/validator.py
from datetime import datetime
from typing import Dict, Any, List, Optional, Union, Type


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
