"""
공통 모델 설정 모듈

Pydantic 모델의 공통 설정을 정의합니다.
- snake_case(백엔드) <-> camelCase(프론트엔드) 자동 변환 지원
- ORM 모델 매핑 설정
- 날짜 형식 일관성 유지 (공백 구분자 형식)
"""

from typing import Any, Dict, Type
from pydantic import BaseModel, ConfigDict
from datetime import datetime


# Pydantic 모델 공통 설정
API_MODEL_CONFIG = ConfigDict(
    from_attributes=True,  # SQLAlchemy 모델에서 데이터 변환 허용
    populate_by_name=True,  # 필드 이름으로 데이터 매핑 허용 (alias 지원)
    json_encoders={
        # datetime 객체를 공백 구분자 형식으로 직렬화
        datetime: lambda dt: dt.strftime('%Y-%m-%d %H:%M:%S') if dt else None
    }
)


# API 응답용 기본 모델 클래스
class APIModel(BaseModel):
    """
    API 응답용 기본 모델
    
    모든 API 요청/응답에 사용되는 Pydantic 모델은 이 클래스를 상속받아 
    일관된 설정(alias 등)을 적용받습니다.
    
    상속 방법:
    ```python
    from backend.models.model_config import APIModel
    
    class UserResponse(APIModel):
        user_id: int = Field(..., alias="userId")
        username: str
    ```
    
    날짜 형식:
    - 모든 datetime 필드는 'YYYY-MM-DD HH:MM:SS' 형식으로 직렬화됨
    - ISO 형식(T 구분자)과 공백 구분자 형식 모두 파싱 가능
    """
    model_config = API_MODEL_CONFIG
    
    @classmethod
    def validate_datetime(cls, v: Any, field: Any) -> Any:
        """
        날짜 형식 검증 및 변환 - 여러 형식 지원
        주로 백엔드 내부적으로 사용됨 (요청/응답은 json_encoders로 처리)
        """
        if isinstance(v, str) and field.annotation == datetime:
            # ISO 형식과 공백 구분자 형식 모두 지원
            for fmt in ['%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S']:
                try:
                    return datetime.strptime(v, fmt)
                except ValueError:
                    continue
        return v
