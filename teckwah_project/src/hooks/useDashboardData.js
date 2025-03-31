// src/hooks/useDashboardData.js
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDashboards } from '../utils/api';
import { message } from 'antd';
import { filterData, getUniqueFilterOptions } from '../utils/filterUtils';

/**
 * 대시보드 데이터 관리 훅 - CSR 필터링 지원
 * @param {string} role - 사용자 권한 ('ADMIN' 또는 'USER')
 * @param {Object} initialParams - 초기 검색 파라미터
 * @returns {Object} 대시보드 데이터 및 관련 함수들
 */
const useDashboardData = (role = 'USER', initialParams = {}) => {
  const queryClient = useQueryClient();

  // 날짜 기반 조회 파라미터
  const [dateParams, setDateParams] = useState({
    start_date:
      initialParams.start_date || new Date().toISOString().split('T')[0],
    end_date: initialParams.end_date || new Date().toISOString().split('T')[0],
  });

  // 클라이언트 필터링 상태
  const [filterParams, setFilterParams] = useState({
    search_term: '',
    status: '',
    department: '',
    warehouse: '',
  });

  // 페이지네이션 상태
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  // 선택된 행
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // 권한에 따른 쿼리 키 설정
  const queryKey = role === 'ADMIN' ? 'admin-dashboards' : 'dashboards';

  // 날짜 기준 데이터 조회
  const {
    data: rawData,
    isLoading,
    refetch,
  } = useQuery([queryKey, dateParams], () => fetchDashboards(dateParams), {
    keepPreviousData: true,
    onError: (error) => {
      message.error('데이터 로딩 중 오류가 발생했습니다');
      console.error('Dashboard fetch error:', error);
    },
  });

  // 클라이언트에서 필터링된 데이터
  const filteredData = useMemo(() => {
    const items = rawData?.data?.data || [];
    return filterData(items, filterParams);
  }, [rawData, filterParams]);

  // 현재 페이지 데이터
  const paginatedData = useMemo(() => {
    const { current, pageSize } = pagination;
    const startIndex = (current - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, pagination]);

  // 필터 옵션 생성 (동적 필터 옵션)
  const filterOptions = useMemo(() => {
    const data = rawData?.data?.data || [];
    return {
      status: getUniqueFilterOptions(data, 'status'),
      department: getUniqueFilterOptions(data, 'department'),
      warehouse: getUniqueFilterOptions(data, 'warehouse'),
    };
  }, [rawData]);

  // 검색 함수
  const handleSearch = (values) => {
    // 날짜 변경 시 서버 요청 업데이트
    if (values.date_range) {
      setDateParams({
        start_date: values.date_range[0].format('YYYY-MM-DD'),
        end_date: values.date_range[1].format('YYYY-MM-DD'),
      });
    }

    // 클라이언트 필터링 파라미터 업데이트
    setFilterParams({
      search_term: values.search_term || '',
      status: values.status || '',
      department: values.department || '',
      warehouse: values.warehouse || '',
    });

    // 필터링 시 첫 페이지로 리셋
    setPagination({ ...pagination, current: 1 });
  };

  // 검색 초기화
  const handleReset = () => {
    setFilterParams({
      search_term: '',
      status: '',
      department: '',
      warehouse: '',
    });
    setPagination({
      current: 1,
      pageSize: 10,
    });
  };

  // 페이지네이션 변경
  const handleTableChange = (newPagination) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
  };

  // 선택 행 변경
  const onSelectChange = (selectedKeys) => {
    setSelectedRowKeys(selectedKeys);
  };

  // 데이터 새로고침
  const refreshData = () => {
    refetch();
  };

  return {
    data: paginatedData,
    originalData: rawData?.data?.data || [],
    filteredData,
    totalItems: filteredData.length,
    isLoading,
    dateParams,
    filterParams,
    filterOptions,
    pagination: {
      ...pagination,
      total: filteredData.length,
    },
    selectedRowKeys,
    handleSearch,
    handleReset,
    handleTableChange,
    onSelectChange,
    setSelectedRowKeys,
    refreshData,
  };
};

export default useDashboardData;
