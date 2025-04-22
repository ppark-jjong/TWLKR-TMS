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
        datetime: lambda dt: dt.strftime("%Y-%m-%d %H:%M:%S") if dt else None
    },
)


# 커스텀 JSON 인코더
def custom_json_encoder(obj):
    if isinstance(obj, datetime):
        return obj.strftime("%Y-%m-%d %H:%M:%S")  # 원하는 형식으로 변경
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")


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
        username: str = Field(..., alias="username") # alias 수동 추가 예시
    ```

    날짜 형식:
    - 모든 datetime 필드는 'YYYY-MM-DD HH:MM:SS' 형식으로 직렬화됨
    - ISO 형식(T 구분자)과 공백 구분자 형식 모두 파싱 가능

    API 요청/응답 규칙:
    - 모든 필드는 camelCase 형식의 alias를 가져야 함 (이제 수동으로 관리)
    - 모든 API 응답은 {"success": boolean, "message": string, "data": any, "error_code"?: string} 형식을 따름
    """

    model_config = ConfigDict(
        from_attributes=True,  # ORM 모델에서 데이터 변환 허용
        populate_by_name=True,  # 필드 이름으로 데이터 매핑 허용 (alias 지원)
        alias_generator=None,  # 자동 alias 생성 비활성화 (수동 관리)
        validate_assignment=True,  # 속성 할당 시 유효성 검사
        extra="ignore",  # 추가 필드는 무시
        json_encoders={
            # datetime 객체를 공백 구분자 형식으로 직렬화
            datetime: lambda dt: dt.strftime("%Y-%m-%d %H:%M:%S") if dt else None
        },
    )

    @classmethod
    def validate_datetime(cls, v: Any, field: Any) -> Any:
        """
        날짜 형식 검증 및 변환 - 여러 형식 지원
        주로 백엔드 내부적으로 사용됨 (요청/응답은 json_encoders로 처리)
        """
        if isinstance(v, str) and field.annotation == datetime:
            # ISO 형식과 공백 구분자 형식 모두 지원
            for fmt in ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"]:
                try:
                    return datetime.strptime(v, fmt)
                except ValueError:
                    continue
        return v


# 표준 API 응답 형식
class APIResponse(APIModel):
    """
    표준 API 응답 형식

    모든 API 응답은 이 형식을 따라야 함:
    {
        "success": boolean,      # 요청 성공 여부
        "message": string,       # 응답 메시지
        "data": any | null,      # 응답 데이터 (선택적)
        "error_code": string     # 오류 코드 (실패 시)
    }
    """

    success: bool
    message: str
    data: Any = None
    error_code: str = None
