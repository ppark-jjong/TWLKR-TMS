// src/controllers/VisualizationController.js
import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageKeys } from '../utils/message';
import VisualizationService from '../services/VisualizationService';
import useAsync from '../hooks/useAsync';

/**
 * 시각화 페이지 컨트롤러 커스텀 훅
 * 시각화 관련 상태 및 비즈니스 로직 관리
 */
const useVisualizationController = () => {
  // 차트 상태 관리
  const [chartType, setChartType] = useState('delivery_status');
  const [data, setData] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);

  // 중복 요청 방지 Ref
  const loadingRequestRef = useRef(false);

  // 비동기 시각화 데이터 로드 (배송 현황)
  const {
    loading: deliveryStatusLoading,
    error: deliveryStatusError,
    execute: loadDeliveryStatus,
  } = useAsync(VisualizationService.getDeliveryStatus, {
    messageKey: MessageKeys.VISUALIZATION.LOAD,
    loadingMessage: '배송 현황 데이터를 불러오는 중...',
    successMessage: '데이터 로드 완료',
    errorMessage: '데이터 로드 중 오류가 발생했습니다',
  });

  // 비동기 시각화 데이터 로드 (시간대별 접수량)
  const {
    loading: hourlyOrdersLoading,
    error: hourlyOrdersError,
    execute: loadHourlyOrders,
  } = useAsync(VisualizationService.getHourlyOrders, {
    messageKey: MessageKeys.VISUALIZATION.LOAD,
    loadingMessage: '시간대별 접수량 데이터를 불러오는 중...',
    successMessage: '데이터 로드 완료',
    errorMessage: '데이터 로드 중 오류가 발생했습니다',
  });

  // 로딩 상태 계산
  const loading = deliveryStatusLoading || hourlyOrdersLoading;

  // 에러 상태 계산
  const error = deliveryStatusError || hourlyOrdersError;

  /**
   * 시각화 데이터 로드 함수
   * @param {dayjs} startDate - 시작 날짜
   * @param {dayjs} endDate - 종료 날짜
   */
  const loadVisualizationData = useCallback(
    async (startDate, endDate) => {
      if (!startDate || !endDate || loadingRequestRef.current) return;

      loadingRequestRef.current = true;
      try {
        console.log(
          `${chartType} 데이터 로드 시작: ${startDate.format(
            'YYYY-MM-DD'
          )} ~ ${endDate.format('YYYY-MM-DD')}`
        );

        // 차트 타입에 따라 적절한 API 호출
        let response;
        if (chartType === 'delivery_status') {
          response = await loadDeliveryStatus(
            startDate.format('YYYY-MM-DD'),
            endDate.format('YYYY-MM-DD')
          );
        } else {
          response = await loadHourlyOrders(
            startDate.format('YYYY-MM-DD'),
            endDate.format('YYYY-MM-DD')
          );
        }

        // 유효한 응답인 경우 데이터 설정
        if (response && response.success) {
          setData(response.data);
        }

        setInitialLoad(false);
      } finally {
        loadingRequestRef.current = false;
      }
    },
    [chartType, loadDeliveryStatus, loadHourlyOrders]
  );

  /**
   * 차트 타입 변경 핸들러
   * @param {string} type - 차트 타입
   */
  const handleChartTypeChange = useCallback((type) => {
    setChartType(type);
  }, []);

  /**
   * 새로고침 핸들러
   * @param {dayjs} startDate - 시작 날짜
   * @param {dayjs} endDate - 종료 날짜
   */
  const handleRefresh = useCallback(
    (startDate, endDate) => {
      if (startDate && endDate) {
        loadVisualizationData(startDate, endDate);
      }
    },
    [loadVisualizationData]
  );

  // 차트 데이터 유효성 검증
  const isValidData = useCallback((data, type) => {
    if (!data) return false;

    if (type === 'delivery_status') {
      return (
        data.department_breakdown &&
        typeof data.department_breakdown === 'object' &&
        Object.keys(data.department_breakdown).length > 0
      );
    } else {
      return (
        data.department_breakdown &&
        typeof data.department_breakdown === 'object' &&
        Array.isArray(data.time_slots) &&
        data.time_slots.length > 0
      );
    }
  }, []);

  return {
    chartType,
    data,
    loading,
    error,
    initialLoad,
    handleChartTypeChange,
    loadVisualizationData,
    handleRefresh,
    isValidData,
  };
};

export default useVisualizationController;
