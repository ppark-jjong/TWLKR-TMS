/**
 * 우편번호 관련 API 서비스
 */
import api from './api';

const PostalCodeService = {
  /**
   * 우편번호 목록 조회
   * @param {Object} params 검색 조건
   * @returns {Promise} 우편번호 목록
   */
  getPostalCodes: async (params) => {
    const response = await api.get('/postal-codes', { params });
    return response.data;
  },
  
  /**
   * 특정 우편번호 조회
   * @param {string} postalCode 우편번호
   * @returns {Promise} 우편번호 정보
   */
  getPostalCode: async (postalCode) => {
    const response = await api.get(`/postal-codes/${postalCode}`);
    return response.data;
  }
};

export default PostalCodeService;
