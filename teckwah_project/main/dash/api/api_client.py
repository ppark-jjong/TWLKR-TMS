# teckwah_project/main/dash/api/api_client.py
import requests
import json
import logging
from typing import Dict, Any, Optional, List, Tuple, Union

# API 기본 URL 설정 (로컬 개발 환경)
BASE_URL = "http://localhost:8000"  # FastAPI 서버 URL

# 로깅 설정
logger = logging.getLogger(__name__)

class ApiClient:
    """백엔드 API 통신 클라이언트"""
    
    @staticmethod
    def _get_headers(access_token: Optional[str] = None) -> Dict[str, str]:
        """API 요청 헤더 생성"""
        headers = {"Content-Type": "application/json"}
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        return headers
    
    @staticmethod
    def _handle_response(response: requests.Response) -> Dict[str, Any]:
        """API 응답 처리"""
        try:
            # JSON 응답 파싱
            data = response.json()
            
            # 오류 응답 확인
            if not response.ok:
                error_message = data.get("message", "알 수 없는 오류가 발생했습니다")
                logger.error(f"API 오류: {error_message} (상태 코드: {response.status_code})")
                
                # 인증 오류인 경우 특별 처리
                if response.status_code == 401:
                    return {"success": False, "message": "인증이 필요합니다", "need_login": True}
                
                # 락 충돌인 경우 특별 처리
                if response.status_code == 423:
                    return {"success": False, "message": "현재 다른 사용자가 작업 중입니다", "is_locked": True}
                
                return {"success": False, "message": error_message}
                
            return data
            
        except json.JSONDecodeError:
            logger.error(f"JSON 파싱 오류: {response.text}")
            return {"success": False, "message": "서버 응답을 처리할 수 없습니다"}
        except Exception as e:
            logger.error(f"API 응답 처리 오류: {str(e)}")
            return {"success": False, "message": "서버 응답 처리 중 오류가 발생했습니다"}
    
    @classmethod
    def login(cls, user_id: str, password: str) -> Dict[str, Any]:
        """로그인 API 호출"""
        try:
            url = f"{BASE_URL}/auth/login"
            headers = cls._get_headers()
            data = {"user_id": user_id, "password": password}
            
            response = requests.post(url, headers=headers, json=data)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"로그인 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def logout(cls, refresh_token: str, access_token: str) -> Dict[str, Any]:
        """로그아웃 API 호출"""
        try:
            url = f"{BASE_URL}/auth/logout"
            headers = cls._get_headers(access_token)
            data = {"refresh_token": refresh_token}
            
            response = requests.post(url, headers=headers, json=data)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"로그아웃 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def refresh_token(cls, refresh_token: str) -> Dict[str, Any]:
        """토큰 갱신 API 호출"""
        try:
            url = f"{BASE_URL}/auth/refresh"
            headers = cls._get_headers()
            data = {"refresh_token": refresh_token}
            
            response = requests.post(url, headers=headers, json=data)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"토큰 갱신 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def check_session(cls, access_token: str) -> Dict[str, Any]:
        """세션 유효성 확인 API 호출"""
        try:
            url = f"{BASE_URL}/auth/check-session"
            headers = cls._get_headers(access_token)
            
            response = requests.get(url, headers=headers)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"세션 확인 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def get_dashboard_list(cls, start_date: str, end_date: str, access_token: str) -> Dict[str, Any]:
        """대시보드 목록 조회 API 호출"""
        try:
            url = f"{BASE_URL}/dashboard/list"
            headers = cls._get_headers(access_token)
            data = {"start_date": start_date, "end_date": end_date}
            
            response = requests.post(url, headers=headers, json=data)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"대시보드 목록 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}

    @classmethod
    def get_dashboard_detail(cls, dashboard_id: int, access_token: str) -> Dict[str, Any]:
        """대시보드 상세 조회 API 호출"""
        try:
            url = f"{BASE_URL}/dashboard/{dashboard_id}"
            headers = cls._get_headers(access_token)
            
            response = requests.get(url, headers=headers)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"대시보드 상세 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def update_dashboard_status(cls, dashboard_id: int, status: str, is_admin: bool, access_token: str) -> Dict[str, Any]:
        """대시보드 상태 업데이트 API 호출"""
        try:
            url = f"{BASE_URL}/dashboard/{dashboard_id}/status"
            headers = cls._get_headers(access_token)
            data = {"status": status, "is_admin": is_admin}
            
            response = requests.patch(url, headers=headers, json=data)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"상태 업데이트 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
            
    @classmethod
    def update_dashboard_fields(cls, dashboard_id: int, fields: Dict[str, Any], access_token: str) -> Dict[str, Any]:
        """대시보드 필드 업데이트 API 호출"""
        try:
            url = f"{BASE_URL}/dashboard/{dashboard_id}/fields"
            headers = cls._get_headers(access_token)
            
            response = requests.patch(url, headers=headers, json=fields)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"필드 업데이트 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def create_dashboard(cls, dashboard_data: Dict[str, Any], access_token: str) -> Dict[str, Any]:
        """대시보드 생성 API 호출"""
        try:
            url = f"{BASE_URL}/dashboard"
            headers = cls._get_headers(access_token)
            
            response = requests.post(url, headers=headers, json=dashboard_data)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"대시보드 생성 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def assign_driver(cls, dashboard_ids: List[int], driver_name: str, driver_contact: str, access_token: str) -> Dict[str, Any]:
        """배차 처리 API 호출"""
        try:
            url = f"{BASE_URL}/dashboard/assign"
            headers = cls._get_headers(access_token)
            data = {
                "dashboard_ids": dashboard_ids, 
                "driver_name": driver_name, 
                "driver_contact": driver_contact
            }
            
            response = requests.post(url, headers=headers, json=data)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"배차 처리 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def delete_dashboards(cls, dashboard_ids: List[int], access_token: str) -> Dict[str, Any]:
        """대시보드 삭제 API 호출"""
        try:
            url = f"{BASE_URL}/dashboard"
            headers = cls._get_headers(access_token)
            data = {"dashboard_ids": dashboard_ids}
            
            response = requests.delete(url, headers=headers, json=data)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"대시보드 삭제 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def search_by_order_no(cls, order_no: str, access_token: str) -> Dict[str, Any]:
        """주문번호로 대시보드 검색 API 호출"""
        try:
            url = f"{BASE_URL}/dashboard/search?order_no={order_no}"
            headers = cls._get_headers(access_token)
            
            response = requests.get(url, headers=headers)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"주문번호 검색 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def acquire_lock(cls, dashboard_id: int, lock_type: str, access_token: str) -> Dict[str, Any]:
        """락 획득 API 호출"""
        try:
            url = f"{BASE_URL}/dashboard/{dashboard_id}/lock"
            headers = cls._get_headers(access_token)
            data = {"lock_type": lock_type}
            
            response = requests.post(url, headers=headers, json=data)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"락 획득 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def release_lock(cls, dashboard_id: int, access_token: str) -> Dict[str, Any]:
        """락 해제 API 호출"""
        try:
            url = f"{BASE_URL}/dashboard/{dashboard_id}/lock"
            headers = cls._get_headers(access_token)
            
            response = requests.delete(url, headers=headers)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"락 해제 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def update_remark(cls, dashboard_id: int, remark_id: int, content: str, access_token: str) -> Dict[str, Any]:
        """메모 업데이트 API 호출"""
        try:
            url = f"{BASE_URL}/dashboard/{dashboard_id}/remarks/{remark_id}"
            headers = cls._get_headers(access_token)
            data = {"content": content}
            
            response = requests.patch(url, headers=headers, json=data)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"메모 업데이트 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def get_delivery_status(cls, start_date: str, end_date: str, access_token: str) -> Dict[str, Any]:
        """배송 현황 데이터 조회 API 호출"""
        try:
            url = f"{BASE_URL}/visualization/delivery_status"
            headers = cls._get_headers(access_token)
            data = {"start_date": start_date, "end_date": end_date}
            
            response = requests.post(url, headers=headers, json=data)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"배송 현황 데이터 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def get_hourly_orders(cls, start_date: str, end_date: str, access_token: str) -> Dict[str, Any]:
        """시간대별 접수량 데이터 조회 API 호출"""
        try:
            url = f"{BASE_URL}/visualization/hourly_orders"
            headers = cls._get_headers(access_token)
            data = {"start_date": start_date, "end_date": end_date}
            
            response = requests.post(url, headers=headers, json=data)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"시간대별 접수량 데이터 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def get_visualization_date_range(cls, access_token: str) -> Dict[str, Any]:
        """시각화 가능 날짜 범위 조회 API 호출"""
        try:
            url = f"{BASE_URL}/visualization/date_range"
            headers = cls._get_headers(access_token)
            
            response = requests.get(url, headers=headers)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"시각화 날짜 범위 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def get_download_date_range(cls, access_token: str) -> Dict[str, Any]:
        """다운로드 가능 날짜 범위 조회 API 호출"""
        try:
            url = f"{BASE_URL}/download/date-range"
            headers = cls._get_headers(access_token)
            
            response = requests.get(url, headers=headers)
            return cls._handle_response(response)
            
        except requests.RequestException as e:
            logger.error(f"다운로드 날짜 범위 API 요청 오류: {str(e)}")
            return {"success": False, "message": "서버에 연결할 수 없습니다"}
    
    @classmethod
    def download_excel(cls, start_date: str, end_date: str, access_token: str) -> Optional[bytes]:
        """Excel 다운로드 API 호출"""
        try:
            url = f"{BASE_URL}/download/excel"
            headers = cls._get_headers(access_token)
            headers.pop("Content-Type", None)  # 파일 다운로드시 Content-Type 제거
            data = {"start_date": start_date, "end_date": end_date}
            
            response = requests.post(url, headers=headers, json=data)
            
            # 성공 여부 확인
            if not response.ok:
                try:
                    error_data = response.json()
                    error_message = error_data.get("message", "다운로드에 실패했습니다")
                    logger.error(f"Excel 다운로드 오류: {error_message}")
                    return None
                except json.JSONDecodeError:
                    logger.error(f"Excel 다운로드 오류: 상태 코드 {response.status_code}")
                    return None
            
            # 파일 데이터 반환
            return response.content
            
        except requests.RequestException as e:
            logger.error(f"Excel 다운로드 API 요청 오류: {str(e)}")
            return None