// src/services/VisualizationService.js - 리팩토링 버전
import axios from 'axios';
import message from '../utils/message';
import { MessageKeys } from '../utils/message';
import { useLogger } from '../utils/LogUtils';

/**
 * 시각화 서비스 클래스 (백엔드 API 명세 기반 리팩토링)
 * - 백엔드 API 엔드포인트 정확히 매핑
 * - 응답 데이터 구조 그대로 활용하여 불필요한 변환 제거
 * - 에러 처리 및 메시지 표시 개선
 * - 기본 데이터 구조 강화
 */
class VisualizationService {
  constructor() {
    this.logger = useLogger('VisualizationService');
  }

  /**
   * 배송 현황 데이터 조회 (create_time 기준)
   * GET /visualization/delivery_status
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns {Promise<Object>} - 배송 현황 데이터
   */
  async getDeliveryStatus(startDate, endDate) {
    const key = MessageKeys.VISUALIZATION.LOAD;
    try {
      this.logger.info('배송 현황 데이터 요청:', startDate, '~', endDate);

      const response = await axios.get('/visualization/delivery_status', {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });

      this.logger.debug('배송 현황 응답 데이터:', response.data);

      // 응답 데이터 검증
      if (!response.data) {
        this.logger.error('응답이 없습니다:', response);
        message.error('서버 응답이 없습니다', key);
        return {
          success: false,
          message: '서버 응답이 없습니다',
          data: this._createEmptyDeliveryStatusData(),
        };
      }

      // 백엔드 API 응답 형식에 맞춰 처리
      if (response.data.success) {
        // 백엔드 API에서 제공하는 데이터 그대로 반환
        const responseData = {
          success: true,
          message: response.data.message || '데이터를 조회했습니다',
          data: response.data.data || this._createEmptyDeliveryStatusData(),
          date_range: response.data.date_range || null,
        };

        // 데이터가 비어있는지 확인
        if (!responseData.data.total_count) {
          message.info('조회된 데이터가 없습니다', key);
        }

        return responseData;
      } else {
        // 에러 응답 처리
        this.logger.warn('API 오류 응답:', response.data);
        message.error(response.data.message || '데이터 조회 실패', key);

        return {
          success: false,
          message: response.data.message || '데이터 조회 실패',
          data: this._createEmptyDeliveryStatusData(),
          date_range: null,
        };
      }
    } catch (error) {
      this.logger.error('배송 현황 데이터 조회 실패:', error);

      // 에러 응답이 있는 경우
      if (error.response && error.response.data) {
        this.logger.error('API 에러 응답:', error.response.data);
      }

      return {
        success: false,
        message: '데이터 조회 중 오류가 발생했습니다',
        data: this._createEmptyDeliveryStatusData(),
        date_range: null,
      };
    }
  }

