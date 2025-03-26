# teckwah_project/main/server/cache_manager.py
import time
from typing import Any, Dict, Callable, Optional, TypeVar, Tuple, Generic
from functools import wraps
from app.utils.logger import log_info, log_error

T = TypeVar("T")


class CacheItem(Generic[T]):
    """캐시 아이템을 표현하는 클래스"""

    def __init__(self, value: T, timestamp: float, ttl: int):
        self.value = value
        self.timestamp = timestamp
        self.ttl = ttl

    def is_valid(self) -> bool:
        """캐시 아이템의 유효성 확인"""
        current_time = time.time()
        return current_time - self.timestamp < self.ttl


class CacheManager:
    """
    메모리 캐시 관리자

    Example:
        cache = CacheManager()

        @cache.cached(ttl=3600)
        def expensive_operation(param1, param2):
            # 비용이 많이 드는 연산
            return result
    """

    def __init__(self):
        self._cache: Dict[str, CacheItem] = {}

    def get(self, key: str) -> Optional[Any]:
        """
        캐시에서 값 조회

        Args:
            key: 캐시 키

        Returns:
            캐시된 값 또는 None (캐시 없거나 만료된 경우)
        """
        cache_item = self._cache.get(key)

        if not cache_item:
            return None

        if not cache_item.is_valid():
            del self._cache[key]
            return None

        return cache_item.value

    def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        """
        캐시에 값 저장

        Args:
            key: 캐시 키
            value: 저장할 값
            ttl: 유효 시간(초), 기본값 1시간
        """
        self._cache[key] = CacheItem(value, time.time(), ttl)

    def delete(self, key: str) -> None:
        """
        캐시에서 값 삭제

        Args:
            key: 삭제할 캐시 키
        """
        if key in self._cache:
            del self._cache[key]

    def clear(self) -> None:
        """캐시 전체 비우기"""
        self._cache.clear()

    def cached(self, ttl: int = 3600):
        """
        함수 결과를 캐싱하는 데코레이터

        Args:
            ttl: 캐시 유효 시간(초), 기본값 1시간

        Example:
            @cache_manager.cached(ttl=300)
            def get_expensive_data(param1, param2):
                # 비용이 많이 드는 연산
                return result
        """

        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # 캐시 키 생성 (함수명 + 인자 기반)
                key_parts = [func.__name__]
                for arg in args:
                    key_parts.append(str(arg))
                for k, v in sorted(kwargs.items()):
                    key_parts.append(f"{k}={v}")

                cache_key = ":".join(key_parts)

                # 캐시에서 값 조회
                cached_value = self.get(cache_key)
                if cached_value is not None:
                    log_info(f"캐시 적중: {cache_key}")
                    return cached_value

                # 캐시 없으면 함수 실행 후 결과 캐싱
                log_info(f"캐시 부재: {cache_key}, 함수 실행 후 캐싱")
                result = func(*args, **kwargs)
                self.set(cache_key, result, ttl)
                return result

            return wrapper

        return decorator


# 전역 캐시 관리자 인스턴스
cache_manager = CacheManager()
