// frontend/src/services/VisualizationService.js

import axios from 'axios';
import message from '../utils/message';
import { MessageKeys } from '../utils/message';

class VisualizationService {
  /**
   * 배송 현황 데이터 조회 (create_time 기준)
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns {Promise<Object>} - 응답 객체
   */
  async getDeliveryStatus(startDate, endDate) {
    const key = MessageKeys.VISUALIZATION.LOAD;
    try {
      console.log('배송 현황 데이터 요청:', startDate, '~', endDate);

      message.loading('데이터 조회 중...', key);
      const response = await axios.get('/visualization/delivery_status', {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });

      // 응답 데이터 로깅 (디버깅용)
      console.log('배송 현황 응답 데이터:', response.data);

      // 응답 데이터 안전 검증
      if (!response.data) {
        console.error('응답이 없습니다:', response);
        message.error('서버 응답이 없습니다', key);
        return null;
      }

      // 기본 빈 데이터 구조 준비
      const defaultData = {
        type: 'delivery_status',
        total_count: 0,
        department_breakdown: {},
      };

      // 백엔드 API 응답 구조 처리 - 다양한 구조 일관되게 처리
      let responseData = response.data;
      let formattedData = null;
      let dateRange = null;

      // 응답 구조 분석 및 표준화
      if (responseData.success === true && responseData.data) {
        // success: true, data: {...} 형식
        formattedData = responseData.data;
        dateRange = responseData.date_range;
      } else if (responseData.type === 'delivery_status') {
        // 직접 데이터 객체 반환 형식
        formattedData = responseData;
        dateRange = response.headers?.date_range;
      } else if (responseData.department_breakdown) {
        // 필수 필드만 있는 형식
        formattedData = {
          type: 'delivery_status',
          total_count: responseData.total_count || 0,
          department_breakdown: responseData.department_breakdown,
        };
        dateRange = response.headers?.date_range;
      } else {
        // 구조 확인 불가 - 기본값 사용
        console.warn('알 수 없는 응답 구조:', responseData);
        formattedData = defaultData;
      }

      // 데이터 검증 및 기본값 적용
      if (!formattedData.total_count) {
        formattedData.total_count = 0;
      }

      if (
        !formattedData.department_breakdown ||
        typeof formattedData.department_breakdown !== 'object'
      ) {
        formattedData.department_breakdown = {};
      }

      // 타입 필드 보장
      formattedData.type = 'delivery_status';

      // 사용자 피드백
      if (formattedData.total_count === 0) {
        message.loadingToInfo('조회된 데이터가 없습니다', key);
      } else {
        message.loadingToSuccess('데이터를 조회했습니다', key);
      }

      return {
        success: true,
        message: formattedData.total_count
          ? '데이터를 조회했습니다'
          : '조회된 데이터가 없습니다',
        data: formattedData,
        date_range: dateRange,
      };
    } catch (error) {
      console.error('배송 현황 데이터 조회 실패:', error);
      message.loadingToError(
        '배송 현황 데이터 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        key
      );

      // 에러 발생 시 빈 데이터 구조 반환하여 UI 오류 방지
      return {
        success: false,
        message: '데이터 조회 중 오류가 발생했습니다',
        data: {
          type: 'delivery_status',
          total_count: 0,
          department_breakdown: {},
        },
        date_range: null,
      };
    }
  }

