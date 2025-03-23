// src/utils/AxiosConfig.js (수정)
import axios from "axios";
import AuthService from "../services/AuthService";
import message from "./MessageService";
import { MessageKeys } from "./Constants";
import TokenManager from "./TokenManager";
import { useLogger } from "./LogUtils";
import LRUCache from "../utils/LRUCache";

// 로거 초기화
const logger = useLogger("AxiosConfig");

// 토큰 갱신 중인지 확인하는 플래그
let isRefreshing = false;

// 토큰 갱신 대기 중인 요청 큐
let refreshQueue = [];

// 요청 캐싱을 위한 LRU 캐시 설정 (최대 100개 캐시, 5분 TTL)
const requestCache = new LRUCache(100, 5 * 60 * 1000);

// 진행 중인 요청을 저장할 Map (중복 요청 방지)
const pendingRequests = new Map();

// 요청 식별자 생성 함수
const getRequestKey = (config) => {
  const { method, url, params, data } = config;
  return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
};

// 캐시 키 생성 함수
const getCacheKey = (config) => {
  // GET 요청만 캐싱
  if (config.method.toLowerCase() !== "get") return null;

  const { url, params } = config;
  return `GET:${url}:${JSON.stringify(params || {})}`;
};

// 캐시 사용 여부 결정 함수
const shouldUseCache = (config) => {
  // 캐시 비활성화 설정 확인
  if (config.useCache === false) return false;

  // GET 요청만 캐싱
  if (config.method.toLowerCase() !== "get") return false;

  // 특정 API 제외 (예: 실시간 데이터)
  const nonCachableUrls = ["/dashboard/status", "/auth/check-session"];
  if (nonCachableUrls.some((path) => config.url.includes(path))) return false;

  return true;
};

// Axios 기본 설정
axios.defaults.baseURL = ""; // 동일 도메인 사용
axios.defaults.headers.common["Content-Type"] = "application/json";
axios.defaults.timeout = 30000; // 30초 타임아웃

/**
 * 요청 인터셉터 설정
 * - JWT 토큰 자동 포함
 * - 중복 요청 방지
 * - 캐싱 메커니즘 추가
 * - 요청 로깅
 */
axios.interceptors.request.use(
  (config) => {
    logger.debug(`API 요청: ${config.method?.toUpperCase()} ${config.url}`);

    // JWT 토큰 설정
    const token = TokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 캐시 처리 (GET 요청에만 적용)
    if (shouldUseCache(config)) {
      const cacheKey = getCacheKey(config);
      const cachedResponse = requestCache.get(cacheKey);

      if (cachedResponse) {
        logger.debug(`캐시에서 응답 사용: ${config.url}`);
        // 캐시된 응답 사용을 위한 어댑터 설정
        const originalAdapter = config.adapter;
        config.adapter = () => Promise.resolve(cachedResponse);
        // 캐시 적중 플래그 설정
        config._fromCache = true;
        return config;
      }
    }

    // 중복 요청 방지 로직 (GET 요청만 적용)
    if (config.method?.toLowerCase() === "get") {
      const requestKey = getRequestKey(config);

      // 동일한 요청이 진행 중인 경우 취소
      if (pendingRequests.has(requestKey)) {
        const source = pendingRequests.get(requestKey);
        source.cancel("중복 요청 취소");
        pendingRequests.delete(requestKey); // 기존 요청 제거
      }

      // 현재 요청 저장
      const source = axios.CancelToken.source();
      config.cancelToken = source.token;
      pendingRequests.set(requestKey, source);
    }

    return config;
  },
  (error) => {
    logger.error("요청 인터셉터 오류:", error);
    return Promise.reject(error);
  }
);

/**
 * 응답 인터셉터 설정
 * - 성공 응답 구조 표준화
 * - 캐시 저장 메커니즘
 * - 토큰 만료 처리 및 자동 갱신
 * - 오류 처리 패턴 표준화
 * - 락(Lock) 충돌 처리
 */
