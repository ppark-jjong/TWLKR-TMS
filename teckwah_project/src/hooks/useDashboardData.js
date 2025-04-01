// src/hooks/useDashboardData.js
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboards, safeApiCall } from '../utils/api';
import { message } from 'antd';
import { getUniqueFilterOptions } from '../utils/filterUtils';
import dayjs from 'dayjs';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * 현재 날짜에서 7일 전 날짜를 계산하는 함수
 * @returns {string} YYYY-MM-DD 형식의 날짜 문자열
 */
const getOneWeekAgo = () => {
  return dayjs().subtract(7, 'day').format('YYYY-MM-DD');
};

/**
 * 현재 날짜를 계산하는 함수
 * @returns {string} YYYY-MM-DD 형식의 날짜 문자열
 */
const getCurrentDate = () => {
  return dayjs().format('YYYY-MM-DD');
};

/**
 * 날짜가 유효한지 확인하는 함수
 * @param {string} dateStr - 검증할 날짜 (YYYY-MM-DD 형식)
 * @returns {string} 유효한 날짜
 */
const validateDate = (dateStr) => {
  if (!dateStr) return '';

  try {
    const inputDate = dayjs(dateStr);
    if (inputDate.isValid()) {
      return dateStr;
    }
    return '';
  } catch (error) {
    console.error('날짜 변환 오류:', error);
    return '';
  }
};

/**
 * 대시보드 데이터 관리 훅 - 간소화된 버전
 * @param {string} userRole - 사용자 권한
 * @returns {Object} - 데이터 관리 객체
 */
