// frontend/src/utils/useDateRange.js
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import VisualizationService from '../services/VisualizationService';
import message from './message';

export function useDateRange(defaultDays = 7) {
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(defaultDays - 1, 'day'),
    dayjs(),
  ]);
  const [availableDateRange, setAvailableDateRange] = useState(null);
  const [loading, setLoading] = useState(true);

  // 날짜 범위 로드
  useEffect(() => {
    // frontend/src/utils/useDateRange.js - 수정 부분
    const fetchDateRange = async () => {
      try {
        setLoading(true);
        const response = await VisualizationService.getDateRange();

        if (response && response.date_range) {
          const dateRangeInfo = response.date_range;
          setAvailableDateRange(dateRangeInfo);
          console.log('조회 가능 날짜 범위:', dateRangeInfo);

          // 날짜 문자열을 dayjs 객체로 변환
          const oldest = dayjs(dateRangeInfo.oldest_date);
          const latest = dayjs(dateRangeInfo.latest_date);

          // 오늘 날짜와 비교
          const today = dayjs();
          const validLatest = latest.isAfter(today) ? today : latest;

          // 조회 가능 날짜 유효성 검증
          if (oldest.isAfter(validLatest)) {
            console.error(
              '서버에서 받은 날짜 범위가 유효하지 않습니다:',
              dateRangeInfo
            );
            // 기본값으로 최근 30일 설정
            const defaultEnd = today;
            const defaultStart = today.subtract(30, 'day');
            setDateRange([defaultStart, defaultEnd]);
            console.log(
              '기본 날짜 범위로 설정:',
              defaultStart.format('YYYY-MM-DD'),
              '~',
              defaultEnd.format('YYYY-MM-DD')
            );
            return;
          }

          // 기본 선택 범위 계산 (defaultDays일 전 ~ 오늘)
          const defaultStart = today.subtract(defaultDays - 1, 'day');

          // 유효 범위 내에서 날짜 조정
          let validStart;
          if (defaultStart.isBefore(oldest)) {
            validStart = oldest;
          } else if (defaultStart.isAfter(validLatest)) {
            validStart = oldest; // 시작일이 종료일보다 나중인 경우 가장 예전 날짜로 설정
          } else {
            validStart = defaultStart;
          }

          setDateRange([validStart, validLatest]);
          console.log(
            '설정된 날짜 범위:',
            validStart.format('YYYY-MM-DD'),
            '~',
            validLatest.format('YYYY-MM-DD')
          );
        } else {
          console.warn('유효한 날짜 범위 정보가 없습니다:', response);
          // 기본값으로 최근 30일 설정
          setDateRange([dayjs().subtract(30, 'day'), dayjs()]);
        }
      } catch (error) {
        console.error('날짜 범위 조회 실패:', error);
        message.error('날짜 범위 조회에 실패했습니다. 기본 범위를 사용합니다.');
        // 오류 발생 시 기본값으로 최근 30일 설정
        setDateRange([dayjs().subtract(30, 'day'), dayjs()]);
      } finally {
        setLoading(false);
      }
    };

    fetchDateRange();
  }, [defaultDays]);

  // disabledDate 함수 - 유효 범위 외 날짜 비활성화
  const disabledDate = (current) => {
    if (!availableDateRange) return false;

    const oldest = dayjs(availableDateRange.oldest_date);
    const latest = dayjs(availableDateRange.latest_date);
    const today = dayjs();

    // 유효 범위를 벗어나거나 미래 날짜는 비활성화
    return (
      current &&
      (current < oldest.startOf('day') ||
        current > latest.endOf('day') ||
        current > today.endOf('day'))
    );
  };

  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (dates) => {
    if (!dates || !dates[0] || !dates[1]) return;

    console.log(
      '날짜 범위 변경:',
      dates[0].format('YYYY-MM-DD'),
      '~',
      dates[1].format('YYYY-MM-DD')
    );
    setDateRange(dates);
  };

  return {
    dateRange,
    setDateRange,
    availableDateRange,
    loading,
    disabledDate,
    handleDateRangeChange,
  };
}
