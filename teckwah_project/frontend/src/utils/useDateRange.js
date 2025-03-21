// src/utils/useDateRange.js
import { useState, useEffect, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import VisualizationService from '../services/VisualizationService';
import { useLogger } from './LogUtils';
import MessageService from './MessageService';
import { MessageKeys } from './Constants';

/**
 * 날짜 범위 선택 및 관리를 위한 커스텀 훅 (개선 버전)
 * 중복 요청 최적화, 캐싱, 에러 처리 개선
 *
 * @param {number} defaultDays - 기본 표시할 날짜 범위 (오늘 기준 이전 일수)
 * @returns {Object} - 날짜 범위 관련 상태 및 핸들러
 */
export const useDateRange = (defaultDays = 7) => {
  const logger = useLogger('useDateRange');
  const [dateRange, setDateRange] = useState(null);
  const [availableDateRange, setAvailableDateRange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 중복 요청 방지를 위한 플래그
  const isLoadingRef = useRef(false);

  // 캐시 키
  const DATE_RANGE_CACHE_KEY = 'dateRange_cache';
  const DATE_RANGE_CACHE_EXPIRY = 'dateRange_cache_expiry';

  /**
   * 날짜 범위 정보 조회 (캐싱 적용)
   */
  const fetchDateRange = useCallback(async () => {
    // 이미 로딩 중이면 중복 요청 방지
    if (isLoadingRef.current) {
      logger.info('날짜 범위 정보를 이미 로딩 중입니다.');
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);

      logger.info('날짜 범위 정보 조회 시작');

      // 캐시된 데이터 확인 (1시간 캐시)
      const cacheExpiry = localStorage.getItem(DATE_RANGE_CACHE_EXPIRY);
      const now = Date.now();

      if (cacheExpiry && parseInt(cacheExpiry) > now) {
        const cachedData = localStorage.getItem(DATE_RANGE_CACHE_KEY);
        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData);
            setAvailableDateRange(parsedData);
            logger.debug('캐시된 날짜 범위 정보 사용', parsedData);

            // 기본 날짜 범위 설정 (오늘부터 지정된 일수만큼 이전)
            setDefaultRange(parsedData);

            // 캐시 사용 시에도 백그라운드에서 새로운 데이터 가져오기 (stale-while-revalidate)
            refreshRangeInBackground();

            setLoading(false);
            isLoadingRef.current = false;
            return parsedData;
          } catch (err) {
            logger.warn('캐시 데이터 파싱 오류:', err);
          }
        }
      }

      // 캐시 없거나 만료됨 - API 호출
      const response = await VisualizationService.getDateRange();

      if (response && response.success) {
        const rangeData = response.date_range;
        setAvailableDateRange(rangeData);
        logger.debug('날짜 범위 정보 조회 성공:', rangeData);

        // 캐싱 (1시간)
        localStorage.setItem(DATE_RANGE_CACHE_KEY, JSON.stringify(rangeData));
        localStorage.setItem(
          DATE_RANGE_CACHE_EXPIRY,
          (now + 60 * 60 * 1000).toString()
        );

        // 기본 날짜 범위 설정
        setDefaultRange(rangeData);

        return rangeData;
      } else {
        throw new Error('날짜 범위 정보 응답 형식 오류');
      }
    } catch (error) {
      logger.error('날짜 범위 정보 조회 실패:', error);
      setError('날짜 범위 정보를 조회하는 중 오류가 발생했습니다');

      // 에러 시에도 기본 날짜 범위는 설정
      setDefaultRangeFallback();

      // 에러 메시지 표시
      MessageService.error(
        '날짜 범위 정보를 불러올 수 없습니다. 기본 범위를 사용합니다.',
        MessageKeys.VISUALIZATION.LOAD
      );
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [logger]);

  /**
   * 백그라운드에서 날짜 범위 갱신 (사용자 경험 해치지 않도록)
   */
  const refreshRangeInBackground = useCallback(async () => {
    try {
      const response = await VisualizationService.getDateRange();

      if (response && response.success) {
        const rangeData = response.date_range;
        setAvailableDateRange(rangeData);

        // 캐싱 업데이트 (1시간)
        localStorage.setItem(DATE_RANGE_CACHE_KEY, JSON.stringify(rangeData));
        localStorage.setItem(
          DATE_RANGE_CACHE_EXPIRY,
          (Date.now() + 60 * 60 * 1000).toString()
        );

        logger.debug('백그라운드 날짜 범위 갱신 완료');
      }
    } catch (err) {
      logger.warn('백그라운드 날짜 범위 갱신 실패:', err);
    }
  }, [logger]);

  /**
   * 기본 날짜 범위 설정 (사용 가능 범위 내에서)
   */
  const setDefaultRange = useCallback(
    (rangeData) => {
      const today = dayjs();
      let startDate = today.subtract(defaultDays, 'day');

      // 가능한 범위를 벗어난 경우 조정
      if (rangeData) {
        const oldest = dayjs(rangeData.oldest_date);
        const latest = dayjs(rangeData.latest_date);

        // 시작일이 가장 오래된 날짜보다 이전인 경우 조정
        if (startDate.isBefore(oldest)) {
          startDate = oldest;
        }

        // 오늘이 최신 날짜보다 이후인 경우 조정
        let endDate = today;
        if (endDate.isAfter(latest)) {
          endDate = latest;
          // 시작일도 그에 맞게 조정
          startDate = latest.subtract(defaultDays, 'day');
          if (startDate.isBefore(oldest)) {
            startDate = oldest;
          }
        }

        setDateRange([startDate, endDate]);
      } else {
        // 범위 데이터가 없는 경우 기본값 설정
        setDateRange([startDate, today]);
      }
    },
    [defaultDays]
  );

  /**
   * 폴백 날짜 범위 설정 (API 조회 실패 시)
   */
  const setDefaultRangeFallback = useCallback(() => {
    const today = dayjs();
    const startDate = today.subtract(defaultDays, 'day');
    setDateRange([startDate, today]);
  }, [defaultDays]);

  // 컴포넌트 마운트 시 날짜 범위 정보 로드
  useEffect(() => {
    fetchDateRange();
  }, [fetchDateRange]);

  /**
   * 날짜 선택 핸들러
   */
  const handleDateRangeChange = useCallback((dates) => {
    if (dates && dates.length === 2) {
      // 최대 90일 제한
      const days = dates[1].diff(dates[0], 'day');
      if (days > 90) {
        MessageService.warning(
          '최대 90일 범위만 선택할 수 있습니다',
          MessageKeys.VISUALIZATION.DATE_RANGE
        );
        // 종료일 기준으로 시작일 조정
        const newStartDate = dates[1].subtract(90, 'day');
        setDateRange([newStartDate, dates[1]]);
      } else {
        setDateRange(dates);
      }
    }
  }, []);

  /**
   * 비활성화할 날짜 판단 함수
   */
  const disabledDate = useCallback(
    (current) => {
      if (!availableDateRange) return false;

      // 문자열 날짜를 dayjs 객체로 변환
      const oldest = dayjs(availableDateRange.oldest_date);
      const latest = dayjs(availableDateRange.latest_date);

      // 조회 가능 범위 밖의 날짜는 비활성화
      return (
        current &&
        (current.isBefore(oldest.startOf('day')) ||
          current.isAfter(latest.endOf('day')))
      );
    },
    [availableDateRange]
  );

  /**
   * 날짜 범위를 강제로 설정하는 함수 (외부에서 사용)
   */
  const setCustomDateRange = useCallback(
    (startDate, endDate) => {
      if (!startDate || !endDate) return;

      if (availableDateRange) {
        const oldest = dayjs(availableDateRange.oldest_date);
        const latest = dayjs(availableDateRange.latest_date);

        // 범위 검증
        if (startDate.isBefore(oldest)) {
          startDate = oldest;
        }
        if (endDate.isAfter(latest)) {
          endDate = latest;
        }
      }

      // 날짜 범위 유효성 검증
      if (endDate.isBefore(startDate)) {
        // 시작일이 종료일보다 늦는 경우 뒤바꿈
        setDateRange([endDate, startDate]);
      } else {
        setDateRange([startDate, endDate]);
      }
    },
    [availableDateRange]
  );

  return {
    dateRange,
    setDateRange: setCustomDateRange,
    availableDateRange,
    handleDateRangeChange,
    disabledDate,
    loading,
    fetchDateRange,
    error,
  };
};
