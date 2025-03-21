# app/utils/validator.py
import re
from datetime import datetime
from typing import Dict, Any, List, Optional, Union, Type
from pydantic import BaseModel, ValidationError

class Validator:
    """
    중앙화된 유효성 검증 유틸리티
    """
    
    @staticmethod
    def validate_postal_code(postal_code: str) -> bool:
        """
        우편번호 유효성 검증
        
        Args:
            postal_code: 검증할 우편번호
            
        Returns:
            유효성 여부
        """
        if not postal_code:
            return False
        
        return bool(re.match(r"^\d{5}$", postal_code))
    
    @staticmethod
    def validate_contact(contact: str) -> bool:
        """
        연락처 유효성 검증
        
        Args:
            contact: 검증할 연락처
            
        Returns:
            유효성 여부
        """
        if not contact:
            return False
        
        return bool(re.match(r"^\d{2,3}-\d{3,4}-\d{4}$", contact))
    
    @staticmethod
    def validate_future_date(date: datetime) -> bool:
        """
        미래 날짜 유효성 검증
        
        Args:
            date: 검증할 날짜
            
        Returns:
            유효성 여부
        """
        if not date:
            return False
        
        # 현재 시간보다 미래인지 확인
        return date > datetime.now()
    
    @staticmethod
    def validate_model(data: Dict[str, Any], model_class: Type[BaseModel]) -> Union[BaseModel, List[Dict[str, Any]]]:
        """
        Pydantic 모델을 사용한 데이터 유효성 검증
        
        Args:
            data: 검증할 데이터
            model_class: Pydantic 모델 클래스
            
        Returns:
            유효한 경우 모델 인스턴스, 아닌 경우 오류 목록
        """
        try:
            return model_class(**data)
        except ValidationError as e:
            # 오류 목록 형식화
            errors = []
            for error in e.errors():
                errors.append({
                    "field": ".".join(str(loc) for loc in error["loc"]),
                    "message": error["msg"],
                    "type": error["type"]
                })
            return errors
    
    @staticmethod
    def is_valid_model(data: Dict[str, Any], model_class: Type[BaseModel]) -> bool:
        """
        Pydantic 모델을 사용한 데이터 유효성 여부 확인
        
        Args:
            data: 검증할 데이터
            model_class: Pydantic 모델 클래스
            
        Returns:
            유효성 여부
        """
        try:
            model_class(**data)
            return True
        except ValidationError:
            return False