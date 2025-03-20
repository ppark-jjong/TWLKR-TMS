// src/controllers/VisualizationController.js - 리팩토링 버전
import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageKeys } from '../utils/message';
import VisualizationService from '../services/VisualizationService';
import { useLogger } from '../utils/LogUtils';
import message from '../utils/message';

/**
 * 시각화 페이지 컨트롤러 커스텀 훅 (백엔드 API 명세 기반 리팩토링)
 * - 백엔드 API 응답 구조에 맞게 로직 최적화
 * - 불필요한 중간 처리 제거
 * - 에러 처리 및 로딩 상태 관리 개선
 * - 비동기 요청 제어 메커니즘 강화
 */
const useVisualizationController = () => {
  const logger = useLogger('VisualizationController');

  // 차트 상태 관리
  const [chartType, setChartType] = useState('delivery_status');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 중복 요청 방지 레퍼런스
  const loadingRequestRef = useRef(false);

  /**
   * 시각화 데이터 로드 함수
   * 백엔드 API 명세에 맞게 구현
   * @param {dayjs} startDate - 시작 날짜
   * @param {dayjs} endDate - 종료 날짜
   */
  const loadVisualizationData = useCallback(
    async (startDate, endDate) => {
      // 날짜 검증
      if (!startDate || !endDate) {
        logger.warn('날짜 범위가 제공되지 않았습니다');
        return;
      }

      // 중복 요청 방지
      if (loadingRequestRef.current) {
        logger.info('이미 데이터 로드 중입니다. 중복 요청 방지');
        return;
      }

      // 날짜 형식 변환
      const formattedStartDate = startDate.format('YYYY-MM-DD');
      const formattedEndDate = endDate.format('YYYY-MM-DD');

      // 로딩 상태 설정
      loadingRequestRef.current = true;
      setLoading(true);
      setError(null);

      // 메시지 표시
      message.loading('데이터 로드 중...', MessageKeys.VISUALIZATION.LOAD);

      try {
        logger.info(
          `${chartType} 데이터 로드 시작: ${formattedStartDate} ~ ${formattedEndDate}`
        );

        // 차트 타입에 따른 API 호출
        let response;

        if (chartType === 'delivery_status') {
          response = await VisualizationService.getDeliveryStatus(
            formattedStartDate,
            formattedEndDate
          );
        } else {
          // hourly_orders
          response = await VisualizationService.getHourlyOrders(
            formattedStartDate,
            formattedEndDate
          );
        }

        logger.debug('API 응답:', response);

        // 응답 처리
        if (response && response.success) {
          // 성공 시 데이터 설정
          setData(response.data);
          setLastUpdated(new Date());
          setInitialLoad(false);

          // 메시지 표시
          if (response.data.total_count > 0) {
            message.success('데이터 로드 완료', MessageKeys.VISUALIZATION.LOAD);
          } else {
            message.info(
              '조회된 데이터가 없습니다',
              MessageKeys.VISUALIZATION.LOAD
            );
          }
        } else {
          // 에러 처리
          const errorMsg = response?.message || '데이터 로드에 실패했습니다';
          setError(new Error(errorMsg));
          message.error(errorMsg, MessageKeys.VISUALIZATION.LOAD);
          logger.error('API 오류 응답:', response);
        }
      } catch (err) {
        // 예외 처리
        logger.error('시각화 데이터 로드 중 예외 발생:', err);
        setError(err);
        message.error(
          '데이터 로드 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          MessageKeys.VISUALIZATION.LOAD
        );
      } finally {
        // 상태 정리
        setLoading(false);
        loadingRequestRef.current = false;
      }
    },
    [chartType, logger]
  );

  /**
   * 차트 타입 변경 핸들러
   * @param {string} type - 차트 타입
   */
  const handleChartTypeChange = useCallback(
    (type) => {
      logger.debug(`차트 타입 변경: ${type}`);
      setChartType(type);
    },
    [logger]
  );

  /**
   * 새로고침 핸들러
   * @param {dayjs} startDate - 시작 날짜
   * @param {dayjs} endDate - 종료 날짜
   */
  const handleRefresh = useCallback(
    (startDate, endDate) => {
      if (startDate && endDate) {
        logger.debug('데이터 새로고침 요청');
        loadVisualizationData(startDate, endDate);
      } else {
        logger.warn('새로고침 실패: 유효한 날짜 범위가 없습니다');
      }
    },
    [loadVisualizationData, logger]
  );

  /**
   * 데이터 유효성 검증 함수
   * 백엔드 API 응답 구조에 맞게 구현
   * @param {Object} data - 검증할 데이터
   * @param {string} type - 차트 타입
   * @returns {boolean} - 데이터 유효성 여부
   */
  const isValidData = useCallback((data, type) => {
    if (!data) return false;

    // 배송 현황 차트 데이터 검증
    if (type === 'delivery_status') {
      return (
        data.department_breakdown &&
        typeof data.department_breakdown === 'object' &&
        Object.keys(data.department_breakdown).length > 0 &&
        data.total_count > 0
      );
    }
    // 시간대별 접수량 차트 데이터 검증
    else if (type === 'hourly_orders') {
      return (
        data.department_breakdown &&
        typeof data.department_breakdown === 'object' &&
        Object.keys(data.department_breakdown).length > 0 &&
        Array.isArray(data.time_slots) &&
        data.time_slots.length > 0 &&
        data.total_count > 0
      );
    }

    return false;
  }, []);

  return {
    chartType, // 현재 차트 타입
    data, // 차트 데이터
    loading, // 로딩 상태
    error, // 에러 상태
    initialLoad, // 초기 로드 여부
    lastUpdated, // 마지막 업데이트 시간
    handleChartTypeChange, // 차트 타입 변경 핸들러
    loadVisualizationData, // 데이터 로드 함수
    handleRefresh, // 새로고침 핸들러
    isValidData, // 데이터 유효성 검증 함수
  };
};

export default useVisualizationController;
