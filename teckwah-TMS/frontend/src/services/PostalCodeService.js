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
    // 우편번호가 5자리가 아닌 경우 앞에 0을 붙임 (프론트에서도 처리)
    const formattedPostalCode = postalCode.padStart(5, '0');
    const response = await api.get(`/postal-codes/${formattedPostalCode}`);
    return response.data;
  }
};

export default PostalCodeService;
