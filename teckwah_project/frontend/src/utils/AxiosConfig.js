// frontend/src/utils/AxiosConfig.js

import axios from "axios";
import AuthService from "../services/AuthService";
import message from "../utils/message";
import { useLogger } from "./LogUtils";

// 로거 초기화
const logger = useLogger("AxiosConfig");

// 토큰 갱신 중인지 확인하는 플래그
let isRefreshing = false;

// 토큰 갱신 대기 중인 요청 큐
let refreshQueue = [];

// 진행 중인 요청을 저장할 Map
const pendingRequests = new Map();

// 요청 식별자 생성 함수
const getRequestKey = (config) => {
  const { method, url, params, data } = config;
  return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
};

// Axios 기본 설정
axios.defaults.baseURL = ""; // 동일 도메인 사용
axios.defaults.headers.common["Content-Type"] = "application/json";
axios.defaults.timeout = 30000; // 30초 타임아웃

// 요청 인터셉터
axios.interceptors.request.use(
  (config) => {
    logger.debug(`API 요청: ${config.method?.toUpperCase()} ${config.url}`);

    // JWT 토큰 설정
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 중복 요청 방지 로직 (GET 요청만 적용)
    if (config.method && config.method.toLowerCase() === "get") {
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

// 응답 인터셉터
axios.interceptors.response.use(
  (response) => {
    logger.debug(`API 응답: ${response.config.url} - 상태: ${response.status}`);

    // 요청 완료 후 Map에서 제거
    if (
      response.config.method &&
      response.config.method.toLowerCase() === "get"
    ) {
      const requestKey = getRequestKey(response.config);
      pendingRequests.delete(requestKey);
    }
    return response;
  },
  async (error) => {
    // 요청 취소 에러 처리
    if (axios.isCancel(error)) {
      logger.info("요청이 취소되었습니다:", error.message);
      return Promise.reject(error);
    }

    // 에러 발생 시에도 진행 중인 요청 Map에서 제거
    if (
      error.config &&
      error.config.method &&
      error.config.method.toLowerCase() === "get"
    ) {
      const requestKey = getRequestKey(error.config);
      pendingRequests.delete(requestKey);
    }

    // 토큰 만료 오류 (401) 처리
    if (error.response && error.response.status === 401) {
      const originalRequest = error.config;
      const refreshToken = localStorage.getItem("refresh_token");

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
          localStorage.setItem("access_token", access_token);
          localStorage.setItem("refresh_token", refresh_token);

          // 원래 요청 다시 시도
          originalRequest.headers.Authorization = `Bearer ${access_token}`;

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

    // 다른 오류 처리
    logger.error(
      `API 오류: ${error.config?.url || "알 수 없음"} - ${error.message}`,
      error.response?.data
    );

    return Promise.reject(error);
  }
);

// 모든 진행 중인 요청 취소 함수
export const cancelAllPendingRequests = () => {
  logger.info(`진행 중인 ${pendingRequests.size}개 요청 모두 취소`);
  pendingRequests.forEach((source) => {
    source.cancel("사용자 페이지 이탈로 인한 요청 취소");
  });
  pendingRequests.clear();
};

export default axios;
