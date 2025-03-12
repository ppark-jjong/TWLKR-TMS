// frontend/src/services/VisualizationService.js
import axios from 'axios';
import message, { MessageKeys, MessageTemplates } from '../utils/message';

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
        withCredentials: true,
      });

      // 응답 데이터 로깅을 추가하여 실제 구조 확인
      console.log('배송 현황 응답 데이터:', response.data);

      // 백엔드 응답 구조 확인
      if (!response.data) {
        console.error('응답이 없습니다:', response);
        message.error('서버 응답이 없습니다', key);
        return null;
      }

      // 백엔드 응답 구조 처리 - 표준 형식 적용
      const responseData = response.data.data || response.data;
      const dateRange = response.data.date_range || null;

      // 기본 빈 데이터 구조 준비
      const defaultData = {
        type: 'delivery_status',
        total_count: 0,
        department_breakdown: {},
      };

      // 응답 데이터 확인 및 기본값 처리
      const data = responseData || defaultData;

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
        withCredentials: true,
      });

      // 응답 데이터 로깅
      console.log('시간대별 접수량 응답 데이터:', response.data);

      // 백엔드 응답 구조 확인 및 표준화
      if (!response.data) {
        console.error('응답이 없습니다:', response);
        message.error('서버 응답이 없습니다', key);
        return null;
      }

      // 백엔드 응답 구조 처리 - 표준 형식 적용
      const responseData = response.data.data || response.data;
      const dateRange = response.data.date_range || null;

      // 기본 빈 데이터 구조 준비
      const defaultData = {
        type: 'hourly_orders',
        total_count: 0,
        department_breakdown: {},
        time_slots: [],
      };

      // 응답 데이터 확인 및 기본값 처리
      const data = responseData || defaultData;

      // time_slots 필드 검증 및 정규화
      if (data.time_slots && Array.isArray(data.time_slots)) {
        data.time_slots = data.time_slots.map((slot) => {
          if (typeof slot === 'string') {
            return slot;
          } else if (typeof slot === 'object' && slot !== null && slot.label) {
            return slot.label;
          } else {
            return String(slot);
          }
        });
      } else if (!data.time_slots || !Array.isArray(data.time_slots)) {
        data.time_slots = [
          '09-10',
          '10-11',
          '11-12',
          '12-13',
          '13-14',
          '14-15',
          '15-16',
          '16-17',
          '17-18',
          '18-19',
          '야간(19-09)',
        ];
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
    } catch (error) {
      console.error('시간대별 접수량 데이터 조회 실패:', error);
      message.error(
        '시간대별 접수량 데이터 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        key
      );

      // 에러 발생 시 빈 데이터 구조 반환하여 UI 오류 방지
      return {
        success: false,
        message: '데이터 조회 중 오류가 발생했습니다',
        data: {
          type: 'hourly_orders',
          total_count: 0,
          department_breakdown: {},
          time_slots: [
            '09-10',
            '10-11',
            '11-12',
            '12-13',
            '13-14',
            '14-15',
            '15-16',
            '16-17',
            '17-18',
            '18-19',
            '야간(19-09)',
          ],
        },
        date_range: null,
      };
    }
  }

  /**
   * 조회 가능 날짜 범위 조회 API
   * @returns {Promise<Object>} - 날짜 범위 정보
   */
  async getDateRange() {
    try {
      console.log('가능한 날짜 범위 조회 요청');

      const response = await axios.get('/visualization/date_range', {
        withCredentials: true,
      });

      // 응답 데이터 로깅
      console.log('날짜 범위 응답:', response.data);

      // 백엔드 응답 구조 확인 및 표준화
      if (!response.data) {
        console.error('응답이 없습니다:', response);
        throw new Error('날짜 범위 조회 중 오류가 발생했습니다');
      }

      // 백엔드 표준 응답 형식 처리
      const dateRange =
        response.data.date_range ||
        (response.data.data && response.data.data.date_range);

      if (!dateRange) {
        console.warn('날짜 범위 정보가 없습니다:', response.data);
        // 기본 날짜 범위 제공 (오늘 기준 30일)
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        return {
          success: false,
          message: '날짜 범위 정보를 찾을 수 없습니다',
          date_range: {
            oldest_date: thirtyDaysAgo.toISOString().split('T')[0],
            latest_date: today.toISOString().split('T')[0],
          },
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