  /**
   * 시간대별 접수량 데이터 조회 (create_time 기준)
   * GET /visualization/hourly_orders
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns {Promise<Object>} - 시간대별 접수량 데이터
   */
  async getHourlyOrders(startDate, endDate) {
    const key = MessageKeys.VISUALIZATION.LOAD;
    try {
      this.logger.info('시간대별 접수량 데이터 요청:', startDate, '~', endDate);

      const response = await axios.get('/visualization/hourly_orders', {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });

      this.logger.debug('시간대별 접수량 응답 데이터:', response.data);

      // 응답 데이터 검증
      if (!response.data) {
        this.logger.error('응답이 없습니다:', response);
        message.error('서버 응답이 없습니다', key);
        return {
          success: false,
          message: '서버 응답이 없습니다',
          data: this._createEmptyHourlyOrdersData(),
          date_range: null,
        };
      }

      // 백엔드 API 응답 형식에 맞춰 처리
      if (response.data.success) {
        const data = response.data.data || this._createEmptyHourlyOrdersData();
        const dateRange = response.data.date_range || null;

        // time_slots 검증 및 처리
        if (
          !data.time_slots ||
          !Array.isArray(data.time_slots) ||
          data.time_slots.length === 0
        ) {
          this.logger.warn(
            'time_slots 데이터가 없거나 형식이 잘못되었습니다:',
            data.time_slots
          );

          // time_slots가 없는 경우 기본값 설정
          data.time_slots = this._createDefaultTimeSlots();
        }

        // 응답 데이터 구성
        const responseData = {
          success: true,
          message: data.total_count
            ? '데이터를 조회했습니다'
            : '조회된 데이터가 없습니다',
          data: data,
          date_range: dateRange,
        };

        // 데이터가 비어있는지 확인
        if (!data.total_count) {
          message.info('조회된 데이터가 없습니다', key);
        }

        return responseData;
      } else {
        // 에러 응답 처리
        this.logger.warn('API 오류 응답:', response.data);
        message.error(response.data.message || '데이터 조회 실패', key);

        return {
          success: false,
          message: response.data.message || '데이터 조회 실패',
          data: this._createEmptyHourlyOrdersData(),
          date_range: null,
        };
      }
    } catch (error) {
      this.logger.error('시간대별 접수량 데이터 조회 실패:', error);

      // 에러 응답이 있는 경우
      if (error.response && error.response.data) {
        this.logger.error('API 에러 응답:', error.response.data);
      }

      return {
        success: false,
        message: '데이터 조회 중 오류가 발생했습니다',
        data: this._createEmptyHourlyOrdersData(),
        date_range: null,
      };
    }
  }

  /**
   * 조회 가능한 날짜 범위 조회 API
   * GET /visualization/date_range
   * @returns {Promise<Object>} - 날짜 범위 정보
   */
  async getDateRange() {
    try {
      this.logger.info('가능한 날짜 범위 조회 요청');

      const response = await axios.get('/visualization/date_range');

      this.logger.debug('날짜 범위 응답:', response.data);

      // 응답 검증
      if (!response.data || !response.data.date_range) {
        this.logger.error('유효하지 않은 날짜 범위 응답:', response);
        return {
          success: false,
          message: '날짜 범위 정보를 가져올 수 없습니다',
          date_range: this._getDefaultDateRange(),
        };
      }

      // 백엔드 API 응답 구조 그대로 반환
      return {
        success: response.data.success || true,
        message: response.data.message || '조회 가능 날짜 범위를 조회했습니다',
        date_range: response.data.date_range,
      };
    } catch (error) {
      this.logger.error('날짜 범위 조회 실패:', error);

      // 기본 날짜 범위 제공
      return {
        success: false,
        message: '날짜 범위 조회 중 오류가 발생했습니다',
        date_range: this._getDefaultDateRange(),
      };
    }
  }

  /**
   * 빈 배송 현황 데이터 생성 (오류 발생 시 제공)
   * 백엔드 API 응답 구조에 맞게 구성
   * @returns {Object} - 빈 배송 현황 데이터
   * @private
   */
  _createEmptyDeliveryStatusData() {
    return {
      type: 'delivery_status',
      total_count: 0,
      department_breakdown: {
        CS: {
          total: 0,
          status_breakdown: [],
        },
        HES: {
          total: 0,
          status_breakdown: [],
        },
        LENOVO: {
          total: 0,
          status_breakdown: [],
        },
      },
    };
  }

  /**
   * 빈 시간대별 접수량 데이터 생성 (오류 발생 시 제공)
   * 백엔드 API 응답 구조에 맞게 구성
   * @returns {Object} - 빈 시간대별 접수량 데이터
   * @private
   */
  _createEmptyHourlyOrdersData() {
    return {
      type: 'hourly_orders',
      total_count: 0,
      average_count: 0,
      department_breakdown: {
        CS: {
          total: 0,
          hourly_counts: {},
        },
        HES: {
          total: 0,
          hourly_counts: {},
        },
        LENOVO: {
          total: 0,
          hourly_counts: {},
        },
      },
      time_slots: this._createDefaultTimeSlots(),
    };
  }

  /**
   * 기본 시간대 슬롯 생성 (백엔드 API 응답 처리 실패 시 사용)
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