  /**
   * 시간대별 접수량 데이터 조회 (create_time 기준)
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns {Promise<Object>} - 응답 객체
   */
  async getHourlyOrders(startDate, endDate) {
    const key = MessageKeys.VISUALIZATION.LOAD;
    try {
      console.log('시간대별 접수량 데이터 요청:', startDate, '~', endDate);

      message.loading('데이터 조회 중...', key);
      const response = await axios.get('/visualization/hourly_orders', {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });

      // 응답 데이터 로깅 (디버깅용)
      console.log('시간대별 접수량 원본 응답 데이터:', response.data);

      // 응답 데이터 안전 검증
      if (!response.data) {
        console.error('응답이 없습니다:', response);
        message.error('서버 응답이 없습니다', key);
        return null;
      }

      // 기본 빈 데이터 구조 준비
      const defaultData = {
        type: 'hourly_orders',
        total_count: 0,
        average_count: 0,
        department_breakdown: {},
        time_slots: this._createDefaultTimeSlots(), // 기본 시간대 구조 생성
      };

      // 백엔드 API 응답 구조 처리 - 다양한 구조 일관되게 처리
      let responseData = response.data;
      let formattedData = null;
      let dateRange = null;

      // 응답 구조 분석 및 표준화
      if (responseData.success === true && responseData.data) {
        // success: true, data: {...} 형식
        formattedData = responseData.data;
        dateRange = responseData.date_range;
      } else if (responseData.type === 'hourly_orders') {
        // 직접 데이터 객체 반환 형식
        formattedData = responseData;
        dateRange = response.headers?.date_range;
      } else if (responseData.department_breakdown) {
        // 필수 필드만 있는 형식
        formattedData = {
          type: 'hourly_orders',
          total_count: responseData.total_count || 0,
          average_count: responseData.average_count || 0,
          department_breakdown: responseData.department_breakdown,
          time_slots: responseData.time_slots || this._createDefaultTimeSlots(),
        };
        dateRange = response.headers?.date_range;
      } else {
        // 구조 확인 불가 - 기본값 사용
        console.warn('알 수 없는 응답 구조:', responseData);
        formattedData = defaultData;
      }

      // 데이터 검증 및 기본값 적용
      formattedData.type = 'hourly_orders';

      if (!formattedData.total_count) {
        formattedData.total_count = 0;
      }

      if (!formattedData.average_count) {
        formattedData.average_count = 0;
      }

      if (
        !formattedData.department_breakdown ||
        typeof formattedData.department_breakdown !== 'object'
      ) {
        formattedData.department_breakdown = {};
      }

      // time_slots 확인 및 보정
      if (
        !formattedData.time_slots ||
        !Array.isArray(formattedData.time_slots) ||
        formattedData.time_slots.length === 0
      ) {
        console.warn(
          'time_slots 데이터가 없거나 형식이 잘못되었습니다. 기본값 적용'
        );
        formattedData.time_slots = this._createDefaultTimeSlots();
      }

      // 사용자 피드백
      if (formattedData.total_count === 0) {
        message.loadingToInfo('조회된 데이터가 없습니다', key);
      } else {
        message.loadingToSuccess('데이터를 조회했습니다', key);
      }

      return {
        success: true,
        message: formattedData.total_count
          ? '데이터를 조회했습니다'
          : '조회된 데이터가 없습니다',
        data: formattedData,
        date_range: dateRange,
      };
    } catch (error) {
      console.error('시간대별 접수량 데이터 조회 실패:', error);
      message.loadingToError(
        '시간대별 접수량 데이터 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        key
      );

      // 에러 발생 시 기본 데이터 구조 반환
      return {
        success: false,
        message: '데이터 조회 중 오류가 발생했습니다',
        data: {
          type: 'hourly_orders',
          total_count: 0,
          average_count: 0,
          department_breakdown: {},
          time_slots: this._createDefaultTimeSlots(),
        },
        date_range: null,
      };
    }
  }

  /**
   * 기본 시간대 슬롯 생성 (백엔드 응답이 없거나 오류일 때 사용)
   * @returns {Array} 기본 시간대 슬롯 배열
   * @private
   */
  _createDefaultTimeSlots() {
    const timeSlots = [];

    // 주간 시간대 (09-19시)
    for (let h = 9; h < 19; h++) {
      timeSlots.push({
        label: `${h.toString().padStart(2, '0')}-${(h + 1)
          .toString()
          .padStart(2, '0')}`,
        start: h,
        end: h + 1,
      });
    }

    // 야간 시간대 (19-09시)
    timeSlots.push({
      label: '야간(19-09)',
      start: 19,
      end: 9,
    });

    return timeSlots;
  }

  /**
   * 조회 가능한 날짜 범위 조회 API
   * @returns {Promise<Object>} - 날짜 범위 정보
   */
  async getDateRange() {
    try {
      console.log('가능한 날짜 범위 조회 요청');

      const response = await axios.get('/visualization/date_range');
      console.log('날짜 범위 응답:', response.data);

      // 응답 데이터 검증 및 표준화
      let dateRange = null;

      // 응답 구조 분석
      if (response.data?.date_range) {
        dateRange = response.data.date_range;
      } else if (response.data?.data?.date_range) {
        dateRange = response.data.data.date_range;
      } else if (response.data?.oldest_date && response.data?.latest_date) {
        dateRange = {
          oldest_date: response.data.oldest_date,
          latest_date: response.data.latest_date,
        };
      }

      // 유효한 날짜 범위가 없다면 기본값 사용
      if (!dateRange) {
        console.warn('유효한 날짜 범위 정보를 찾을 수 없습니다. 기본값 사용');
        dateRange = {
          oldest_date: this._getDefaultOldestDate(),
          latest_date: this._getDefaultLatestDate(),
        };
      }

      return {
        success: true,
        message: '조회 가능 날짜 범위를 조회했습니다',
        date_range: dateRange,
      };
    } catch (error) {
      console.error('날짜 범위 조회 실패:', error);

      // 기본 날짜 범위 제공 (오늘 기준 30일)
      return {
        success: false,
        message: '날짜 범위 조회 중 오류가 발생했습니다',
        date_range: {
          oldest_date: this._getDefaultOldestDate(),
          latest_date: this._getDefaultLatestDate(),
        },
      };
    }
  }

  /**
   * 기본 최소 날짜 생성 (현재 기준 30일 전)
   * @returns {string} YYYY-MM-DD 형식의 날짜
   * @private
   */
  _getDefaultOldestDate() {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  }

  /**
   * 기본 최대 날짜 생성 (현재 날짜)
   * @returns {string} YYYY-MM-DD 형식의 날짜
   * @private
   */
  _getDefaultLatestDate() {
    return new Date().toISOString().split('T')[0];
  }
}

export default new VisualizationService();
