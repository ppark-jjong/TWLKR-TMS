# teckwah_project/main/dash/api/api_client.py
import requests
import json
import logging
from typing import Dict, Any, Optional, List, Tuple, Union
from main.server.config.settings import get_settings

# 중앙 설정 모듈에서 가져오기
settings = get_settings()

# 로깅 설정
logger = logging.getLogger(__name__)

# 설정에서 API URL 및 타임아웃 가져오기
BASE_URL = settings.API_BASE_URL
API_TIMEOUT = settings.API_TIMEOUT

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
                logger.error(
                    f"API 오류: {error_message} (상태 코드: {response.status_code})"
                )

                # 인증 오류인 경우 특별 처리
                if response.status_code == 401:
                    return {
                        "success": False,
                        "message": "인증이 필요합니다",
                        "need_login": True,
                    }

                # 락 충돌인 경우 특별 처리
                if response.status_code == 423:
                    return {
                        "success": False,
                        "message": "현재 다른 사용자가 작업 중입니다",
                        "is_locked": True,
                    }

                return {"success": False, "message": error_message}

            return data

        except json.JSONDecodeError:
            logger.error(f"JSON 파싱 오류: {response.text[:200]}")
            return {"success": False, "message": "서버 응답을 처리할 수 없습니다"}
        except Exception as e:
            logger.error(f"API 응답 처리 오류: {str(e)}")
            return {
                "success": False,
                "message": "서버 응답 처리 중 오류가 발생했습니다",
            }

    @staticmethod
    def login(user_id: str, password: str) -> Dict[str, Any]:
        """로그인 API 호출"""
        url = f"{BASE_URL}/api/v1/auth/login"
        headers = {"Content-Type": "application/json"}
        data = {"username": user_id, "password": password}

        try:
            response = requests.post(url, json=data, headers=headers, timeout=API_TIMEOUT)
            return ApiClient._handle_response(response)
        except requests.RequestException as e:
            logger.error(f"로그인 API 호출 오류: {str(e)}")
            return {"success": False, "message": "서버 연결에 실패했습니다"}

    @staticmethod
    def logout(refresh_token: str, access_token: str) -> Dict[str, Any]:
        """로그아웃 API 호출"""
        url = f"{BASE_URL}/api/v1/auth/logout"
        headers = ApiClient._get_headers(access_token)
        data = {"refresh_token": refresh_token}

        try:
            response = requests.post(url, json=data, headers=headers, timeout=API_TIMEOUT)
            return ApiClient._handle_response(response)
        except requests.RequestException as e:
            logger.error(f"로그아웃 API 호출 오류: {str(e)}")
            return {"success": False, "message": "서버 연결에 실패했습니다"}

    @staticmethod
    def refresh_token(refresh_token: str) -> Dict[str, Any]:
        """토큰 갱신 API 호출"""
        url = f"{BASE_URL}/api/v1/auth/refresh"
        headers = {"Content-Type": "application/json"}
        data = {"refresh_token": refresh_token}

        try:
            response = requests.post(url, json=data, headers=headers, timeout=API_TIMEOUT)
            return ApiClient._handle_response(response)
        except requests.RequestException as e:
            logger.error(f"토큰 갱신 API 호출 오류: {str(e)}")
            return {"success": False, "message": "서버 연결에 실패했습니다"}

    @staticmethod
    def check_session(access_token: str) -> Dict[str, Any]:
        """세션 확인 API 호출"""
        url = f"{BASE_URL}/api/v1/auth/check-session"
        headers = ApiClient._get_headers(access_token)

        try:
            response = requests.get(url, headers=headers, timeout=API_TIMEOUT)
            return ApiClient._handle_response(response)
        except requests.RequestException as e:
            logger.error(f"세션 확인 API 호출 오류: {str(e)}")
            return {"success": False, "message": "서버 연결에 실패했습니다"}

    @staticmethod
    def get_dashboard_list(start_date: str, end_date: str, access_token: str) -> Dict[str, Any]:
        """대시보드 목록 조회 API 호출"""
        url = f"{BASE_URL}/api/v1/dashboard/list"
        headers = ApiClient._get_headers(access_token)
        data = {"start_date": start_date, "end_date": end_date}

        try:
            response = requests.post(url, json=data, headers=headers, timeout=API_TIMEOUT)
            return ApiClient._handle_response(response)
        except requests.RequestException as e:
            logger.error(f"대시보드 목록 조회 API 호출 오류: {str(e)}")
            return {"success": False, "message": "서버 연결에 실패했습니다"}

    @staticmethod
    def get_dashboard_detail(dashboard_id: int, access_token: str) -> Dict[str, Any]:
        """대시보드 상세 조회 API 호출"""
        url = f"{BASE_URL}/api/v1/dashboard/{dashboard_id}"
        headers = ApiClient._get_headers(access_token)

        try:
            response = requests.get(url, headers=headers, timeout=API_TIMEOUT)
            return ApiClient._handle_response(response)
        except requests.RequestException as e:
            logger.error(f"대시보드 상세 조회 API 호출 오류: {str(e)}")
            return {"success": False, "message": "서버 연결에 실패했습니다"}

    @staticmethod
    def update_dashboard_status(
        dashboard_id: int, status: str, is_admin: bool, access_token: str
    ) -> Dict[str, Any]:
        """대시보드 상태 업데이트 API 호출"""
        url = f"{BASE_URL}/api/v1/dashboard/{dashboard_id}/status"
        headers = ApiClient._get_headers(access_token)
        data = {"status": status, "is_admin": is_admin}

        try:
            response = requests.patch(url, json=data, headers=headers, timeout=API_TIMEOUT)
            return ApiClient._handle_response(response)
        except requests.RequestException as e:
            logger.error(f"대시보드 상태 업데이트 API 호출 오류: {str(e)}")
            return {"success": False, "message": "서버 연결에 실패했습니다"}

    @staticmethod
    def update_dashboard_fields(
        dashboard_id: int, fields_data: Dict[str, Any], access_token: str
    ) -> Dict[str, Any]:
        """대시보드 필드 업데이트 API 호출"""
        url = f"{BASE_URL}/api/v1/dashboard/{dashboard_id}/fields"
        headers = ApiClient._get_headers(access_token)

        try:
            response = requests.patch(url, json=fields_data, headers=headers, timeout=API_TIMEOUT)
            return ApiClient._handle_response(response)
        except requests.RequestException as e:
            logger.error(f"대시보드 필드 업데이트 API 호출 오류: {str(e)}")
            return {"success": False, "message": "서버 연결에 실패했습니다"}

    @staticmethod
    def update_remark(
        dashboard_id: int, remark_id: int, content: str, access_token: str
    ) -> Dict[str, Any]:
        """메모 업데이트 API 호출"""
        url = f"{BASE_URL}/api/v1/dashboard/{dashboard_id}/remark/{remark_id}"
        headers = ApiClient._get_headers(access_token)
        data = {"content": content}

        try:
            response = requests.patch(url, json=data, headers=headers, timeout=API_TIMEOUT)
            return ApiClient._handle_response(response)
        except requests.RequestException as e:
            logger.error(f"메모 업데이트 API 호출 오류: {str(e)}")
            return {"success": False, "message": "서버 연결에 실패했습니다"}

    @staticmethod
    def acquire_lock(dashboard_id: int, lock_type: str, access_token: str) -> Dict[str, Any]:
        """락 획득 API 호출"""
        url = f"{BASE_URL}/api/v1/dashboard/{dashboard_id}/lock"
        headers = ApiClient._get_headers(access_token)
        data = {"lock_type": lock_type, "timeout": settings.LOCK_TIMEOUT_SECONDS}  # 환경 설정에서 가져옴

        try:
            response = requests.post(url, json=data, headers=headers, timeout=API_TIMEOUT)
            return ApiClient._handle_response(response)
        except requests.RequestException as e:
            logger.error(f"락 획득 API 호출 오류: {str(e)}")
            return {"success": False, "message": "서버 연결에 실패했습니다"}

    @staticmethod
    def release_lock(dashboard_id: int, access_token: str) -> Dict[str, Any]:
        """락 해제 API 호출"""
        url = f"{BASE_URL}/api/v1/dashboard/{dashboard_id}/lock"
        headers = ApiClient._get_headers(access_token)

        try:
            response = requests.delete(url, headers=headers, timeout=API_TIMEOUT)
            return ApiClient._handle_response(response)
        except requests.RequestException as e:
            logger.error(f"락 해제 API 호출 오류: {str(e)}")
            return {"success": False, "message": "서버 연결에 실패했습니다"}

    @staticmethod
    def search_by_order_no(order_no: str, access_token: str) -> Dict[str, Any]:
        """주문번호로 검색 API 호출"""
        url = f"{BASE_URL}/api/v1/dashboard/search"
        headers = ApiClient._get_headers(access_token)
        data = {"order_no": order_no}

        try:
            response = requests.post(url, json=data, headers=headers, timeout=API_TIMEOUT)
            return ApiClient._handle_response(response)
        except requests.RequestException as e:
            logger.error(f"주문번호 검색 API 호출 오류: {str(e)}")
            return {"success": False, "message": "서버 연결에 실패했습니다"}

    @staticmethod
    def get_delivery_status(start_date: str, end_date: str, access_token: str) -> Dict[str, Any]:
        """배송 현황 조회 API 호출"""
        url = f"{BASE_URL}/api/v1/visualization/delivery-status"
        headers = ApiClient._get_headers(access_token)
        params = {"start_date": start_date, "end_date": end_date}

        try:
            response = requests.get(url, params=params, headers=headers, timeout=API_TIMEOUT)
            return ApiClient._handle_response(response)
        except requests.RequestException as e:
            logger.error(f"배송 현황 조회 API 호출 오류: {str(e)}")
            return {"success": False, "message": "서버 연결에 실패했습니다"}

    @staticmethod
    def get_download_date_range(access_token: str) -> Dict[str, Any]:
        """다운로드 가능 날짜 범위 조회 API 호출"""
        url = f"{BASE_URL}/api/v1/download/date-range"
        headers = ApiClient._get_headers(access_token)

        try:
            response = requests.get(url, headers=headers, timeout=API_TIMEOUT)
            return ApiClient._handle_response(response)
        except requests.RequestException as e:
            logger.error(f"다운로드 날짜 범위 조회 API 호출 오류: {str(e)}")
            return {"success": False, "message": "서버 연결에 실패했습니다"}

    @staticmethod
    def download_excel(start_date: str, end_date: str, access_token: str) -> bytes:
        """Excel 다운로드 API 호출"""
        url = f"{BASE_URL}/api/v1/download/excel"
        headers = ApiClient._get_headers(access_token)
        params = {"start_date": start_date, "end_date": end_date}

        try:
            response = requests.get(url, params=params, headers=headers, timeout=API_TIMEOUT * 2)  # 다운로드는 시간이 더 필요할 수 있음
            if response.status_code == 200:
                return response.content
            else:
                logger.error(f"Excel 다운로드 실패: {response.status_code}")
                return None
        except requests.RequestException as e:
            logger.error(f"Excel 다운로드 API 호출 오류: {str(e)}")
            return None