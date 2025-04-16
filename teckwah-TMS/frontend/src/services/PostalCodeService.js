/**
 * 우편번호 관련 API 서비스
 * 최소화된 버전 - 대시보드 연동에 필요한 기능만 유지
 */
import api from './api';

const PostalCodeService = {
  /**
   * 특정 우편번호 조회 - 대시보드 연동용
   * @param {string} postalCode 우편번호
   * @returns {Promise} 우편번호 정보
   */
  getPostalCode: async (postalCode) => {
    try {
      // 유효성 검사
      if (!postalCode) {
        console.warn('우편번호가 제공되지 않았습니다.');
        return {
          success: false,
          message: '우편번호를 입력해주세요.',
          data: null
        };
      }
      
      // 우편번호가 5자리가 아닌 경우 앞에 0을 붙임 (프론트에서도 처리)
      const formattedPostalCode = String(postalCode).padStart(5, '0');
      console.log(`우편번호 조회 요청: ${formattedPostalCode}`);
      
      const response = await api.get(`/postal-codes/${formattedPostalCode}`);
      console.log('우편번호 조회 응답:', response.data);
      
      return response.data;
    } catch (error) {
      console.error(`우편번호 조회 오류: ${postalCode}`, error);
      
      // 오류 메시지 상세화
      let errorMessage = '우편번호 정보를 불러오는 중 오류가 발생했습니다.';
      
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = '해당 우편번호 정보를 찾을 수 없습니다.';
        } else {
          errorMessage = error.response.data?.detail || 
                        error.response.data?.message || 
                        `서버 오류가 발생했습니다. (${error.response.status})`;
        }
      }
      
      return {
        success: false,
        message: errorMessage,
        data: null
      };
    }
  },
  
  /**
   * 우편번호 검색
   * @param {string} keyword 검색어 (우편번호 또는 주소)
   * @returns {Promise} 검색 결과
   */
  searchPostalCodes: async (keyword) => {
    try {
      if (!keyword || keyword.length < 2) {
        console.warn('검색어가 너무 짧습니다.');
        return {
          success: false,
          message: '검색어는 2자 이상 입력해주세요.',
          data: { items: [] }
        };
      }
      
      console.log(`우편번호 검색 요청: 키워드=${keyword}`);
      const response = await api.get('/postal-codes/search', {
        params: { keyword }
      });
      console.log('우편번호 검색 응답:', response.data);
      
      return response.data;
    } catch (error) {
      console.error(`우편번호 검색 오류: 키워드=${keyword}`, error);
      return {
        success: false,
        message: '우편번호 검색 중 오류가 발생했습니다.',
        data: { items: [] }
      };
    }
  }
};

export default PostalCodeService;