const useDashboardData = (userRole = 'USER') => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  // 첫 접속 여부를 추적하는 상태
  const [isFirstVisit, setIsFirstVisit] = useState(true);

  // 검색 파라미터 통합 관리
  const [searchParams, setSearchParams] = useState({
    page: parseInt(queryParams.get('page') || '1', 10),
    size: parseInt(queryParams.get('size') || '10', 10),
    start_date: validateDate(queryParams.get('start_date')) || getOneWeekAgo(),
    end_date: validateDate(queryParams.get('end_date')) || getCurrentDate(),
    search_term: queryParams.get('search_term') || '',
    status: queryParams.get('status') || '',
    department: queryParams.get('department') || '',
    warehouse: queryParams.get('warehouse') || '',
  });

  // 페이지 첫 로드 시 오늘 날짜로 데이터 자동 조회
  useEffect(() => {
    if (isFirstVisit) {
      // 일주일 전 ~ 오늘 기준으로 검색 파라미터 설정
      const today = getCurrentDate();
      const weekAgo = getOneWeekAgo();
      const newParams = {
        ...searchParams,
        start_date: weekAgo,
        end_date: today,
        page: 1,
      };

      setSearchParams(newParams);
      updateURL(newParams);
      setIsFirstVisit(false);
    }
  }, [isFirstVisit]);

  // URL 업데이트 함수
  const updateURL = useCallback(
    (params) => {
      const newParams = new URLSearchParams();

      // 필수 파라미터만 URL에 포함
      if (params.page && params.page > 1) newParams.set('page', params.page);
      if (params.size && params.size !== 10) newParams.set('size', params.size);
      if (params.start_date)
        newParams.set('start_date', validateDate(params.start_date));
      if (params.end_date)
        newParams.set('end_date', validateDate(params.end_date));
      if (params.search_term) newParams.set('search_term', params.search_term);
      if (params.status) newParams.set('status', params.status);
      if (params.department) newParams.set('department', params.department);
      if (params.warehouse) newParams.set('warehouse', params.warehouse);

      navigate(`${location.pathname}?${newParams.toString()}`, {
        replace: true,
      });
    },
    [location.pathname, navigate]
  );

  // 검색 처리 함수
  const handleSearch = useCallback(
    (values) => {
      try {
        let start_date = '';
        let end_date = '';

        // 날짜 범위 설정 및 검증
        if (values.date_range && values.date_range.length === 2) {
          start_date = values.date_range[0]
            ? values.date_range[0].format('YYYY-MM-DD')
            : '';
          end_date = values.date_range[1]
            ? values.date_range[1].format('YYYY-MM-DD')
            : '';
        }

        // 개별 시작일/종료일 처리 (RangePicker 직접 접근 시)
        if (values.start_date) {
          start_date = values.start_date;
        }
        if (values.end_date) {
          end_date = values.end_date;
        }

        // 날짜 유효성 검증
        start_date = validateDate(start_date) || getOneWeekAgo();
        end_date = validateDate(end_date) || getCurrentDate();

        // 시작일이 종료일보다 늦은 경우 교체
        if (dayjs(start_date).isAfter(dayjs(end_date))) {
          [start_date, end_date] = [end_date, start_date];
          message.info('시작일이 종료일보다 늦어 자동으로 조정되었습니다.');
        }

        // 검색 파라미터 업데이트
        const newParams = {
          page: 1, // 검색 시 첫 페이지로 이동
          size: searchParams.size,
          start_date,
          end_date,
          search_term:
            values.search_term !== undefined
              ? values.search_term
              : searchParams.search_term,
          status:
            values.status !== undefined ? values.status : searchParams.status,
          department:
            values.department !== undefined
              ? values.department
              : searchParams.department,
          warehouse:
            values.warehouse !== undefined
              ? values.warehouse
              : searchParams.warehouse,
        };

        setSearchParams(newParams);
        updateURL(newParams);
      } catch (error) {
        console.error('검색 처리 오류:', error);
        message.error('검색 처리 중 오류가 발생했습니다.');
      }
    },
    [searchParams, updateURL]
  );

  // 날짜 범위 변경 핸들러 - 즉시 API 호출
  const handleDateRangeChange = useCallback(
    (dates, dateStrings) => {
      if (dates) {
        handleSearch({
          start_date: dateStrings[0],
          end_date: dateStrings[1],
        });
      }
    },
    [handleSearch]
  );

  // 페이지네이션 변경 핸들러
  const handlePaginationChange = useCallback(
    (page, pageSize) => {
      const newParams = { ...searchParams, page, size: pageSize };
      setSearchParams(newParams);
      updateURL(newParams);
    },
    [searchParams, updateURL]
  );

  // API 호출 함수
  const fetchData = useCallback(async () => {
    return await safeApiCall(() => fetchDashboards(searchParams), {
      context: '대시보드 데이터 조회',
      showErrorMessage: true,
    });
  }, [searchParams]);

  // React Query 사용한 데이터 페칭
  const {
    data: apiResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery(['dashboards', searchParams], fetchData, {
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 30, // 30초 동안 데이터 유지
  });

  // 백엔드 응답에서 필요한 데이터 추출
  const dashboards = useMemo(() => apiResponse?.data || [], [apiResponse]);
  const metaData = useMemo(() => apiResponse?.meta || {}, [apiResponse]);
  const totalItems = useMemo(() => metaData.total || 0, [metaData]);

  // 필터 옵션들 계산
  const filterOptions = useMemo(() => {
    if (!dashboards || dashboards.length === 0) {
      return {
        statuses: [],
        departments: [],
        warehouses: [],
      };
    }

    return {
      statuses: getUniqueFilterOptions(dashboards, 'status'),
      departments: getUniqueFilterOptions(dashboards, 'department'),
      warehouses: getUniqueFilterOptions(dashboards, 'warehouse'),
    };
  }, [dashboards]);

  // ETA 기준 최대/최소 날짜 계산
  const dateRange = useMemo(() => {
    if (!dashboards || dashboards.length === 0) {
      return { min: getOneWeekAgo(), max: getCurrentDate() };
    }

    try {
      let minDate = dayjs();
      let maxDate = dayjs('2000-01-01');

      dashboards.forEach((item) => {
        if (item.eta) {
          const etaDate = dayjs(item.eta);
          if (etaDate.isValid()) {
            if (etaDate.isBefore(minDate)) minDate = etaDate;
            if (etaDate.isAfter(maxDate)) maxDate = etaDate;
          }
        }
      });

      return {
        min: minDate.format('YYYY-MM-DD'),
        max: maxDate.format('YYYY-MM-DD'),
      };
    } catch (error) {
      console.error('날짜 범위 계산 오류:', error);
      return { min: getOneWeekAgo(), max: getCurrentDate() };
    }
  }, [dashboards]);

  return {
    dashboards,
    isLoading,
    isError,
    refetch,
    totalItems,
    searchParams,
    filterOptions,
    handleSearch,
    handleDateRangeChange,
    handlePaginationChange,
    updateURL,
    dateRange,
  };
};

export default useDashboardData;
