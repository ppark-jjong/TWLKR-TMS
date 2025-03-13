// frontend/src/services/VisualizationService.js

import axios from 'axios';
import message from '../utils/message';
import { MessageKeys, MessageTemplates } from '../utils/message';

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

      // 응답 데이터 로깅
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

      // 백엔드 API 응답 구조 처리
      if (response.data.success) {
        const data = response.data.data || defaultData;
        const dateRange = response.data.date_range || null;

        if (!data.total_count) {
          message.info(MessageTemplates.DATA.LOAD_EMPTY, key);
        } else {
          message.success(MessageTemplates.DATA.LOAD_SUCCESS, key);
        }

        return {
          success: true,
          message: data.total_count
            ? '데이터를 조회했습니다'
            : '조회된 데이터가 없습니다',
          data: data,
          date_range: dateRange,
        };
      } else {
        // 에러 응답 처리
        message.error(response.data.message || '데이터 조회 실패', key);
        return {
          success: false,
          message: response.data.message || '데이터 조회 실패',
          data: defaultData,
          date_range: null,
        };
      }
    } catch (error) {
      console.error('배송 현황 데이터 조회 실패:', error);
      message.error(
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

      // 응답 데이터 로깅
      console.log('시간대별 접수량 응답 데이터:', response.data);

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
        time_slots: [],
      };

      // 백엔드 API 응답 구조 처리
      if (response.data.success) {
        const data = response.data.data || defaultData;
        const dateRange = response.data.date_range || null;

        // time_slots 검증 및 처리
        if (
          !data.time_slots ||
          !Array.isArray(data.time_slots) ||
          data.time_slots.length === 0
        ) {
          console.warn(
            'time_slots 데이터가 없거나 형식이 잘못되었습니다:',
            data.time_slots
          );

          // 기본 time_slots 생성 (09-19시 시간대와 야간)
          data.time_slots = this._createDefaultTimeSlots();
        }

        if (!data.total_count) {
          message.info(MessageTemplates.DATA.LOAD_EMPTY, key);
        } else {
          message.success(MessageTemplates.DATA.LOAD_SUCCESS, key);
        }

        return {
          success: true,
          message: data.total_count
            ? '데이터를 조회했습니다'
            : '조회된 데이터가 없습니다',
          data: data,
          date_range: dateRange,
        };
      } else {
        // 에러 응답 처리
        message.error(response.data.message || '데이터 조회 실패', key);
        return {
          success: false,
          message: response.data.message || '데이터 조회 실패',
          data: defaultData,
          date_range: null,
        };
      }
    } catch (error) {
      console.error('시간대별 접수량 데이터 조회 실패:', error);
      message.error(
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

      // 응답 데이터 검증
      if (!response.data || !response.data.date_range) {
        console.error('유효하지 않은 날짜 범위 응답:', response);
        return {
          success: false,
          message: '날짜 범위 정보를 가져올 수 없습니다',
          date_range: {
            oldest_date: new Date().toISOString().split('T')[0],
            latest_date: new Date().toISOString().split('T')[0],
          },
        };
      }

      console.log('날짜 범위 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('날짜 범위 조회 실패:', error);

      // 기본 날짜 범위 제공 (오늘 기준 30일)
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      return {
        success: false,
        message: '날짜 범위 조회 중 오류가 발생했습니다',
        date_range: {
          oldest_date: thirtyDaysAgo.toISOString().split('T')[0],
          latest_date: today.toISOString().split('T')[0],
        },
      };
    }
  }
}

export default new VisualizationService();
