// src/hooks/useDashboardData.js
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { fetchDashboards } from '../utils/api';
import { message } from 'antd';

/**
 * 대시보드 데이터 관리 훅
 * @param {string} role - 사용자 권한 ('ADMIN' 또는 'USER')
 * @param {Object} initialParams - 초기 검색 파라미터
 * @returns {Object} 대시보드 데이터 및 관련 함수들
 */
const useDashboardData = (role = 'USER', initialParams = {}) => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useState({
    page: 1,
    size: 10,
    ...initialParams,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // 권한에 따른 쿼리 키 설정
  const queryKey = role === 'ADMIN' ? 'admin-dashboards' : 'dashboards';

  // 대시보드 데이터 조회
  const { data, isLoading, refetch, error } = useQuery(
    [queryKey, searchParams],
    () => fetchDashboards(searchParams),
    {
      keepPreviousData: true,
      onError: (error) => {
        message.error('데이터 로딩 중 오류가 발생했습니다');
        console.error('Dashboard fetch error:', error);
      },
    }
  );

  // 검색 함수
  const handleSearch = (values) => {
    const params = { ...searchParams, page: 1 };

    if (values.search_term) params.search_term = values.search_term;
    if (values.status) params.status = values.status;
    if (values.department) params.department = values.department;
    if (values.warehouse) params.warehouse = values.warehouse;
    if (values.date_range) {
      params.start_date = values.date_range[0].format('YYYY-MM-DD');
      params.end_date = values.date_range[1].format('YYYY-MM-DD');
    }

    setSearchParams(params);
  };

  // 검색 초기화
  const handleReset = () => {
    setSearchParams({
      page: 1,
      size: 10,
    });
  };

  // 테이블 변경 처리 (페이지네이션)
  const handleTableChange = (pagination) => {
    setSearchParams({
      ...searchParams,
      page: pagination.current,
      size: pagination.pageSize,
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
    data: data?.data?.data || [],
    meta: data?.data?.meta,
    isLoading,
    searchParams,
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
