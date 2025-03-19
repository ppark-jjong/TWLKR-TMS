// src/services/VisualizationService.js - 개선된 버전
import axios from 'axios';
import message from '../utils/message';
import { MessageKeys } from '../utils/message';
import { useLogger } from '../utils/LogUtils';

/**
 * 시각화 서비스 클래스
 * 배송 현황 및 시간대별 접수량 데이터 조회 기능 제공
 */
class VisualizationService {
  constructor() {
    this.logger = useLogger('VisualizationService');
  }

  /**
   * 배송 현황 데이터 조회 (create_time 기준)
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns {Promise<Object>} - 배송 현황 데이터
   */
  async getDeliveryStatus(startDate, endDate) {
    const key = MessageKeys.VISUALIZATION.LOAD;
    try {
      this.logger.info('배송 현황 데이터 요청:', startDate, '~', endDate);

      message.loading('데이터 조회 중...', key);

      const response = await axios.get('/visualization/delivery_status', {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });

      this.logger.debug('배송 현황 응답 데이터:', response.data);

      if (response.data && response.data.success) {
        message.loadingToSuccess('데이터 로드 완료', key);
        return {
          success: true,
          data: response.data.data,
          date_range: response.data.date_range,
        };
      } else {
        message.loadingToError('데이터 로드 실패', key);
        return {
          success: false,
          data: {
            type: 'delivery_status',
            total_count: 0,
            department_breakdown: {},
          },
        };
      }
    } catch (error) {
      this.logger.error('배송 현황 데이터 조회 실패:', error);
      message.loadingToError('데이터 조회 중 오류가 발생했습니다', key);

      return {
        success: false,
        data: {
          type: 'delivery_status',
          total_count: 0,
          department_breakdown: {},
        },
      };
    }
  }

  /**
   * 시간대별 접수량 데이터 조회 (create_time 기준)
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns {Promise<Object>} - 시간대별 접수량 데이터
   */
  async getHourlyOrders(startDate, endDate) {
    const key = MessageKeys.VISUALIZATION.LOAD;
    try {
      this.logger.info('시간대별 접수량 데이터 요청:', startDate, '~', endDate);

      message.loading('데이터 조회 중...', key);

      const response = await axios.get('/visualization/hourly_orders', {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });

      this.logger.debug('시간대별 접수량 응답 데이터:', response.data);

      if (response.data && response.data.success) {
        message.loadingToSuccess('데이터 로드 완료', key);
        return {
          success: true,
          data: response.data.data,
          date_range: response.data.date_range,
        };
      } else {
        message.loadingToError('데이터 로드 실패', key);
        return {
          success: false,
          data: {
            type: 'hourly_orders',
            total_count: 0,
            average_count: 0,
            department_breakdown: {},
            time_slots: this._createDefaultTimeSlots(),
          },
        };
      }
    } catch (error) {
      this.logger.error('시간대별 접수량 데이터 조회 실패:', error);
      message.loadingToError('데이터 조회 중 오류가 발생했습니다', key);

      return {
        success: false,
        data: {
          type: 'hourly_orders',
          total_count: 0,
          average_count: 0,
          department_breakdown: {},
          time_slots: this._createDefaultTimeSlots(),
        },
      };
    }
  }

  /**
   * 조회 가능한 날짜 범위 조회 API
   * @returns {Promise<Object>} - 날짜 범위 정보
   */
  async getDateRange() {
    try {
      this.logger.info('가능한 날짜 범위 조회 요청');

      const response = await axios.get('/visualization/date_range');

      this.logger.debug('날짜 범위 응답:', response.data);

      if (response.data && response.data.success) {
        return {
          success: true,
          date_range: response.data.date_range,
        };
      } else {
        return {
          success: false,
          date_range: this._getDefaultDateRange(),
        };
      }
    } catch (error) {
      this.logger.error('날짜 범위 조회 실패:', error);

      return {
        success: false,
        date_range: this._getDefaultDateRange(),
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
   * 기본 날짜 범위 생성
   * @returns {Object} 기본 날짜 범위
   * @private
   */
  _getDefaultDateRange() {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    return {
      oldest_date: thirtyDaysAgo.toISOString().split('T')[0],
      latest_date: today.toISOString().split('T')[0],
    };
  }
}

export default new VisualizationService();
