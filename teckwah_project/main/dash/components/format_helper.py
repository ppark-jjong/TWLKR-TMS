# teckwah_project/main/dash/utils/format_helper.py
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, date
import pandas as pd
import locale

# 한국어 로케일 설정 (날짜 형식 등에 사용)
try:
    locale.setlocale(locale.LC_TIME, 'ko_KR.UTF-8')
except:
    try:
        locale.setlocale(locale.LC_TIME, 'Korean_Korea.949')
    except:
        pass  # 실패해도 무시하고 진행

def format_date(dt: Optional[Union[str, datetime, date]]) -> str:
    """날짜 형식화 (YYYY-MM-DD)"""
    if dt is None:
        return ""
    
    # 문자열인 경우 datetime으로 변환
    if isinstance(dt, str):
        try:
            # 다양한 형식 지원
            formats = [
                "%Y-%m-%dT%H:%M:%S.%fZ",  # ISO 형식 (밀리초 포함)
                "%Y-%m-%dT%H:%M:%SZ",     # ISO 형식 (밀리초 제외)
                "%Y-%m-%dT%H:%M:%S",      # ISO 형식 (Z 제외)
                "%Y-%m-%d %H:%M:%S",      # 일반 datetime 형식
                "%Y-%m-%d",                # 날짜만 있는 형식
            ]
            
            for fmt in formats:
                try:
                    dt = datetime.strptime(dt, fmt)
                    break
                except ValueError:
                    continue
            else:
                # 어떤 형식으로도 변환 실패
                return dt
        except Exception:
            # 변환 실패 시 원본 반환
            return dt
    
    # datetime이나 date 객체인 경우
    if isinstance(dt, (datetime, date)):
        return dt.strftime("%Y-%m-%d")
    
    # 기타 타입
    return str(dt)

def format_datetime(dt: Optional[Union[str, datetime]]) -> str:
    """날짜 및 시간 형식화 (YYYY-MM-DD HH:MM:SS)"""
    if dt is None:
        return ""
    
    # 문자열인 경우 datetime으로 변환
    if isinstance(dt, str):
        try:
            # 다양한 형식 지원
            formats = [
                "%Y-%m-%dT%H:%M:%S.%fZ",  # ISO 형식 (밀리초 포함)
                "%Y-%m-%dT%H:%M:%SZ",     # ISO 형식 (밀리초 제외)
                "%Y-%m-%dT%H:%M:%S",      # ISO 형식 (Z 제외)
                "%Y-%m-%d %H:%M:%S",      # 일반 datetime 형식
                "%Y-%m-%d",                # 날짜만 있는 형식
            ]
            
            for fmt in formats:
                try:
                    dt = datetime.strptime(dt, fmt)
                    break
                except ValueError:
                    continue
            else:
                # 어떤 형식으로도 변환 실패
                return dt
        except Exception:
            # 변환 실패 시 원본 반환
            return dt
    
    # datetime 객체인 경우
    if isinstance(dt, datetime):
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    
    # 기타 타입
    return str(dt)

def format_status(status: str) -> str:
    """상태 코드 변환"""
    status_map = {
        "WAITING": "대기",
        "IN_PROGRESS": "진행 중",
        "COMPLETE": "완료",
        "ISSUE": "이슈",
        "CANCEL": "취소"
    }
    return status_map.get(status, status)

def format_type(type_code: str) -> str:
    """타입 코드 변환"""
    type_map = {
        "DELIVERY": "배송",
        "RETURN": "회수"
    }
    return type_map.get(type_code, type_code)

def format_warehouse(warehouse_code: str) -> str:
    """창고 코드 변환"""
    warehouse_map = {
        "SEOUL": "서울",
        "BUSAN": "부산",
        "GWANGJU": "광주",
        "DAEJEON": "대전"
    }
    return warehouse_map.get(warehouse_code, warehouse_code)

def prepare_table_data(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """테이블 표시용 데이터 준비"""
    formatted_data = []
    
    for item in data:
        # 복사본 생성
        formatted_item = item.copy()
        
        # 날짜/시간 형식화
        formatted_item["eta"] = format_datetime(item.get("eta"))
        formatted_item["create_time"] = format_datetime(item.get("create_time"))
        
        if "depart_time" in item and item["depart_time"]:
            formatted_item["depart_time"] = format_datetime(item.get("depart_time"))
        
        if "complete_time" in item and item["complete_time"]:
            formatted_item["complete_time"] = format_datetime(item.get("complete_time"))
        
        # 코드값 한글화
        formatted_item["type"] = format_type(item.get("type", ""))
        formatted_item["status"] = format_status(item.get("status", ""))
        formatted_item["warehouse"] = format_warehouse(item.get("warehouse", ""))
        
        formatted_data.append(formatted_item)
    
    return formatted_data

def filter_table_data(data: List[Dict[str, Any]], filters: Dict[str, str]) -> List[Dict[str, Any]]:
    """필터 조건에 맞는 데이터 필터링"""
    if not filters:
        return data
    
    filtered_data = data
    
    # 종류 필터
    if "type" in filters and filters["type"] != "ALL":
        target_type = filters["type"]
        filtered_data = [item for item in filtered_data if item["type"] == target_type]
    
    # 부서 필터
    if "department" in filters and filters["department"] != "ALL":
        target_dept = filters["department"]
        filtered_data = [item for item in filtered_data if item["department"] == target_dept]
    
    # 창고 필터
    if "warehouse" in filters and filters["warehouse"] != "ALL":
        target_warehouse = filters["warehouse"]
        filtered_data = [item for item in filtered_data if item["warehouse"] == target_warehouse]
    
    return filtered_data

def create_color_scale(values: List[float], colorscale: Optional[List[List[Union[float, str]]]] = None) -> List[str]:
    """수치에 따른 색상 생성 (예: 히트맵용)"""
    if not values:
        return []
        
    if colorscale is None:
        # 기본 파란색 계열 색상
        colorscale = [
            [0, "#f7fbff"],
            [0.2, "#deebf7"],
            [0.4, "#c6dbef"],
            [0.6, "#9ecae1"],
            [0.8, "#6baed6"],
            [1, "#3182bd"]
        ]
    
    import numpy as np
    
    # 값 정규화
    min_val = min(values)
    max_val = max(values)
    
    if min_val == max_val:
        normalized = [0.5 for _ in values]
    else:
        normalized = [(v - min_val) / (max_val - min_val) for v in values]
    
    # 색상 보간
    colors = []
    for norm_val in normalized:
        # 적절한 색상 범위 찾기
        for i in range(len(colorscale) - 1):
            if colorscale[i][0] <= norm_val <= colorscale[i+1][0]:
                # 두 색상 사이에서 보간
                t = (norm_val - colorscale[i][0]) / (colorscale[i+1][0] - colorscale[i][0])
                
                # 16진수 색상 분해 및 보간
                r1, g1, b1 = int(colorscale[i][1][1:3], 16), int(colorscale[i][1][3:5], 16), int(colorscale[i][1][5:7], 16)
                r2, g2, b2 = int(colorscale[i+1][1][1:3], 16), int(colorscale[i+1][1][3:5], 16), int(colorscale[i+1][1][5:7], 16)
                
                r = int(r1 + t * (r2 - r1))
                g = int(g1 + t * (g2 - g1))
                b = int(b1 + t * (b2 - b1))
                
                color = f"#{r:02x}{g:02x}{b:02x}"
                colors.append(color)
                break
        else:
            # 기본값 (마지막 색상)
            colors.append(colorscale[-1][1])
    
    return colors