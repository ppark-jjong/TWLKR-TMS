// frontend/src/utils/useDateRange.js
import { useState, useEffect, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import VisualizationService from '../services/VisualizationService';
import { useLogger } from './LogUtils';

/**
 * 날짜 범위 선택 및 관리를 위한 커스텀 훅
 * @param {number} defaultDays - 기본 표시할 날짜 범위 (오늘 기준 이전 일수)
 * @returns {Object} - 날짜 범위 관련 상태 및 핸들러
 */
export const useDateRange = (defaultDays = 7) => {
  const logger = useLogger('useDateRange');
  const [dateRange, setDateRange] = useState(null);
  const [availableDateRange, setAvailableDateRange] = useState(null);
  const [loading, setLoading] = useState(true);

  // 중복 요청 방지를 위한 플래그
  const isLoadingRef = useRef(false);

  // 날짜 범위 정보 조회
  const fetchDateRange = useCallback(async () => {
    // 이미 로딩 중이면 중복 요청 방지
    if (isLoadingRef.current) {
      logger.info('날짜 범위 정보를 이미 로딩 중입니다.');
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);

      logger.info('날짜 범위 정보 조회 시작');
      const response = await VisualizationService.getDateRange();

      if (response && response.success) {
        setAvailableDateRange(response.date_range);
        logger.debug('날짜 범위 정보 조회 성공:', response.date_range);

        // 기본 날짜 범위 설정 (오늘부터 지정된 일수만큼 이전)
        const today = dayjs();
        const startDate = today.subtract(defaultDays, 'day');

        setDateRange([startDate, today]);
      }
    } catch (error) {
      logger.error('날짜 범위 정보 조회 실패:', error);

      // 에러 발생 시 기본 날짜 범위 설정
      const today = dayjs();
      const startDate = today.subtract(defaultDays, 'day');

      setDateRange([startDate, today]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [defaultDays, logger]);

  // 컴포넌트 마운트 시 날짜 범위 정보 로드
  useEffect(() => {
    fetchDateRange();
  }, [fetchDateRange]);

  // 날짜 선택 핸들러
  const handleDateRangeChange = useCallback((dates) => {
    if (dates && dates.length === 2) {
      setDateRange(dates);
    }
  }, []);

  // 비활성화할 날짜 판단 함수
  const disabledDate = useCallback(
    (current) => {
      if (!availableDateRange) return false;

      // 문자열 날짜를 dayjs 객체로 변환
      const oldest = dayjs(availableDateRange.oldest_date);
      const latest = dayjs(availableDateRange.latest_date);

      // 조회 가능 범위 밖의 날짜는 비활성화
      return (
        current &&
        (current < oldest.startOf('day') || current > latest.endOf('day'))
      );
    },
    [availableDateRange]
  );

  return {
    dateRange,
    setDateRange,
    availableDateRange,
    handleDateRangeChange,
    disabledDate,
    loading,
    fetchDateRange,
  };
};
