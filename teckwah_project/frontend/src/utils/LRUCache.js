// src/utils/LRUCache.js (수정)
/**
 * 간소화된 캐시 구현
 * 간단한 캐싱 메커니즘 제공
 */
class SimpleCache {
  constructor(ttl = 5 * 60 * 1000) {
    this.ttl = ttl;
    this.cache = new Map();
  }

  /**
   * 캐시에서 항목 조회
   * @param {string} key - 캐시 키
   * @returns {*} 캐시된 값 또는 undefined
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return undefined;

    // TTL 체크
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  /**
   * 캐시에 항목 저장
   * @param {string} key - 캐시 키
   * @param {*} value - 저장할 값
   */
  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * 캐시 항목 삭제
   * @param {string} key - 삭제할 캐시 키
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * 모든 캐시 항목 제거
   */
  clear() {
    this.cache.clear();
  }
}

// LRUCache 이름 유지하여 기존 코드 호환성 유지
export default SimpleCache;
