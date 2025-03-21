// src/services/VisualizationService.js
import ApiService from './ApiService';
import Logger from '../utils/Logger';
import message from '../utils/MessageUtil';
import { MessageKeys } from '../utils/Constants';

const logger = Logger.getLogger('VisualizationService');

/**
 * 시각화 서비스
 * 차트 및 시각화 데이터 관련 처리를 담당
 */
class VisualizationService {
  /**
   * 배송 현황 데이터 조회
   */
  async getDeliveryStatus(startDate, endDate) {
    const key = MessageKeys.VISUALIZATION.LOAD;
    try {
      logger.info('배송 현황 데이터 요청:', startDate, '~', endDate);
      const response = await ApiService.getDeliveryStatus(startDate, endDate);

      if (!response) {
        message.error('서버 응답이 없습니다', key);
        return this._createEmptyDeliveryStatusData();
      }

      // 데이터가 비어있는지 확인
      if (!response.total_count) {
        message.info('조회된 데이터가 없습니다', key);
      } else {
        message.success('데이터를 조회했습니다', key);
      }

      return response;
    } catch (error) {
      logger.error('배송 현황 데이터 조회 실패:', error);
      message.error(
        '데이터 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        key
      );
      return this._createEmptyDeliveryStatusData();
    }
  }

  /**
   * 시간대별 접수량 데이터 조회
   */
  async getHourlyOrders(startDate, endDate) {
    const key = MessageKeys.VISUALIZATION.LOAD;
    try {
      logger.info('시간대별 접수량 데이터 요청:', startDate, '~', endDate);
      const response = await ApiService.getHourlyOrders(startDate, endDate);

      if (!response) {
        message.error('서버 응답이 없습니다', key);
        return this._createEmptyHourlyOrdersData();
      }

      // 데이터 유효성 검증 및 처리
      const data = response || this._createEmptyHourlyOrdersData();

      // time_slots 검증 및 처리
      if (
        !data.time_slots ||
        !Array.isArray(data.time_slots) ||
        data.time_slots.length === 0
      ) {
        logger.warn('time_slots 데이터 형식 오류, 기본값 사용');
        data.time_slots = this._createDefaultTimeSlots();
      }

      // 데이터가 비어있는지 확인
      if (!data.total_count) {
        message.info('조회된 데이터가 없습니다', key);
      } else {
        message.success('데이터를 조회했습니다', key);
      }

      return data;
    } catch (error) {
      logger.error('시간대별 접수량 데이터 조회 실패:', error);
      message.error(
        '데이터 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        key
      );
      return this._createEmptyHourlyOrdersData();
    }
  }

  /**
   * 조회 가능한 날짜 범위 조회
   */
  async getDateRange() {
    try {
      logger.info('가능한 날짜 범위 조회 요청');
      const response = await ApiService.getDateRange();
      return response || this._getDefaultDateRange();
    } catch (error) {
      logger.error('날짜 범위 조회 실패:', error);
      return this._getDefaultDateRange();
    }
  }

  /**
   * 빈 배송 현황 데이터 생성 (오류 발생 시 제공)
   * @private
   */
  _createEmptyDeliveryStatusData() {
    return {
      type: 'delivery_status',
      total_count: 0,
      department_breakdown: {
        CS: { total: 0, status_breakdown: [] },
        HES: { total: 0, status_breakdown: [] },
        LENOVO: { total: 0, status_breakdown: [] },
      },
    };
  }

  /**
   * 빈 시간대별 접수량 데이터 생성 (오류 발생 시 제공)
   * @private
   */
  _createEmptyHourlyOrdersData() {
    return {
      type: 'hourly_orders',
      total_count: 0,
      average_count: 0,
      department_breakdown: {
        CS: { total: 0, hourly_counts: {} },
        HES: { total: 0, hourly_counts: {} },
        LENOVO: { total: 0, hourly_counts: {} },
      },
      time_slots: this._createDefaultTimeSlots(),
    };
  }

  /**
   * 기본 시간대 슬롯 생성
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
