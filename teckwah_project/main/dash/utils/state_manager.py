# teckwah_project/main/dash/utils/state_manager.py
import copy
from typing import Dict, Any, Optional, List, Union

def update_app_state(current_state: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
    """앱 상태 업데이트 유틸리티 함수 - 여러 상태 한번에 업데이트

    Args:
        current_state: 현재 앱 상태
        updates: 업데이트할 값들의 딕셔너리

    Returns:
        Dict: 업데이트된 상태 딕셔너리
    """
    if current_state is None:
        current_state = {}
    
    # 상태 복사
    new_state = copy.deepcopy(current_state)
    
    # 업데이트 적용
    for key, value in updates.items():
        if isinstance(value, dict) and key in new_state and isinstance(new_state[key], dict):
            # 중첩 딕셔너리 업데이트
            new_state[key] = update_nested_dict(new_state[key], value)
        else:
            # 일반 값 업데이트
            new_state[key] = value
    
    return new_state

def update_nested_dict(current_dict: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
    """중첩 딕셔너리 업데이트 유틸리티 함수

    Args:
        current_dict: 현재 딕셔너리
        updates: 업데이트할 값들의 딕셔너리

    Returns:
        Dict: 업데이트된 딕셔너리
    """
    result = copy.deepcopy(current_dict)
    
    for key, value in updates.items():
        if isinstance(value, dict) and key in result and isinstance(result[key], dict):
            # 재귀적으로 중첩 딕셔너리 업데이트
            result[key] = update_nested_dict(result[key], value)
        else:
            # 일반 값 업데이트
            result[key] = value
    
    return result

def create_alert_data(message: str, color: str = "primary", duration: int = 4000) -> Dict[str, Any]:
    """알림 데이터 생성 유틸리티 함수 - 표준화된 형식

    Args:
        message: 알림 메시지
        color: 알림 색상 (primary, success, warning, danger)
        duration: 알림 표시 시간 (밀리초)

    Returns:
        Dict: 알림 데이터 딕셔너리
    """
    return {"message": message, "color": color, "duration": duration}

def get_modal_state(app_state: Dict[str, Any], modal_name: str) -> Dict[str, Any]:
    """모달 상태 정보 조회 유틸리티 함수

    Args:
        app_state: 현재 앱 상태
        modal_name: 모달 이름 (detail, assign, delete, new)

    Returns:
        Dict: 모달 상태 정보
    """
    if not app_state or "modals" not in app_state:
        return {"is_open": False}
    
    modals = app_state.get("modals", {})
    return modals.get(modal_name, {"is_open": False})

def set_modal_state(
    current_state: Dict[str, Any],
    modal_name: str,
    is_open: bool,
    additional_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """모달 상태 설정 유틸리티 함수

    Args:
        current_state: 현재 앱 상태
        modal_name: 모달 이름 (detail, assign, delete, new)
        is_open: 열림 여부
        additional_data: 추가 데이터 (선택)

    Returns:
        Dict: 업데이트된 앱 상태
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

def get_filter_state(app_state: Dict[str, Any]) -> Dict[str, str]:
    """필터 상태 정보 조회 유틸리티 함수

    Args:
        app_state: 현재 앱 상태

    Returns:
        Dict: 필터 상태 정보
    """
    default_filters = {"type": "ALL", "department": "ALL", "warehouse": "ALL"}
    
    if not app_state or "filters" not in app_state:
        return default_filters
    
    filters = app_state.get("filters", {})
    return filters if filters else default_filters

def should_reload_data(app_state: Dict[str, Any]) -> bool:
    """데이터 리로드 필요 여부 확인 유틸리티 함수

    Args:
        app_state: 현재 앱 상태

    Returns:
        bool: 리로드 필요 여부
    """
    return app_state is not None and app_state.get("reload_data", False)

def clear_reload_flag(app_state: Dict[str, Any]) -> Dict[str, Any]:
    """데이터 리로드 플래그 초기화 유틸리티 함수

    Args:
        app_state: 현재 앱 상태

    Returns:
        Dict: 업데이트된 앱 상태
    """
    if app_state is None:
        return {}
    
    new_state = copy.deepcopy(app_state)
    new_state["reload_data"] = False
    
    return new_state