// frontend/src/services/DashboardService.js
import axios from 'axios';
import message, { MessageKeys, MessageTemplates } from '../utils/message';
import { STATUS_TYPES } from '../utils/Constants';

class DashboardService {
  /**
   * 대시보드 목록 조회 (ETA 기준)
   * @param {dayjs} startDate - 시작 날짜
   * @param {dayjs} endDate - 종료 날짜
   * @returns {Promise<Object>} - 대시보드 항목 배열과 날짜 범위 정보
   */
  async getDashboardList(startDate, endDate) {
    try {
      // 날짜 형식 확인
      const formattedStartDate = startDate.format('YYYY-MM-DD');
      const formattedEndDate = endDate.format('YYYY-MM-DD');
      console.log('요청 날짜 범위:', formattedStartDate, '~', formattedEndDate);

      const response = await axios.get('/dashboard/list', {
        params: {
          start_date: formattedStartDate,
          end_date: formattedEndDate,
        },
      });

      console.log('대시보드 목록 응답:', response.data);

      // 응답 데이터 구조 검증
      if (!response.data) {
        console.error('응답에 데이터가 없습니다');
        return { items: [], date_range: null };
      }

      // 백엔드 API 응답 구조 처리 (success, message, data 구조)
      if (response.data.success && response.data.data) {
        // 성공 응답 처리
        const items = response.data.data.items || [];
        const dateRange = response.data.data.date_range;

        return {
          items,
          date_range: dateRange,
          user_role: response.data.data.user_role,
          is_admin: response.data.data.is_admin,
        };
      } else {
        // 응답은 성공했지만 데이터 형식이 다른 경우
        console.warn('서버 응답 데이터 형식이 예상과 다릅니다:', response.data);

        // 다양한 응답 구조 대응 (하위 호환성)
        let items = [];
        let dateRange = null;

        if (response.data.items) {
          items = response.data.items;
          dateRange = response.data.date_range;
        } else if (Array.isArray(response.data)) {
          items = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          items = response.data.data;
          dateRange = response.data.date_range;
        }

        return { items, date_range: dateRange };
      }
    } catch (error) {
      console.error('대시보드 목록 조회 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 관리자 대시보드 목록 조회
   * @param {dayjs} startDate - 시작 날짜
   * @param {dayjs} endDate - 종료 날짜
   * @returns {Promise<Object>} - 대시보드 항목 배열과 날짜 범위 정보
   */
  async getAdminDashboardList(startDate, endDate) {
    try {
      // 날짜 형식 확인
      const formattedStartDate = startDate.format('YYYY-MM-DD');
      const formattedEndDate = endDate.format('YYYY-MM-DD');
      console.log(
        '관리자 대시보드 요청 날짜 범위:',
        formattedStartDate,
        '~',
        formattedEndDate
      );

      const response = await axios.get('/dashboard/list', {
        params: {
          start_date: formattedStartDate,
          end_date: formattedEndDate,
        },
      });

      console.log('관리자 대시보드 목록 응답:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      if (response.data && response.data.success) {
        const items = response.data.data?.items || [];
        const dateRange = response.data.data?.date_range;

        return {
          items,
          date_range: dateRange,
          user_role: response.data.data?.user_role,
          is_admin: response.data.data?.is_admin,
        };
      } else {
        console.warn('서버 응답이 예상 형식과 다릅니다:', response.data);
        return {
          items: [],
          date_range: null,
        };
      }
    } catch (error) {
      console.error(
        '관리자 대시보드 목록 조회 실패:',
        error.response?.data || error
      );
      throw error;
    }
  }

  /**
   * 주문번호로 대시보드 검색
   * @param {string} orderNo - 검색할 주문번호
   * @returns {Promise<Array>} - 검색 결과 배열
   */
  async searchDashboardsByOrderNo(orderNo) {
    try {
      console.log('주문번호 검색 요청:', orderNo);
      const response = await axios.get('/dashboard/search', {
        params: { order_no: orderNo },
      });

      console.log('주문번호 검색 응답:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      if (response.data && response.data.success) {
        const items = response.data.data?.items || [];
        return this.sortDashboardsByStatus(items);
      } else {
        console.warn('서버 응답이 예상 형식과 다릅니다:', response.data);
        return [];
      }
    } catch (error) {
      console.error('주문번호 검색 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 날짜 범위에 따른 필터링 처리
   * @param {Array} items - 대시보드 항목 목록
   * @param {dayjs} startDate - 시작 날짜
   * @param {dayjs} endDate - 종료 날짜
   * @returns {Array} - 필터링된 항목 목록
   */
  filterByDateRange(items, startDate, endDate) {
    if (!Array.isArray(items)) return [];

    // 일별 비교를 위해 시작/종료일 문자열 변환
    const startDateStr = startDate.format('YYYY-MM-DD');
    const endDateStr = endDate.format('YYYY-MM-DD');

    return items.filter((item) => {
      // ETA를 기준으로 필터링
      if (!item.eta) return false;

      // 날짜만 비교 (시간 제외)
      const itemDate = new Date(item.eta).toISOString().split('T')[0];

      // 시작일 <= 항목 날짜 <= 종료일
      return itemDate >= startDateStr && itemDate <= endDateStr;
    });
  }

  /**
   * 상태와 ETA에 따른 정렬 처리
   * @param {Array} dashboards - 대시보드 항목 목록
   * @returns {Array} - 정렬된 항목 목록
   */
  sortDashboardsByStatus(dashboards) {
    if (!Array.isArray(dashboards)) return [];

    // 상태 우선순위 정의
    const statusPriority = {
      WAITING: 1,
      IN_PROGRESS: 2,
      COMPLETE: 10,
      ISSUE: 11,
      CANCEL: 12,
    };

    return [...dashboards].sort((a, b) => {
      // 상태 우선순위 비교
      const aPriority = statusPriority[a.status] || 99;
      const bPriority = statusPriority[b.status] || 99;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // 같은 상태 그룹 내에서는 ETA 기준 정렬
      return new Date(a.eta) - new Date(b.eta);
    });
  }

  /**
   * 대시보드 상세 정보 조회
   * @param {number} dashboardId - 대시보드 ID
   * @returns {Promise<Object>} - 대시보드 상세 정보
   */
  async getDashboardDetail(dashboardId) {
    try {
      const response = await axios.get(`/dashboard/${dashboardId}`);
      console.log('대시보드 상세 정보:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error('상세 정보 조회에 실패했습니다');
      }
    } catch (error) {
      console.error('대시보드 상세 조회 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 대시보드 생성
   * @param {Object} dashboardData - 생성할 대시보드 데이터
   * @returns {Promise<Object>} - 생성된 대시보드 정보
   */
  async createDashboard(dashboardData) {
    try {
      console.log('대시보드 생성 요청 데이터:', dashboardData);
      const response = await axios.post('/dashboard', dashboardData);
      console.log('대시보드 생성 응답:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error('대시보드 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('대시보드 생성 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 상태 업데이트 (비관적 락 적용)
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} status - 변경할 상태
   * @param {boolean} isAdmin - 관리자 여부
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  async updateStatus(dashboardId, status, isAdmin = false) {
    try {
      const response = await axios.patch(`/dashboard/${dashboardId}/status`, {
        status,
        is_admin: isAdmin,
      });
      console.log('상태 업데이트 응답:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error('상태 업데이트에 실패했습니다');
      }
    } catch (error) {
      console.error('상태 업데이트 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 메모 업데이트 (비관적 락 적용)
   * @param {number} dashboardId - 대시보드 ID
   * @param {string} remark - 메모 내용
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  async updateRemark(dashboardId, remark) {
    try {
      const response = await axios.patch(`/dashboard/${dashboardId}/remark`, {
        content: remark,
      });
      console.log('메모 업데이트 응답:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error('메모 업데이트에 실패했습니다');
      }
    } catch (error) {
      console.error('메모 업데이트 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 필드 업데이트 (비관적 락 적용)
   * @param {number} dashboardId - 대시보드 ID
   * @param {Object} fields - 업데이트할 필드 데이터
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  async updateFields(dashboardId, fields) {
    try {
      console.log('필드 업데이트 요청 데이터:', fields);
      const response = await axios.patch(
        `/dashboard/${dashboardId}/fields`,
        fields
      );
      console.log('필드 업데이트 응답:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      if (response.data && response.data.success) {
        return response.data.data;
      } else {
        throw new Error('필드 업데이트에 실패했습니다');
      }
    } catch (error) {
      console.error('필드 업데이트 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 배차 처리 (비관적 락 적용)
   * @param {Object} driverData - 배차 정보 (dashboard_ids, driver_name, driver_contact)
   * @returns {Promise<Array>} - 업데이트된 대시보드 정보 배열
   */
  async assignDriver(driverData) {
    try {
      console.log('배차 요청 데이터:', driverData);

      const response = await axios.post('/dashboard/assign', driverData);
      console.log('배차 응답:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      if (response.data && response.data.success) {
        return response.data.data?.updated_dashboards || [];
      } else {
        throw new Error('배차 처리에 실패했습니다');
      }
    } catch (error) {
      console.error('배차 처리 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 대시보드 삭제 (관리자 전용)
   * @param {Array<number>} dashboardIds - 삭제할 대시보드 ID 배열
   * @returns {Promise<boolean>} - 삭제 성공 여부
   */
  async deleteDashboards(dashboardIds) {
    try {
      console.log('삭제 요청 ID 목록:', dashboardIds);
      const response = await axios.delete('/dashboard', {
        data: dashboardIds,
      });
      console.log('삭제 응답:', response.data);

      // 응답 구조 확인 및 안전한 데이터 반환
      return response.data && response.data.success;
    } catch (error) {
      console.error('대시보드 삭제 실패:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * 날짜 범위 조회
   * @returns {Promise<Object>} - 조회 가능한 날짜 범위
   */
  async getDateRange() {
    try {
      const response = await axios.get('/visualization/date_range');
      console.log('날짜 범위 조회 응답:', response.data);

      if (response.data && response.data.success && response.data.date_range) {
        return {
          oldest_date: response.data.date_range.oldest_date,
          latest_date: response.data.date_range.latest_date,
        };
      } else {
        return {
          oldest_date: new Date().toISOString().split('T')[0],
          latest_date: new Date().toISOString().split('T')[0],
        };
      }
    } catch (error) {
      console.error('날짜 범위 조회 실패:', error.response?.data || error);
      // 에러 발생 시 기본값 반환
      return {
        oldest_date: new Date().toISOString().split('T')[0],
        latest_date: new Date().toISOString().split('T')[0],
      };
    }
  }
}

export default new DashboardService();
