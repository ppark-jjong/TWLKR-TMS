# teckwah_project/main/dash/utils/lock_helper.py

import time
import logging
from typing import Dict, Any, Optional, Tuple, List
import datetime
from main.dash.api.api_client import ApiClient

logger = logging.getLogger(__name__)

class LockHelper:
    """비관적 락 관리 유틸리티 클래스"""
    
    @staticmethod
    def acquire_lock(dashboard_id: int, user_id: str, lock_type: str, access_token: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """락 획득 시도
        
        Args:
            dashboard_id: 대시보드 ID
            user_id: 사용자 ID
            lock_type: 락 타입 (EDIT, STATUS, ASSIGN, REMARK)
            access_token: 액세스 토큰
            
        Returns:
            Tuple[bool, Optional[Dict]]: (성공 여부, 락 정보 또는 에러 정보)
        """
        try:
            # 락 획득 API 호출
            response = ApiClient.acquire_lock(dashboard_id, lock_type, access_token)
            
            # 성공 여부 확인
            if response.get("success", False):
                logger.info(f"락 획득 성공: dashboard_id={dashboard_id}, user_id={user_id}, type={lock_type}")
                return True, response.get("data", {})
            else:
                # 실패 시 에러 정보 반환
                logger.warning(f"락 획득 실패: dashboard_id={dashboard_id}, user_id={user_id}, type={lock_type}, message={response.get('message')}")
                return False, {"message": response.get("message", "락 획득에 실패했습니다"), "is_locked": True}
        except Exception as e:
            logger.error(f"락 획득 중 오류 발생: {str(e)}")
            return False, {"message": "락 획득 중 오류가 발생했습니다", "error": str(e)}
    
    @staticmethod
    def release_lock(dashboard_id: int, user_id: str, access_token: str) -> bool:
        """락 해제
        
        Args:
            dashboard_id: 대시보드 ID
            user_id: 사용자 ID
            access_token: 액세스 토큰
            
        Returns:
            bool: 성공 여부
        """
        try:
            # 락 해제 API 호출
            response = ApiClient.release_lock(dashboard_id, access_token)
            
            # 성공 여부 확인
            success = response.get("success", False)
            if success:
                logger.info(f"락 해제 성공: dashboard_id={dashboard_id}, user_id={user_id}")
            else:
                logger.warning(f"락 해제 실패: dashboard_id={dashboard_id}, user_id={user_id}, message={response.get('message')}")
            
            return success
        except Exception as e:
            logger.error(f"락 해제 중 오류 발생: {str(e)}")
            return False
    
    @staticmethod
    def get_lock_status(dashboard_id: int, access_token: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """락 상태 확인
        
        Args:
            dashboard_id: 대시보드 ID
            access_token: 액세스 토큰
            
        Returns:
            Tuple[bool, Optional[Dict]]: (락 존재 여부, 락 정보)
        """
        try:
            # 락 상태 확인 API 호출
            response = ApiClient.get_lock_info(dashboard_id, access_token)
            
            # 성공 여부 확인
            if not response.get("success", False):
                logger.warning(f"락 상태 확인 실패: dashboard_id={dashboard_id}, message={response.get('message')}")
                return False, None
            
            # 데이터 추출
            data = response.get("data", {})
            is_locked = data.get("is_locked", False)
            
            if is_locked:
                logger.info(f"락 상태 확인: dashboard_id={dashboard_id}, locked_by={data.get('locked_by')}")
                return True, data
            else:
                logger.info(f"락 없음: dashboard_id={dashboard_id}")
                return False, None
                
        except Exception as e:
            logger.error(f"락 상태 확인 중 오류 발생: {str(e)}")
            return False, None
    
    @staticmethod
    def format_lock_message(lock_info: Dict[str, Any]) -> str:
        """락 정보를 사용자 친화적인 메시지로 변환
        
        Args:
            lock_info: 락 정보 딕셔너리
            
        Returns:
            str: 포맷된 메시지
        """
        if not lock_info:
            return "락 정보가 없습니다"
        
        locked_by = lock_info.get("locked_by", "알 수 없음")
        lock_type = lock_info.get("lock_type", "알 수 없음")
        expires_at = lock_info.get("expires_at")
        
        # 락 타입을 한글로 변환
        lock_type_map = {
            "EDIT": "편집",
            "STATUS": "상태 변경",
            "ASSIGN": "배차",
            "REMARK": "메모"
        }
        lock_type_text = lock_type_map.get(lock_type, lock_type)
        
        # 만료 시간 포맷팅
        expires_text = "알 수 없음"
        if expires_at:
            try:
                # ISO 형식 문자열을 datetime으로 변환
                if isinstance(expires_at, str):
                    expires_dt = datetime.datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                    # 현재 시간과의 차이 계산
                    now = datetime.datetime.now(datetime.timezone.utc)
                    diff_seconds = (expires_dt - now).total_seconds()
                    
                    if diff_seconds > 0:
                        diff_minutes = int(diff_seconds / 60)
                        diff_seconds = int(diff_seconds % 60)
                        expires_text = f"{diff_minutes}분 {diff_seconds}초 후"
                    else:
                        expires_text = "곧 만료됨"
            except Exception:
                # 변환 실패 시 원본 텍스트 사용
                expires_text = str(expires_at)
        
        return f"{locked_by}님이 현재 {lock_type_text} 작업 중입니다. (만료: {expires_text})"
    
    @staticmethod
    def acquire_multiple_locks(dashboard_ids: List[int], user_id: str, lock_type: str, 
                             access_token: str) -> Tuple[bool, List[int], Optional[Dict[str, Any]]]:
        """여러 대시보드에 대한 락 획득 시도 (all-or-nothing)
        
        Args:
            dashboard_ids: 대시보드 ID 목록
            user_id: 사용자 ID
            lock_type: 락 타입
            access_token: 액세스 토큰
            
        Returns:
            Tuple[bool, List[int], Optional[Dict]]: (성공 여부, 획득된 ID 목록, 에러 정보)
        """
        if not dashboard_ids:
            return True, [], None
            
        acquired_ids = []
        
        try:
            # 각 대시보드에 대해 개별적으로 락 획득 시도
            for dashboard_id in dashboard_ids:
                success, lock_info = LockHelper.acquire_lock(dashboard_id, user_id, lock_type, access_token)
                
                if success:
                    acquired_ids.append(dashboard_id)
                else:
                    # 하나라도 실패하면 이미 획득한 락 모두 해제
                    for acquired_id in acquired_ids:
                        LockHelper.release_lock(acquired_id, user_id, access_token)
                    
                    # 실패 정보 반환
                    return False, [], lock_info
            
            # 모든 락 획득 성공
            return True, acquired_ids, None
            
        except Exception as e:
            # 예외 발생 시 이미 획득한 락 모두 해제
            for acquired_id in acquired_ids:
                try:
                    LockHelper.release_lock(acquired_id, user_id, access_token)
                except:
                    pass
                    
            logger.error(f"다중 락 획득 중 오류 발생: {str(e)}")
            return False, [], {"message": "락 획득 중 오류가 발생했습니다", "error": str(e)}