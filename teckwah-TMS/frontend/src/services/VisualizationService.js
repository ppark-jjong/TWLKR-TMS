/**
 * 시각화 관련 API 서비스
 */
import api from './api';

const VisualizationService = {
  /**
   * 시각화용 통계 데이터 조회 (관리자 전용)
   * @param {Object} params 기간 등 필터 조건
   * @returns {Promise} 시각화 데이터
   */
  getStats: async (params) => {
    try {
      console.log('시각화 통계 요청 파라미터:', params);
      
      // 시각화 타입이 없으면 기본값 지정
      const requestParams = {
        ...params,
        visualization_type: params.visualization_type || 'time_based'
      };
      
      console.log('시각화 통계 최종 요청 파라미터:', requestParams);
      
      const response = await api.get('/visualization/stats', { params: requestParams });
      console.log('시각화 통계 응답:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('시각화 통계 요청 오류:', error);
      
      // 오류 메시지 상세화
      let errorMessage = '시각화 데이터를 불러오는 중 오류가 발생했습니다.';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = '관리자 권한이 필요합니다.';
        } else if (error.response.status === 422) {
          errorMessage = '잘못된 요청 형식입니다. 요청 파라미터를 확인해주세요.';
        } else {
          errorMessage = error.response.data?.detail || 
                        error.response.data?.message || 
                        `서버 오류가 발생했습니다. (${error.response.status})`;
        }
      }
      
      return {
        success: false,
        message: errorMessage,
        error_code: error.response?.status || 'UNKNOWN',
        data: null
      };
    }
  },
  
  /**
   * 부서별 통계 데이터 조회
   * @param {Object} params 기간 등 필터 조건
   * @returns {Promise} 부서별 통계 데이터
   */
  getDepartmentStats: async (params) => {
    try {
      console.log('부서별 통계 요청 파라미터:', params);
      
      const requestParams = {
        ...params,
        visualization_type: 'department_based'
      };
      
      console.log('부서별 통계 최종 요청 파라미터:', requestParams);
      
      const response = await api.get('/visualization/stats', { params: requestParams });
      console.log('부서별 통계 응답:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('부서별 통계 요청 오류:', error);
      
      // 오류 메시지 상세화
      let errorMessage = '부서별 통계 데이터를 불러오는 중 오류가 발생했습니다.';
      
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = '관리자 권한이 필요합니다.';
        } else {
          errorMessage = error.response.data?.detail || 
                        error.response.data?.message || 
                        `서버 오류가 발생했습니다. (${error.response.status})`;
        }
      }
      
      return {
        success: false,
        message: errorMessage,
        error_code: error.response?.status || 'UNKNOWN',
        data: null
      };
    }
  }
};

export default VisualizationService;