axios.interceptors.response.use(
  (response) => {
    logger.debug(`API 응답: ${response.config.url} - 상태: ${response.status}`);

    // 요청 완료 후 Map에서 제거
    if (response.config.method?.toLowerCase() === "get") {
      const requestKey = getRequestKey(response.config);
      pendingRequests.delete(requestKey);
    }

    // 캐시에서 가져온 응답이 아닌 경우에만 캐시 저장
    if (!response.config._fromCache && shouldUseCache(response.config)) {
      const cacheKey = getCacheKey(response.config);
      if (cacheKey) {
        logger.debug(`응답 캐시 저장: ${response.config.url}`);
        requestCache.set(cacheKey, response);
      }
    }

    // 백엔드 API 응답 구조 검증 및 표준화 ({success, message, data})
    if (response.data && typeof response.data === "object") {
      // 이미 표준 구조인 경우 그대로 반환
      if ("success" in response.data) {
        return response;
      }

      // 표준 구조가 아닌 경우 변환 (레거시 API 호환)
      logger.warn("비표준 API 응답 구조:", response.config.url);
      response.data = {
        success: true,
        message: "데이터를 조회했습니다",
        data: response.data,
      };
    }

    return response;
  },
  async (error) => {
    // 요청 취소 에러 처리 (중복 요청 등)
    if (axios.isCancel(error)) {
      logger.info("요청이 취소되었습니다:", error.message);
      return Promise.reject(error);
    }

    // 에러 발생 시에도 진행 중인 요청 Map에서 제거
    if (error.config?.method?.toLowerCase() === "get") {
      const requestKey = getRequestKey(error.config);
      pendingRequests.delete(requestKey);
    }

    // 응답이 없는 경우 (네트워크 오류)
    if (!error.response) {
      logger.error("네트워크 오류 발생:", error.message);
      message.error(
        "서버와 통신할 수 없습니다. 네트워크 연결을 확인해주세요.",
        MessageKeys.ERROR.NETWORK
      );
      return Promise.reject(error);
    }

    // HTTP 상태 코드별 처리
    const status = error.response.status;
    const errorData = error.response.data;
    const originalRequest = error.config;

    logger.debug(`오류 응답: ${status} - ${originalRequest.url}`, errorData);

    switch (status) {
      // 401 Unauthorized: 인증 오류, 토큰 만료
      case 401: {
        // 로그인 요청 자체가 실패한 경우는 별도 처리
        if (originalRequest.url.includes("/auth/login")) {
          return Promise.reject(error);
        }

        // 리프레시 토큰 시도 자체가 실패한 경우 로그인 페이지로 이동
        if (originalRequest.url.includes("/auth/refresh")) {
          logger.warn("토큰 갱신 실패 - 로그인 필요");
          AuthService.clearAuthData();
          message.error("세션이 만료되었습니다. 다시 로그인해주세요.");
          window.location.href = "/login";
          return Promise.reject(error);
        }

        const refreshToken = TokenManager.getRefreshToken();

        // 리프레시 토큰이 없는 경우
        if (!refreshToken) {
          logger.warn("리프레시 토큰 없음: 로그인 페이지로 이동");
          AuthService.clearAuthData();
          message.error("세션이 만료되었습니다. 다시 로그인해주세요.");
          window.location.href = "/login";
          return Promise.reject(error);
        }

        // 이미 토큰 갱신 중인 경우 갱신 완료 후 원래 요청 재시도
        if (isRefreshing) {
          try {
            logger.debug("이미 토큰 갱신 중: 갱신 완료 대기");
            // 갱신 완료를 기다리는 새 프로미스 생성
            return new Promise((resolve) => {
              refreshQueue.push((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                // 캐시 사용하지 않도록 설정 (토큰 갱신 후 최신 데이터 가져오기)
                originalRequest.useCache = false;
                resolve(axios(originalRequest));
              });
            });
          } catch (e) {
            logger.error("토큰 갱신 대기 중 오류:", e);
            return Promise.reject(error);
          }
        }

        // 토큰 갱신 중이 아닌 경우에만 갱신 요청
        isRefreshing = true;
        logger.debug("토큰 갱신 시작");

        try {
          // 토큰 갱신 요청
          const response = await AuthService.refreshToken(refreshToken);

          // 갱신 성공
          if (response && response.token) {
            logger.debug("토큰 갱신 성공");
            const { access_token, refresh_token } = response.token;

            // 토큰 저장
            TokenManager.setAccessToken(access_token);
            if (refresh_token) {
              TokenManager.setRefreshToken(refresh_token);
            }

            // 원래 요청 다시 시도
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            // 캐시 사용하지 않도록 설정 (토큰 갱신 후 최신 데이터 가져오기)
            originalRequest.useCache = false;

            // 대기 중인 요청 모두 재시도
            refreshQueue.forEach((cb) => cb(access_token));
            refreshQueue = [];

            isRefreshing = false;
            return axios(originalRequest);
          } else {
            logger.error("토큰 갱신 응답 형식 오류");
            throw new Error("토큰 갱신 실패: 응답 형식 오류");
          }
        } catch (refreshError) {
          // 갱신 실패
          logger.error("토큰 갱신 실패:", refreshError);
          isRefreshing = false;
          AuthService.clearAuthData();
          message.error("인증 세션이 만료되었습니다. 다시 로그인해주세요.");
          window.location.href = "/login";
          return Promise.reject(error);
        }
      }

      // 403 Forbidden: 권한 없음
      case 403: {
        const errorMsg =
          errorData?.message || "이 작업을 수행할 권한이 없습니다.";
        message.error(errorMsg, MessageKeys.AUTH.PERMISSION);
        return Promise.reject(error);
      }

      // 404 Not Found: 리소스 없음
      case 404: {
        const errorMsg =
          errorData?.message || "요청한 리소스를 찾을 수 없습니다.";
        message.error(errorMsg, MessageKeys.ERROR.NOT_FOUND);
        return Promise.reject(error);
      }

      // 409 Conflict: 데이터 충돌 (낙관적 락 관련 로직 제거, 단순 에러 메시지만 유지)
      case 409: {
        logger.warn("데이터 충돌 발생", errorData);
        const errorMsg =
          "다른 사용자가 이미 이 데이터를 수정했습니다. 새로고침 후 다시 시도해주세요.";
        message.error(errorMsg, MessageKeys.DASHBOARD.OPTIMISTIC_LOCK);

        // 캐시 무효화
        if (originalRequest.url) {
          const urlPattern = originalRequest.url
            .split("/")
            .slice(0, -1)
            .join("/");
          requestCache.invalidatePattern(urlPattern);
        }

        return Promise.reject(error);
      }

      // 423 Locked: 비관적 락 충돌
      case 423: {
        logger.warn("비관적 락 충돌 발생", errorData);

        // 락 정보 추출
        const detail = errorData?.error?.detail || errorData?.detail || {};
        const lockedBy = detail.locked_by || "다른 사용자";
        const lockType = detail.lock_type || "";
        const expiresAt = detail.expires_at;

        let lockTypeText = "편집";
        switch (lockType) {
          case "EDIT":
            lockTypeText = "편집";
            break;
          case "STATUS":
            lockTypeText = "상태 변경";
            break;
          case "ASSIGN":
            lockTypeText = "배차";
            break;
          case "REMARK":
            lockTypeText = "메모 작성";
            break;
        }

        // 락 만료 시간 포맷팅
        const expiryInfo = expiresAt
          ? ` (만료: ${new Date(expiresAt).toLocaleTimeString()})`
          : "";
        const errorMsg = `현재 ${lockedBy}님이 이 데이터를 ${lockTypeText} 중입니다${expiryInfo}. 잠시 후 다시 시도해주세요.`;

        // 에러 객체에 락 정보 추가 (컴포넌트에서 활용)
        error.lockInfo = {
          lockedBy,
          lockType,
          lockTypeText,
          expiresAt,
        };

        message.error(errorMsg, MessageKeys.DASHBOARD.PESSIMISTIC_LOCK);
        return Promise.reject(error);
      }

      // 400 Bad Request: 잘못된 요청
      case 400: {
        // 필드별 유효성 검증 오류 처리
        const fields = errorData?.error?.fields || {};
        const hasFieldErrors = Object.keys(fields).length > 0;

        if (hasFieldErrors) {
          // 필드 오류 정보를 에러 객체에 추가 (폼 컴포넌트에서 활용)
          error.fieldErrors = fields;

          // 첫 번째 필드 오류 메시지를 표시
          const firstField = Object.keys(fields)[0];
          const firstError = fields[firstField];
          const errorMsg = Array.isArray(firstError)
            ? firstError[0]
            : firstError;

          message.error(errorMsg, MessageKeys.VALIDATION.FIELD_ERROR);
        } else {
          // 일반 오류 메시지 처리
          const errorMsg =
            errorData?.message ||
            errorData?.error?.detail ||
            "요청 데이터가 올바르지 않습니다.";
          message.error(errorMsg, MessageKeys.ERROR.BAD_REQUEST);
        }

        return Promise.reject(error);
      }

      // 500 Internal Server Error: 서버 오류
      case 500: {
        const errorMsg =
          errorData?.message ||
          "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
        message.error(errorMsg, MessageKeys.ERROR.SERVER);
        return Promise.reject(error);
      }

      // 기타 오류
      default: {
        const errorMsg =
          errorData?.message ||
          errorData?.error?.detail ||
          `요청 처리 중 오류가 발생했습니다 (${status}).`;
        message.error(errorMsg, MessageKeys.ERROR.UNKNOWN);
        return Promise.reject(error);
      }
    }
  }
);

