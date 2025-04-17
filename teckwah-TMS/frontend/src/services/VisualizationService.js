/**
 * 시각화 관련 API 서비스
 */
import api from './api';
import logger from '../utils/logger';

// 서비스 이름 상수
const SERVICE_NAME = 'VisualizationService';

const VisualizationService = {
  /**
   * 시각화용 통계 데이터 조회 (관리자 전용)
   * @param {Object} params 기간 등 필터 조건
   * @returns {Promise} 시각화 데이터
   */
  getStats: async (params = {}) => {
    try {
      logger.service(SERVICE_NAME, 'getStats');
      
      // 날짜를 ISO 형식으로 확실히 변환
      const parsedParams = { ...params };
      
      // 시각화 타입이 없으면 기본값 지정
      parsedParams.visualizationType = parsedParams.visualizationType || 'time_based';
      
      // 날짜 형식이 있으면 확실히 ISO 형식으로 변환
      if (parsedParams.startDate) {
        parsedParams.startDate = typeof parsedParams.startDate.toISOString === 'function'
          ? parsedParams.startDate.toISOString()
          : parsedParams.startDate;
      }
      
      if (parsedParams.endDate) {
        parsedParams.endDate = typeof parsedParams.endDate.toISOString === 'function'
          ? parsedParams.endDate.toISOString()
          : parsedParams.endDate;
      }
      
      // API 요청 (camelCase → snake_case 자동 변환)
      const response = await api.get('/visualization/stats', { params: parsedParams });
      
      // 응답 데이터 전처리 (차트 라이브러리 호환)
      if (response.data.success && response.data.data) {
        // 날짜 문자열을 변환해 차트 라이브러리와 호환
        if (Array.isArray(response.data.data.timeData)) {
          response.data.data.timeData = response.data.data.timeData.map(item => ({
            ...item,
            // 날짜 문자열 포맷팅 예시
            time: item.time ? item.time.replace(/T/g, ' ').substring(0, 16) : item.time
          }));
        }
      }
      
      logger.apiResponse('/visualization/stats', 'success');
      return response.data;
    } catch (error) {
      logger.error('시각화 통계 요청 실패', error);
      throw error; // api 인터셉터에서 처리
    }
  },
  
  /**
   * 부서별 통계 데이터 조회
   * @param {Object} params 기간 등 필터 조건
   * @returns {Promise} 부서별 통계 데이터
   */
  getDepartmentStats: async (params) => {
    try {
      logger.service(SERVICE_NAME, 'getDepartmentStats');
      
      const requestParams = {
        ...params,
        visualization_type: 'department_based'
      };
      
      logger.api('GET', '/visualization/stats', { visualization_type: 'department_based' });
      
      const response = await api.get('/visualization/stats', { params: requestParams });
      
      logger.apiResponse('/visualization/stats', 'success');
      return response.data;
    } catch (error) {
      logger.error('부서별 통계 요청 실패', error);
      throw error; // api 인터셉터에서 처리
    }
  }
};

export default VisualizationService;