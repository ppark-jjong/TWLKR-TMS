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
   * @param {Object} params 기간, 시각화 타입 등 필터 조건
   * @returns {Promise} 시각화 데이터
   */
  getStats: async (params = {}) => {
    const url = '/visualization/stats'; // URL 선언
    try {
      logger.service(SERVICE_NAME, 'getStats');
      
      // func 파라미터가 필요 없으므로 params에서 제거 (안전을 위해)
      const cleanParams = { ...params };
      if (cleanParams.func) {
        delete cleanParams.func;
      }
      
      logger.api('GET', url, cleanParams); // 파라미터 로깅

      // Pydantic 모델이 alias를 통해 camelCase 파라미터를 받을 수 있으므로
      // 프론트엔드에서 추가 변환 불필요. params 그대로 전달.
      const response = await api.get(url, { params: cleanParams });

      logger.response(url, response.data?.success); // 수정: logger.response 사용
      return response.data;
    } catch (error) {
      logger.error('시각화 통계 요청 실패', error);
      throw error; // api 인터셉터에서 처리
    }
  },

  // getDepartmentStats 함수는 getStats로 통합되었으므로 제거
};

export default VisualizationService;
