// frontend/src/utils/useDateRange.js
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import VisualizationService from '../services/VisualizationService';

export function useDateRange(defaultDays = 7) {
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(defaultDays - 1, 'day'),
    dayjs(),
  ]);
  const [availableDateRange, setAvailableDateRange] = useState(null);
  const [loading, setLoading] = useState(true);

  // 날짜 범위 로드
  useEffect(() => {
    const fetchDateRange = async () => {
      try {
        setLoading(true);
        const response = await VisualizationService.getDateRange();

        if (response && response.date_range) {
          setAvailableDateRange(response.date_range);

          // 초기 날짜 범위 설정 로직
          const oldest = dayjs(response.date_range.oldest_date);
          const latest = dayjs(response.date_range.latest_date);

          // 기본 선택 날짜가 가능 범위를 벗어나면 조정
          const defaultStart = dayjs().subtract(defaultDays - 1, 'day');
          const start = defaultStart.isBefore(oldest) ? oldest : defaultStart;
          const end = latest.isAfter(dayjs()) ? dayjs() : latest;

          setDateRange([start, end]);
        }
      } catch (error) {
        console.error('날짜 범위 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDateRange();
  }, [defaultDays]);

  // disabledDate 함수
  const disabledDate = (current) => {
    if (!availableDateRange) return false;

    const oldest = dayjs(availableDateRange.oldest_date);
    const latest = dayjs(availableDateRange.latest_date);

    return (
      current &&
      (current < oldest.startOf('day') ||
        current > latest.endOf('day') ||
        current > dayjs().endOf('day')) // 미래 날짜 비활성화
    );
  };

  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (dates) => {
    if (!dates || !dates[0] || !dates[1]) return;
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
