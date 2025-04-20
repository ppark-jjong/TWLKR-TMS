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
      
      // 날짜를 공백 구분자 형식으로 변환
      const parsedParams = { ...params };
      
      // 시각화 타입이 없으면 기본값 지정
      parsedParams.visualizationType = parsedParams.visualizationType || 'time_based';
      
      // 날짜 형식이 있으면 공백 구분자 형식(YYYY-MM-DD HH:MM:SS)으로 변환
      if (parsedParams.startDate) {
        if (typeof parsedParams.startDate.toISOString === 'function') {
          // JavaScript Date 객체인 경우
          const dt = parsedParams.startDate;
          parsedParams.startDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')}`;
        }
        // 이미 문자열인 경우 T를 공백으로 변환
        else if (typeof parsedParams.startDate === 'string' && parsedParams.startDate.includes('T')) {
          parsedParams.startDate = parsedParams.startDate.replace('T', ' ');
        }
      }
      
      if (parsedParams.endDate) {
        if (typeof parsedParams.endDate.toISOString === 'function') {
          // JavaScript Date 객체인 경우
          const dt = parsedParams.endDate;
          parsedParams.endDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')}`;
        }
        // 이미 문자열인 경우 T를 공백으로 변환
        else if (typeof parsedParams.endDate === 'string' && parsedParams.endDate.includes('T')) {
          parsedParams.endDate = parsedParams.endDate.replace('T', ' ');
        }
      }
      
      // API 요청 (Pydantic alias를 통해 자동 변환됨)
      const response = await api.get('/visualization/stats', { params: parsedParams });
      
      // 응답 데이터 전처리 (차트 라이브러리 호환)
      if (response.data.success && response.data.data) {
        // 날짜 문자열을 변환해 차트 라이브러리와 호환
        if (Array.isArray(response.data.data.timeData)) {
          response.data.data.timeData = response.data.data.timeData.map(item => ({
            ...item,
            // 날짜 문자열 포맷팅은 이미 백엔드에서 처리됨 (공백 구분자 형식)
            time: item.time
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