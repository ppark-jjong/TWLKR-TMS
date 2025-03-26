# teckwah_project/main/dash/components/alerts.py
from dash import html
import dash_bootstrap_components as dbc

def create_alert(message, color="primary", dismissable=True, duration=4000, is_open=True):
    """알림 메시지 컴포넌트 생성"""
    alert_id = f"alert-{color}-{hash(message) % 10000}"  # 고유 ID 생성
    
    alert = dbc.Toast(
        message,
        id=alert_id,
        header=get_alert_header(color),
        is_open=is_open,
        dismissable=dismissable,
        duration=duration,
        color=color,
        className="mb-3"
    )
    
    return alert

def get_alert_header(color):
    """알림 헤더 텍스트 생성"""
    headers = {
        "primary": "정보",
        "success": "성공",
        "warning": "주의",
        "danger": "오류",
        "secondary": "알림"
    }
    
    return headers.get(color, "알림")