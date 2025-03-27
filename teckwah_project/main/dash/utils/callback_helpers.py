# teckwah_project/main/dash/utils/callback_helpers.py

import logging
from typing import Dict, Any, List, Optional, Callable, Union, Tuple
from functools import wraps
import copy
from dash import html, no_update
import dash_bootstrap_components as dbc
import requests
import traceback
from main.server.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# 오류 타입 및 메시지 상수 정의
ERROR_MESSAGES = {
    "login_failed": "아이디 또는 비밀번호가 올바르지 않습니다. 다시 시도해주세요.",
    "session_expired": "로그인 세션이 만료되었습니다. 다시 로그인해주세요.",
    "permission_denied": "이 작업을 수행할 권한이 없습니다.",
    "validation_error": "입력 데이터에 문제가 있습니다: {field} {message}",
    "lock_error": "다른 사용자가 현재 이 항목을 편집 중입니다. 잠시 후 다시 시도해주세요.",
    "connection_error": "서버 연결에 문제가 발생했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.",
    "timeout_error": f"서버 응답 시간이 초과되었습니다({settings.API_TIMEOUT}초). 네트워크 상태를 확인하고 다시 시도해주세요.",
    "not_found": "요청한 데이터를 찾을 수 없습니다.",
    "server_error": "서버 오류가 발생했습니다. 관리자에게 문의하세요.",
    "data_error": "데이터 처리 중 오류가 발생했습니다. 입력 값을 확인하세요.",
    "api_error": "API 오류: {message}",
    "network_error": "네트워크 연결 오류가 발생했습니다. 인터넷 연결을 확인하세요.",
}


def create_alert_data(
    message: str, color: str = "primary", duration: int = 4000
) -> Dict[str, Any]:
    """알림 데이터 생성 유틸리티 함수

    Args:
        message: 알림 메시지
        color: 알림 색상 (primary, success, warning, danger)
        duration: 알림 표시 시간 (밀리초)

    Returns:
        Dict: 알림 데이터 딕셔너리
    """
    return {"message": message, "color": color, "duration": duration}


def create_user_friendly_error(error_type: str, context: Dict[str, Any] = None) -> str:
    """사용자 친화적인 에러 메시지 생성

    Args:
        error_type: 에러 타입
        context: 에러 컨텍스트 정보

    Returns:
        str: 사용자 친화적인 메시지
    """
    if context is None:
        context = {}

    if error_type not in ERROR_MESSAGES:
        return f"오류가 발생했습니다: {error_type}"

    error_template = ERROR_MESSAGES[error_type]
    
    try:
        return error_template.format(**context)
    except KeyError:
        # 포맷 키가 없는 경우 그대로 반환
        return error_template


def create_validation_feedback(is_valid: bool, message: str = "") -> Dict[str, Any]:
    """입력 필드 유효성 검증 피드백 생성

    Args:
        is_valid: 유효성 여부
        message: 에러 메시지

    Returns:
        Dict: 유효성 피드백 정보
    """
    return {
        "valid": is_valid,
        "invalid": not is_valid,
        "message": message if not is_valid else "",
    }


def create_field_feedback(field_id: str, is_valid: bool, message: str = "") -> html.Div:
    """입력 필드 피드백 UI 요소 생성

    Args:
        field_id: 필드 ID
        is_valid: 유효성 여부
        message: 에러 메시지

    Returns:
        html.Div: 피드백 UI 요소
    """
    if is_valid:
        return html.Div(id=f"{field_id}-feedback")

    return html.Div(
        dbc.FormFeedback(message, type="invalid"), id=f"{field_id}-feedback"
    )


def validate_form_data(
    form_data: Dict[str, Any], validators: Dict[str, List[Callable]]
) -> Tuple[bool, Dict[str, str]]:
    """폼 데이터 유효성 검증

    Args:
        form_data: 폼 데이터 (필드명: 값)
        validators: 필드별 검증 함수 리스트 (필드명: [검증함수1, 검증함수2, ...])

    Returns:
        Tuple: (전체 유효성 여부, 필드별 에러 메시지)
    """
    is_valid = True
    errors = {}

    for field, field_validators in validators.items():
        field_value = form_data.get(field)

        for validator in field_validators:
            field_valid, message = validator(field_value)

            if not field_valid:
                is_valid = False
                errors[field] = message
                break

    return is_valid, errors


def update_app_state(
    current_state: Dict[str, Any], key_path: str, value: Any
) -> Dict[str, Any]:
    """앱 상태 특정 경로 업데이트

    Args:
        current_state: 현재 상태 딕셔너리
        key_path: 키 경로 (점 표기법, 예: "modals.detail.is_open")
        value: 설정할 값

    Returns:
        Dict: 업데이트된 상태 딕셔너리
    """
    if current_state is None:
        current_state = {}

    # 상태 복사
    new_state = copy.deepcopy(current_state)

    # 키 경로 파싱
    keys = key_path.split(".")

    # 중첩 딕셔너리 생성
    current_dict = new_state
    for i, key in enumerate(keys[:-1]):
        if key not in current_dict:
            current_dict[key] = {}
        elif not isinstance(current_dict[key], dict):
            current_dict[key] = {}
        current_dict = current_dict[key]

    # 최종 값 설정
    current_dict[keys[-1]] = value

    return new_state


