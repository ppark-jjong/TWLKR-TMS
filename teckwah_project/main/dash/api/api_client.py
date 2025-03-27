# teckwah_project/main/dash/api/api_client.py
import requests
import json
import logging
import os
from typing import Dict, Any, Optional, List, Tuple, Union

# 중앙 설정 모듈 불러오기
from main.server.config.settings import get_settings

settings = get_settings()

# 로깅 설정
logger = logging.getLogger(__name__)

# 설정에서 API URL 및 타임아웃 가져오기
BASE_URL = settings.API_BASE_URL
API_TIMEOUT = settings.API_TIMEOUT

class ApiClient:
    """백엔드 API 통신 클라이언트"""

    def __init__(self):
        # 설정에서 값 가져오기
        self.BASE_URL = settings.API_BASE_URL
        self.TIMEOUT = settings.API_TIMEOUT

        logger.info(
            f"API 클라이언트 초기화: BASE_URL={self.BASE_URL}, TIMEOUT={self.TIMEOUT}초"
        )

        self.token = None
        self.refresh_token = None
        self.session = requests.Session()

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
            logger.error(
                f"JSON 파싱 오류: {response.text[:200]}"
            )  # 긴 응답은 잘라서 로깅
            return {"success": False, "message": "서버 응답을 처리할 수 없습니다"}
        except Exception as e:
            logger.error(f"API 응답 처리 오류: {str(e)}")
            return {
                "success": False,
                "message": "서버 응답 처리 중 오류가 발생했습니다",
            }

    def _make_api_request(
        self,
        method: str,
        endpoint: str,
        data: Dict = None,
        params: Dict = None,
        headers: Dict = None,
        timeout: int = None,
    ) -> Tuple[bool, Union[Dict, str]]:
        """API 요청을 수행하고 결과를 반환

        Args:
            method: HTTP 메서드 (GET, POST, PUT, DELETE 등)
            endpoint: API 엔드포인트 경로
            data: 요청 본문 데이터
            params: URL 쿼리 파라미터
            headers: HTTP 헤더
            timeout: 요청 타임아웃 (초 단위, None이면 기본값 사용)

        Returns:
            (성공 여부, 응답 데이터 또는 오류 메시지) 튜플
        """
        if timeout is None:
            timeout = self.TIMEOUT

        url = f"{self.BASE_URL}{endpoint}"

        # 헤더 설정
        request_headers = {}
        if headers:
            request_headers.update(headers)

        # 토큰이 있으면 Authorization 헤더 추가
        if self.token and "Authorization" not in request_headers:
            request_headers["Authorization"] = f"Bearer {self.token}"

        logger.debug(f"API 요청: {method} {url}")

        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                headers=request_headers,
                timeout=timeout,
            )

            # HTTP 상태 코드 로깅
            logger.debug(f"API 응답: {response.status_code} - {url}")

            # 응답 본문 파싱 시도
            try:
                response_data = response.json()
            except ValueError:
                # JSON이 아닌 경우
                if response.status_code >= 200 and response.status_code < 300:
                    return True, response.text
                else:
                    error_msg = (
                        f"API 응답이 JSON 형식이 아닙니다: {response.text[:200]}"
                    )
                    logger.error(error_msg)
                    return False, error_msg

            # HTTP 상태 코드에 따른 처리
            if response.status_code >= 200 and response.status_code < 300:
                return True, response_data
            elif response.status_code == 401:  # 인증 필요
                logger.warning(
                    "API 인증 오류: 인증이 필요하거나 토큰이 만료되었습니다."
                )
                return (
                    False,
                    "인증이 필요하거나 토큰이 만료되었습니다. 다시 로그인해 주세요.",
                )
            elif response.status_code == 403:  # 권한 없음
                logger.warning("API 권한 오류: 접근 권한이 없습니다.")
                return False, "해당 리소스에 접근할 권한이 없습니다."
            elif response.status_code == 404:  # 리소스 없음
                logger.warning(f"API 리소스 없음: {url}")
                return False, "요청한 리소스를 찾을 수 없습니다."
            elif response.status_code == 423:  # 리소스 잠김
                logger.warning(f"API 리소스 잠김: {url}")
                return (
                    False,
                    "요청한 리소스가 잠겨 있습니다. 나중에 다시 시도해 주세요.",
                )
            else:
                # 서버에서 반환한 오류 메시지 사용
                error_msg = (
                    response_data.get("detail")
                    or response_data.get("message")
                    or str(response_data)
                )
                logger.error(f"API 오류 응답: {response.status_code} - {error_msg}")
                return False, f"API 오류 ({response.status_code}): {error_msg}"

        except requests.exceptions.ConnectionError as e:
            error_msg = f"API 서버 연결 실패: {self.BASE_URL}"
            logger.error(f"{error_msg} - {str(e)}")
            return (
                False,
                f"{error_msg}\n서버가 실행 중인지 확인하거나 네트워크 연결을 확인해 주세요.",
            )

        except requests.exceptions.Timeout as e:
            error_msg = f"API 요청 타임아웃: {method} {url} (제한시간: {timeout}초)"
            logger.error(f"{error_msg} - {str(e)}")
            return (
                False,
                f"{error_msg}\n서버 응답 시간이 느려 요청이 취소되었습니다. 나중에 다시 시도해 주세요.",
            )

        except requests.exceptions.RequestException as e:
            error_msg = f"API 요청 오류: {method} {url}"
            logger.error(f"{error_msg} - {str(e)}")
            return False, f"{error_msg}\n{str(e)}"

        except Exception as e:
            error_msg = f"예상치 못한 오류: {method} {url}"
            logger.error(f"{error_msg} - {str(e)}")
            return False, f"{error_msg}\n{str(e)}"

    def login(self, username: str, password: str) -> Tuple[bool, Union[Dict, str]]:
        """사용자 로그인 및 토큰 획득

        Args:
            username: 사용자 이름
            password: 비밀번호

        Returns:
            (성공 여부, 응답 데이터 또는 오류 메시지) 튜플
        """
        logger.info(f"로그인 시도: {username}")

        data = {"username": username, "password": password}

        success, response = self._make_api_request(
            method="POST", endpoint="/api/v1/login", data=data
        )

        if success and isinstance(response, dict):
            self.token = response.get("access_token")
            self.refresh_token = response.get("refresh_token")
            logger.info(f"로그인 성공: {username}")
        else:
            logger.warning(f"로그인 실패: {username}")

        return success, response

    def logout(self) -> Tuple[bool, Union[Dict, str]]:
        """현재 사용자 로그아웃"""
        logger.info("로그아웃 요청")

        success, response = self._make_api_request(
            method="POST", endpoint="/api/v1/logout"
        )

        if success:
            # 토큰 정보 초기화
            self.token = None
            self.refresh_token = None
            logger.info("로그아웃 성공")
        else:
            logger.warning("로그아웃 실패")

        return success, response

    def refresh_access_token(self) -> Tuple[bool, Union[Dict, str]]:
        """Refresh 토큰을 사용하여 액세스 토큰 갱신"""
        if not self.refresh_token:
            logger.warning("Refresh 토큰이 없어 토큰 갱신 불가")
            return False, "Refresh 토큰이 없습니다. 다시 로그인해 주세요."

        logger.info("액세스 토큰 갱신 요청")

        data = {"refresh_token": self.refresh_token}

        # 헤더에서 Authorization 제외
        headers = {}

        success, response = self._make_api_request(
            method="POST", endpoint="/api/v1/token/refresh", data=data, headers=headers
        )

        if success and isinstance(response, dict):
            self.token = response.get("access_token")
            logger.info("액세스 토큰 갱신 성공")
        else:
            logger.warning("액세스 토큰 갱신 실패")

        return success, response

    def fetch_dashboard_data(self) -> Tuple[bool, Union[Dict, str]]:
        """대시보드 데이터 가져오기"""
        logger.info("대시보드 데이터 요청")

        success, response = self._make_api_request(
            method="GET", endpoint="/api/v1/dashboard/data"
        )

        if success:
            logger.info("대시보드 데이터 요청 성공")
        else:
            logger.warning("대시보드 데이터 요청 실패")

        return success, response

    def fetch_hourly_orders(self, date: str) -> Tuple[bool, Union[Dict, str]]:
        """시간별 주문 데이터 가져오기"""
        logger.info(f"시간별 주문 데이터 요청: {date}")

        params = {"date": date}

        success, response = self._make_api_request(
            method="GET", endpoint="/api/v1/orders/hourly", params=params
        )

        if success:
            logger.info(f"시간별 주문 데이터 요청 성공: {date}")
        else:
            logger.warning(f"시간별 주문 데이터 요청 실패: {date}")

        return success, response

    def check_health(self) -> Tuple[bool, str]:
        """API 서버 헬스 체크"""
        try:
            response = self.session.get(f"{self.BASE_URL}/health", timeout=2)
            if response.status_code == 200:
                return True, "API 서버가 정상적으로 응답하고 있습니다."
            else:
                return (
                    False,
                    f"API 서버가 비정상적인 상태 코드를 반환했습니다: {response.status_code}",
                )
        except requests.exceptions.ConnectionError:
            return False, "API 서버에 연결할 수 없습니다."
        except requests.exceptions.Timeout:
            return False, "API 서버 응답이 너무 느립니다."
        except Exception as e:
            return False, f"API 서버 헬스 체크 중 오류 발생: {str(e)}"

    # 추가적인 API 엔드포인트 메서드들...
    # 예: fetch_customer_data, update_order, create_ticket 등


# 싱글톤 인스턴스 생성
api_client = ApiClient()