/**
 * 모든 진행 중인 요청 취소 함수
 * 페이지 이동 등의 상황에서 불필요한 요청 정리
 */
export const cancelAllPendingRequests = () => {
  logger.info(`진행 중인 ${pendingRequests.size}개 요청 모두 취소`);
  pendingRequests.forEach((source, key) => {
    source.cancel("사용자 페이지 이탈로 인한 요청 취소");
    logger.debug(`요청 취소: ${key}`);
  });
  pendingRequests.clear();
};

/**
 * 캐시 무효화 함수 (특정 패턴의 URL에 대한 캐시 제거)
 */
export const invalidateCache = (urlPattern) => {
  requestCache.invalidatePattern(urlPattern);
};

/**
 * 전체 캐시 초기화 함수
 */
export const clearCache = () => {
  requestCache.clear();
};

/**
 * API 요청 재시도 유틸리티
 * 네트워크 불안정 등으로 실패한 요청을 자동 재시도
 */
export const withRetry = async (apiCall, maxRetries = 3, retryDelay = 1000) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      // 특정 오류는 재시도하지 않음
      if (
        error.response &&
        [400, 401, 403, 404, 409, 423].includes(error.response.status)
      ) {
        throw error;
      }

      // 마지막 시도가 아니면 재시도
      if (attempt < maxRetries - 1) {
        logger.info(`API 호출 재시도 (${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw lastError;
};

export default axios;