def set_modal_state(
    current_state: Dict[str, Any],
    modal_name: str,
    is_open: bool,
    additional_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """모달 상태 설정 유틸리티 함수

    Args:
        current_state: 현재 상태 딕셔너리
        modal_name: 모달 이름 (detail, assign, delete, new)
        is_open: 열림 여부
        additional_data: 추가 데이터 (선택)

    Returns:
        Dict: 업데이트된 상태 딕셔너리
    """
    if current_state is None:
        current_state = {}

    # 상태 복사
    new_state = copy.deepcopy(current_state)

    # modals 딕셔너리가 없으면 생성
    if "modals" not in new_state:
        new_state["modals"] = {}

    # 해당 모달 딕셔너리가 없으면 생성
    if modal_name not in new_state["modals"]:
        new_state["modals"][modal_name] = {}

    # 모달 상태 설정
    new_state["modals"][modal_name]["is_open"] = is_open

    # 추가 데이터가 있으면 설정
    if additional_data:
        for key, value in additional_data.items():
            new_state["modals"][modal_name][key] = value

    return new_state


def handle_api_response(
    response: Dict[str, Any],
    on_success: Optional[Callable] = None,
    on_error: Optional[Callable] = None,
) -> Dict[str, Any]:
    """API 응답 처리 유틸리티 함수

    Args:
        response: API 응답 딕셔너리
        on_success: 성공 시 실행할 콜백 함수
        on_error: 실패 시 실행할 콜백 함수

    Returns:
        Dict: 처리 결과 (success, message, data 등)
    """
    success = response.get("success", False)
    message = response.get("message", "알 수 없는 응답")
    data = response.get("data", {})

    if success and on_success:
        return on_success(data, message)
    elif not success and on_error:
        return on_error(message, response)

    return {"success": success, "message": message, "data": data}


def create_error_response(
    app_state: Dict[str, Any], message: str, color: str = "danger"
) -> List[Any]:
    """에러 응답 생성 유틸리티 함수

    Args:
        app_state: 현재 앱 상태
        message: 에러 메시지
        color: 알림 색상

    Returns:
        List: no_update 값들과 업데이트된 app_state
    """
    # 알림 생성
    alert = create_alert_data(message=message, color=color, duration=5000)

    # 앱 상태 업데이트
    if app_state is None:
        app_state = {}
    updated_app_state = {**app_state, "alert": alert}

    # 필요한 수의 no_update 값을 반환하기 위한 리스트 생성
    # 이 함수를 호출하는 콜백의 출력 개수에 맞게 조정
    return [no_update] * 6 + [updated_app_state]


def handle_network_error(e: Exception, app_state: Dict[str, Any]) -> List[Any]:
    """네트워크 오류 처리 유틸리티 함수 (개선됨)

    Args:
        e: 발생한 예외
        app_state: 현재 앱 상태

    Returns:
        List: no_update 값들과 업데이트된 app_state
    """
    error_type = "network_error"
    message = ERROR_MESSAGES["network_error"]
    
    if isinstance(e, requests.Timeout):
        error_type = "timeout_error"
        message = ERROR_MESSAGES["timeout_error"]
    elif isinstance(e, requests.ConnectionError):
        error_type = "connection_error"
        message = ERROR_MESSAGES["connection_error"]

    logger.error(f"네트워크 오류 ({error_type}): {str(e)}")
    return create_error_response(app_state, message)


def handle_callback_error(func: Callable) -> Callable:
    """콜백 함수 예외 처리 데코레이터 (개선됨)

    Args:
        func: 콜백 함수

    Returns:
        Callable: 예외 처리 기능이 추가된 콜백 함수
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except requests.RequestException as e:
            # 네트워크 오류 로깅 및 처리
            logger.error(f"네트워크 오류 발생: {str(e)}")

            # 마지막 인수가 app_state인지 확인
            app_state = kwargs.get("app_state")
            if app_state is None and args and isinstance(args[-1], dict):
                app_state = args[-1]

            error_type = "network_error"
            if isinstance(e, requests.Timeout):
                error_type = "timeout_error"
            elif isinstance(e, requests.ConnectionError):
                error_type = "connection_error"

            # 에러 알림 데이터 생성
            alert_data = create_alert_data(
                message=create_user_friendly_error(error_type),
                color="danger",
                duration=5000,
            )

            # app_state가 있으면 업데이트
            if app_state is not None:
                updated_state = {**app_state, "alert": alert_data}

                # 콜백의 출력 수와 동일하게 no_update 반환
                # 마지막 값만 updated_state로 설정
                result = [no_update] * (func.__code__.co_argcount - 1)
                result.append(updated_state)
                return result

            return no_update

        except Exception as e:
            # 일반 에러 로깅
            logger.error(f"콜백 실행 중 오류 발생: {str(e)}")
            logger.error(traceback.format_exc())

            # 에러 알림 데이터 생성
            alert_data = create_alert_data(
                message=f"오류가 발생했습니다: {str(e)}", color="danger", duration=5000
            )

            # app_state 찾기
            app_state = kwargs.get("app_state")
            if (
                app_state is None
                and args
                and isinstance(args[-1], dict)
                and "alert" in args[-1]
            ):
                app_state = args[-1]

            # app_state가 있으면 업데이트
            if app_state is not None:
                updated_state = {**app_state, "alert": alert_data}

                # 콜백의 출력 수와 동일하게 no_update 반환
                # 마지막 값만 updated_state로 설정
                result = [no_update] * (func.__code__.co_argcount - 1)
                result.append(updated_state)
                return result

            return no_update

    return wrapper