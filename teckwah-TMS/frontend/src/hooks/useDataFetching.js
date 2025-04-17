/**
 * 데이터 페칭 커스텀 훅
 * - API 데이터 조회 로직 추상화
 * - 로딩, 에러, 페이지네이션 상태 관리
 */
import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import logger from '../utils/logger';

/**
 * useDataFetching 커스텀 훅
 * @param {Function} fetchFunction - 데이터 조회 함수 (service 함수)
 * @param {Object} initialFilters - 초기 필터 값
 * @param {Object} initialPagination - 초기 페이지네이션 설정
 * @param {Function} postProcess - 데이터 후처리 함수 (옵션)
 */
const useDataFetching = (
  fetchFunction, 
  initialFilters = {}, 
  initialPagination = { current: 1, pageSize: 10, total: 0 },
  postProcess = null
) => {
  // 상태 정의
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [additionalData, setAdditionalData] = useState({});
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState(initialPagination);
  
  /**
   * 데이터 조회 함수
   * @param {Object} customParams - 커스텀 파라미터 (기본 파라미터 오버라이드)
   */
  const fetchData = useCallback(async (customParams = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      // 기본 파라미터 준비
      const params = {
        ...filters,
        page: pagination.current,
        limit: pagination.pageSize,
        ...customParams
      };
      
      logger.api(`데이터 조회 요청: ${fetchFunction.name}`, params);
      
      // API 호출
      const response = await fetchFunction(params);
      
      // 응답 처리
      if (response.success) {
        // 응답 데이터 구조 확인
        const items = response.data?.items || response.data || [];
        
        // 데이터 설정 (후처리 함수 적용)
        const processedData = postProcess ? postProcess(items) : items;
        setData(processedData);
        
        // 페이지네이션 정보 업데이트
        if (response.data?.total !== undefined) {
          setPagination(prev => ({
            ...prev,
            total: response.data.total
          }));
        }
        
        // 추가 데이터 저장 (상태 카운트 등)
        const { items: _, total: __, page: ___, limit: ____, ...rest } = response.data || {};
        setAdditionalData(rest);
        
        logger.api(`데이터 조회 성공: ${items.length}건`);
      } else {
        setError(response.message || '데이터 조회 실패');
        logger.error(`데이터 조회 실패: ${response.message}`);
      }
    } catch (error) {
      logger.error('데이터 조회 오류:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다');
      
      // 사용자에게 오류 알림
      if (error.message) {
        message.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, filters, pagination.current, pagination.pageSize]);
  
  /**
   * 필터 변경 함수
   * @param {Object} newFilters - 새 필터 값
   * @param {boolean} resetPage - 페이지 초기화 여부
   */
  const updateFilters = useCallback((newFilters, resetPage = true) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
    
    // 페이지 초기화 (필요시)
    if (resetPage) {
      setPagination(prev => ({
        ...prev,
        current: 1
      }));
    }
  }, []);
  
  /**
   * 페이지네이션 변경 함수
   */
  const handleTableChange = useCallback((newPagination) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
      total: newPagination.total || pagination.total
    });
  }, [pagination.total]);
  
  /**
   * 데이터 초기화
   */
  const resetData = useCallback(() => {
    setData([]);
    setAdditionalData({});
    setError(null);
  }, []);
  
  /**
   * 페이지 초기화 (1페이지로)
   */
  const resetPagination = useCallback(() => {
    setPagination(prev => ({
      ...prev,
      current: 1
    }));
  }, []);
  
  /**
   * 전체 리셋 (필터, 페이지네이션, 데이터)
   */
  const resetAll = useCallback(() => {
    setFilters(initialFilters);
    setPagination(initialPagination);
    resetData();
  }, [initialFilters, initialPagination]);
  
  return {
    loading,
    error,
    data,
    additionalData,
    filters,
    pagination,
    fetchData,
    updateFilters,
    handleTableChange,
    resetData,
    resetPagination,
    resetAll
  };
};

export default useDataFetching;
