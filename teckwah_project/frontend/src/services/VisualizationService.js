// frontend/src/services/VisualizationService.js (수정)

import axios from 'axios';
import message from '../utils/message';
import { MessageKeys, MessageTemplates } from '../utils/message';

class VisualizationService {
  // 배송 현황 데이터 조회 (create_time 기준)
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

      // 응답 데이터 안전 검증 - 변경된 백엔드 응답 구조에 맞게 수정
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

      // 백엔드 응답이 data 필드 없이 직접 반환될 경우를 처리
      const data = response.data.data || response.data || defaultData;

      if (!data.total_count) {
        message.info(MessageTemplates.DATA.LOAD_EMPTY, key);
      } else {
        message.success(MessageTemplates.DATA.LOAD_SUCCESS, key);
      }

      // date_range 정보도 추출
      const dateRange = response.data.date_range || null;

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
      message.error(MessageTemplates.DATA.LOAD_ERROR, key);
      throw error;
    }
  }

  // 시간대별 접수량 데이터 조회 (create_time 기준)
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

      // 응답 데이터 안전 검증
      if (!response.data || !response.data.data) {
        console.error('유효하지 않은 응답 형식:', response);
        message.error('서버 응답 형식이 올바르지 않습니다', key);
        return null;
      }

      const { data } = response.data;

      if (!data.total_count) {
        message.info(MessageTemplates.DATA.LOAD_EMPTY, key);
      } else {
        message.success(MessageTemplates.DATA.LOAD_SUCCESS, key);
      }

      return response.data;
    } catch (error) {
      console.error('시간대별 접수량 데이터 조회 실패:', error);
      message.error(MessageTemplates.DATA.LOAD_ERROR, key);
      throw error;
    }
  }

  // 날짜 범위 조회 API (새로 추가)
  async getDateRange() {
    try {
      console.log('가능한 날짜 범위 조회 요청');

      const response = await axios.get('/visualization/date_range', {
        withCredentials: true,
      });

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
