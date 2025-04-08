/**
 * 데이터 관리 모듈
 * TMS 애플리케이션의 데이터 로드, 저장, 관리 기능을 제공합니다.
 * JSON 파일을 실제 DB처럼 지속성 유지
 */
const DataManager = (function() {
  // 상태 및 로드된 데이터 저장소
  const state = {
    dashboardData: null,
    handoverData: [],
    userData: {
      userName: 'CSAdmin',
      userRole: 'CS',
    },
    isDataLoaded: false,
  };
  
  /**
   * 데이터 로드 함수
   * @returns {Promise<boolean>} 로드 성공 여부
   */
  async function loadData() {
    try {
      console.log('데이터 로드 중...');
      
      // 대시보드 데이터 로드
      await loadDashboardData();
      
      // 인수인계 데이터 로드
      await loadHandoverData();
      
      // 데이터 로드 상태 업데이트
      state.isDataLoaded = true;
      console.log('모든 데이터 로드 완료');
      
      // 커스텀 이벤트 발생 - 데이터 로드 완료
      document.dispatchEvent(new CustomEvent('data:loaded'));
      
      return true;
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      MessageManager.error('데이터를 불러오는 중 오류가 발생했습니다.');
      return false;
    }
  }
  
  /**
   * 대시보드 데이터 로드
   * @returns {Promise<void>}
   */
  async function loadDashboardData() {
    try {
      // JSON 파일에서 데이터 로드
      console.log('JSON 파일에서 대시보드 데이터 로드 시도...');
      const response = await fetch('dashboard_data.json');
      
      if (!response.ok) {
        throw new Error(`대시보드 데이터 로드 실패: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data && data.dashboard && Array.isArray(data.dashboard)) {
        // 데이터 정규화 및 저장
        state.dashboardData = data.dashboard.map((item) => {
          // 필요한 경우 데이터 보강
          if (!item.dashboard_id) {
            item.dashboard_id = `D${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
          }
          
          // 날짜 필드 보강
          if (item.eta && typeof item.eta === 'string') {
            item.eta_date = new Date(item.eta);
          }
          if (item.create_time && typeof item.create_time === 'string') {
            item.create_date = new Date(item.create_time);
          }
          
          return item;
        });
        
        console.log(`JSON 파일에서 대시보드 데이터 ${state.dashboardData.length}건 로드 완료`);
        
        // JSON에서 로드한 데이터를 localStorage에도 저장하여 다음에 사용할 수 있게 함
        localStorage.setItem('tms_dashboard_data', JSON.stringify({
          dashboard: state.dashboardData,
          lastUpdated: new Date().toISOString()
        }));
        
        // 데이터가 변경되었음을 알리는 이벤트
        document.dispatchEvent(new CustomEvent('data:dashboardChanged'));
      } else {
        console.warn('대시보드 데이터 형식이 유효하지 않습니다.');
        state.dashboardData = [];
      }
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      state.dashboardData = [];
    }
  }
  
  /**
   * 인수인계 데이터 로드
   * @returns {Promise<void>}
   */
  async function loadHandoverData() {
    try {
      // JSON 파일에서 데이터 로드
      console.log('JSON 파일에서 인수인계 데이터 로드 시도...');
      const response = await fetch('handover_data.json');
      
      if (!response.ok) {
        throw new Error(`인수인계 데이터 로드 실패: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data && data.handovers && Array.isArray(data.handovers)) {
        state.handoverData = data.handovers;
        console.log(`인수인계 데이터 ${state.handoverData.length}건 로드 완료`);
        
        // JSON에서 로드한 데이터를 localStorage에도 저장
        localStorage.setItem('tms_handover_data', JSON.stringify(state.handoverData));
      } else {
        console.warn('인수인계 데이터 형식이 유효하지 않습니다. 기본 데이터를 사용합니다.');
        initDefaultHandoverData();
      }
    } catch (error) {
      console.error('인수인계 데이터 로드 실패:', error);
      // 파일 로드 실패 시 기본 데이터 사용
      initDefaultHandoverData();
    }
    
    // 데이터가 변경되었음을 알리는 이벤트
    document.dispatchEvent(new CustomEvent('data:handoverChanged'));
  }
  
  /**
   * 기본 인수인계 데이터 초기화 (파일 로드 실패 시 사용)
   */
  function initDefaultHandoverData() {
    // 기본 인수인계 데이터
    state.handoverData = [
      {
        handover_id: 'H001',
        title: '서버 점검 안내',
        is_notice: true,
        content: '오늘 저녁 10시부터 서버 점검이 예정되어 있습니다. 업무에 참고 바랍니다.',
        created_by: 'CSAdmin',
        created_at: '2025-03-05 14:30'
      },
      {
        handover_id: 'H002',
        title: '배송 지연 안내',
        is_notice: false,
        content: '도로 공사로 인해 강남 지역 배송이 지연될 수 있습니다. 고객에게 미리 안내 바랍니다.',
        created_by: 'CSAdmin',
        created_at: '2025-03-06 09:15'
      },
      {
        handover_id: 'H003',
        title: '안전 교육 일정 안내',
        is_notice: true,
        content: '3월 10일 오전 10시 안전 교육이 진행될 예정입니다. 전 직원 참석 필수입니다.',
        created_by: 'CSAdmin',
        created_at: '2025-03-06 11:20'
      }
    ];
    
    console.log(`기본 인수인계 데이터 ${state.handoverData.length}건 초기화 완료`);
  }

  /**
   * 데이터 변경 시 로컬 스토리지에 저장
   * @param {string} key 저장 키
   * @param {Object} data 저장할 데이터
   * @returns {boolean} 저장 성공 여부
   */
  function saveToLocalStorage(key, data) {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      localStorage.setItem(key, jsonData);
      console.log(`${key} 데이터 로컬 스토리지에 저장 완료`);
      return true;
    } catch (error) {
      console.error(`로컬 스토리지 저장 실패:`, error);
      return false;
    }
  }
  
  /**
   * 대시보드 데이터 저장 함수
   * 변경된 데이터를 localStorage와 서버 JSON 파일에 저장하여 지속성 유지
   * @returns {Promise<boolean>} 저장 성공 여부
   */
  async function saveDashboardData() {
    try {
      console.log('대시보드 데이터 저장 중...');
      
      // 저장할 데이터 구조 생성
      const saveData = {
        dashboard: state.dashboardData,
        lastUpdated: new Date().toISOString()
      };
      
      // 데이터를 JSON 문자열로 변환하여 localStorage에 저장
      localStorage.setItem('tms_dashboard_data', JSON.stringify(saveData));
      
      // 로컬 개발 환경에서는 다음의 코드를 통해 파일 시스템에 직접 저장
      // 프로덕션 환경에서는 서버 API를 통해 저장해야 함
      await saveJsonFile('dashboard_data.json', saveData);
      
      console.log('대시보드 데이터 저장 완료:', `${state.dashboardData.length}건`);
      
      // 데이터가 저장되었음을 알리는 이벤트 발생
      document.dispatchEvent(new CustomEvent('data:dashboardSaved'));
      
      return true;
    } catch (error) {
      console.error('대시보드 데이터 저장 실패:', error);
      MessageManager.error('데이터를 저장하는 중 오류가 발생했습니다.');
      return false;
    }
  }
  
  /**
   * 인수인계 데이터 저장 함수
   * 변경된 데이터를 localStorage와 서버 JSON 파일에 저장하여 지속성 유지
   * @returns {Promise<boolean>} 저장 성공 여부
   */
  async function saveHandoverData() {
    try {
      console.log('인수인계 데이터 저장 중...');
      
      // 데이터를 localStorage에 저장
      localStorage.setItem('tms_handover_data', JSON.stringify(state.handoverData));
      
      // 저장할 데이터 구조 생성
      const saveData = {
        handovers: state.handoverData,
        lastUpdated: new Date().toISOString()
      };
      
      // 로컬 개발 환경에서는 다음의 코드를 통해 파일 시스템에 직접 저장
      // 프로덕션 환경에서는 서버 API를 통해 저장해야 함
      await saveJsonFile('handover_data.json', saveData);
      
      console.log('인수인계 데이터 저장 완료:', `${state.handoverData.length}건`);
      
      // 데이터가 저장되었음을 알리는 이벤트 발생
      document.dispatchEvent(new CustomEvent('data:handoverSaved'));
      
      return true;
    } catch (error) {
      console.error('인수인계 데이터 저장 실패:', error);
      MessageManager.error('인수인계 데이터를 저장하는 중 오류가 발생했습니다.');
      return false;
    }
  }
  
  /**
   * 필터로 대시보드 데이터 가져오기
   * @param {Object} filters 필터 조건
   * @returns {Array} 필터링된 데이터 배열
   */
  function getDashboardData(filters = {}) {
    if (!state.dashboardData) {
      console.warn('대시보드 데이터가 로드되지 않았습니다.');
      return [];
    }
    
    console.log('getDashboardData 필터링 시작:', filters);
    let filteredData = [...state.dashboardData];
    console.log(`필터링 전 전체 데이터: ${filteredData.length}건`);
    
    // 상태 필터 적용
    if (filters.status) {
      console.log(`상태 필터 적용: ${filters.status}`);
      filteredData = filteredData.filter(
        (item) => item.status === filters.status
      );
      console.log(`상태 필터 후 데이터: ${filteredData.length}건`);
    }
    
    // 부서 필터 적용
    if (filters.department) {
      console.log(`부서 필터 적용: ${filters.department}`);
      filteredData = filteredData.filter(
        (item) => item.department === filters.department
      );
      console.log(`부서 필터 후 데이터: ${filteredData.length}건`);
    }
    
    // 창고 필터 적용
    if (filters.warehouse) {
      console.log(`창고 필터 적용: ${filters.warehouse}`);
      filteredData = filteredData.filter(
        (item) => item.warehouse === filters.warehouse
      );
      console.log(`창고 필터 후 데이터: ${filteredData.length}건`);
    }
    
    // 키워드 검색 적용
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      console.log(`키워드 검색 적용: ${keyword}`);
      
      filteredData = filteredData.filter((item) => {
        const orderNo = String(item.order_no || '').toLowerCase();
        const customer = String(item.customer || '').toLowerCase();
        return orderNo.includes(keyword) || customer.includes(keyword);
      });
      
      console.log(`키워드 검색 후 데이터: ${filteredData.length}건`);
    }
    
    // 날짜 필터 적용
    if (filters.startDate && filters.endDate) {
      console.log(`날짜 필터 적용: ${filters.startDate} ~ ${filters.endDate}`);
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // 종료일 끝까지 포함
      
      filteredData = filteredData.filter((item) => {
        if (!item.eta) {
          return false;
        }
        
        const etaDate = new Date(item.eta);
        if (isNaN(etaDate.getTime())) {
          console.log(
            `날짜 변환 실패: ${item.eta}, 주문번호: ${item.order_no}`
          );
          return false;
        }
        
        return etaDate >= startDate && etaDate <= endDate;
      });
      
      console.log(`날짜 필터 후 데이터: ${filteredData.length}건`);
    }
    
    console.log(`최종 필터링된 데이터: ${filteredData.length}건`);
    return filteredData;
  }
  
  /**
   * ID로 대시보드 항목 가져오기
   * @param {string} orderId 주문 ID
   * @returns {Object|null} 주문 객체 또는 null
   */
  function getDashboardItemById(orderId) {
    if (!state.dashboardData || !orderId) {
      return null;
    }
    
    return state.dashboardData.find((item) => item.order_no === orderId) || null;
  }
  
  /**
   * 대시보드 항목 업데이트
   * @param {string} orderId 주문 ID
   * @param {Object} updateData 업데이트 데이터
   * @returns {boolean} 업데이트 성공 여부
   */
  function updateDashboardItem(orderId, updateData) {
    if (!state.dashboardData || !orderId) {
      return false;
    }
    
    const index = state.dashboardData.findIndex(
      (item) => item.order_no === orderId
    );
    
    // 새 항목 추가 (ID가 존재하지 않는 경우)
    if (index === -1) {
      if (Object.keys(updateData).length > 0) {
        // 새 항목 추가
        state.dashboardData.push({
          ...updateData,
          update_at: new Date().toISOString(),
          updated_by: state.userData.userName,
        });
        
        // JSON DB에 저장
        saveDashboardData();
        
        // 변경 이벤트 발생
        document.dispatchEvent(new CustomEvent('data:dashboardChanged'));
        
        return true;
      }
      return false;
    }
    
    try {
      // 기존 데이터에 업데이트 적용
      state.dashboardData[index] = {
        ...state.dashboardData[index],
        ...updateData,
        update_at: new Date().toISOString(),
        updated_by: state.userData.userName,
      };
      
      // JSON DB에 저장
      saveDashboardData();
      
      // 변경 이벤트 발생
      document.dispatchEvent(new CustomEvent('data:dashboardChanged'));
      
      return true;
    } catch (error) {
      console.error('대시보드 항목 업데이트 실패:', error);
      return false;
    }
  }
  
  /**
   * 인수인계 데이터 가져오기
   * @param {Object} filters 필터 조건
   * @returns {Array} 필터링된 데이터 배열
   */
  function getHandoverData(filters = {}) {
    if (!state.handoverData) {
      console.warn('인수인계 데이터가 로드되지 않았습니다.');
      return [];
    }
    
    // 필터 적용이 필요한 경우
    if (filters && Object.keys(filters).length > 0) {
      return state.handoverData.filter((item) => {
        // 공지사항 필터
        if ('isNotice' in filters) {
          if (item.is_notice !== filters.isNotice) {
            return false;
          }
        }
        
        // 검색어 필터
        if (filters.keyword && filters.keyword !== '') {
          const keyword = filters.keyword.toLowerCase();
          return (
            item.title.toLowerCase().includes(keyword) ||
            item.content.toLowerCase().includes(keyword)
          );
        }
        
        return true;
      });
    }
    
    // 필터 없는 경우 모든 데이터 반환
    return state.handoverData;
  }
  
  /**
   * ID로 인수인계 항목 가져오기
   * @param {string} handoverId 인수인계 ID
   * @returns {Object|null} 인수인계 객체 또는 null
   */
  function getHandoverItemById(handoverId) {
    if (!state.handoverData) {
      console.warn('인수인계 데이터가 로드되지 않았습니다.');
      return null;
    }
    
    return state.handoverData.find((item) => item.handover_id === handoverId) || null;
  }
  
  /**
   * 새 인수인계 추가
   * @param {Object} handoverData 인수인계 데이터
   * @returns {Object} 추가된 인수인계 객체
   */
  function addHandoverItem(handoverData) {
    if (!state.handoverData) {
      state.handoverData = [];
    }
    
    // 새 인수인계 ID 생성
    const newId = `H${String(state.handoverData.length + 1).padStart(3, '0')}`;
    
    // 현재 날짜/시간
    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);
    
    // 새 인수인계 객체 생성
    const newHandover = {
      handover_id: newId,
      title: handoverData.title,
      content: handoverData.content,
      is_notice: handoverData.is_notice || false,
      created_by: state.userData.userName,
      created_at: dateStr,
    };
    
    // 배열에 추가
    state.handoverData.push(newHandover);
    
    // 저장
    saveHandoverData();
    
    // 변경 이벤트 발생
    document.dispatchEvent(new CustomEvent('data:handoverChanged'));
    
    return newHandover;
  }
  
  /**
   * 인수인계 항목 업데이트
   * @param {string} handoverId 인수인계 ID
   * @param {Object} updateData 업데이트 데이터
   * @returns {boolean} 업데이트 성공 여부
   */
  function updateHandoverItem(handoverId, updateData) {
    if (!state.handoverData) {
      return false;
    }
    
    const index = state.handoverData.findIndex(
      (item) => item.handover_id === handoverId
    );
    
    if (index === -1) {
      console.warn(`인수인계 ID '${handoverId}'를 찾을 수 없습니다.`);
      return false;
    }
    
    try {
      // 기존 데이터에 업데이트 적용
      state.handoverData[index] = {
        ...state.handoverData[index],
        ...updateData,
        update_at: new Date().toISOString(),
      };
      
      // 저장
      saveHandoverData();
      
      // 변경 이벤트 발생
      document.dispatchEvent(new CustomEvent('data:handoverChanged'));
      
      return true;
    } catch (error) {
      console.error('인수인계 항목 업데이트 실패:', error);
      return false;
    }
  }
  
  /**
   * 인수인계 항목 삭제
   * @param {string} handoverId 인수인계 ID
   * @returns {boolean} 삭제 성공 여부
   */
  function deleteHandoverItem(handoverId) {
    if (!state.handoverData) {
      return false;
    }
    
    const index = state.handoverData.findIndex(
      (item) => item.handover_id === handoverId
    );
    
    if (index === -1) {
      console.warn(`인수인계 ID '${handoverId}'를 찾을 수 없습니다.`);
      return false;
    }
    
    try {
      // 데이터에서 제거
      state.handoverData.splice(index, 1);
      
      // 저장
      saveHandoverData();
      
      // 변경 이벤트 발생
      document.dispatchEvent(new CustomEvent('data:handoverChanged'));
      
      return true;
    } catch (error) {
      console.error('인수인계 항목 삭제 실패:', error);
      return false;
    }
  }
  
  /**
   * 대시보드 항목 삭제
   * @param {string} orderId 주문 ID
   * @returns {boolean} 삭제 성공 여부
   */
  function deleteDashboardItem(orderId) {
    if (!state.dashboardData) {
      return false;
    }
    
    const index = state.dashboardData.findIndex(
      (item) => item.order_no === orderId
    );
    
    if (index === -1) {
      console.warn(`주문 ID '${orderId}'를 찾을 수 없습니다.`);
      return false;
    }
    
    try {
      // 데이터에서 제거
      state.dashboardData.splice(index, 1);
      
      // 저장
      saveDashboardData();
      
      // 변경 이벤트 발생
      document.dispatchEvent(new CustomEvent('data:dashboardChanged'));
      
      return true;
    } catch (error) {
      console.error('대시보드 항목 삭제 실패:', error);
      return false;
    }
  }
  
  /**
   * 사용자 데이터 가져오기
   * @returns {Object} 사용자 데이터
   */
  function getUserData() {
    return { ...state.userData };
  }
  
  /**
   * 데이터 로드 상태 확인
   * @returns {boolean} 데이터 로드 완료 여부
   */
  function isDataLoaded() {
    return state.isDataLoaded;
  }
  
  // 공개 API
  return {
    loadData,
    getDashboardData,
    getDashboardItemById,
    updateDashboardItem,
    getHandoverData,
    getHandoverItemById,
    addHandoverItem,
    updateHandoverItem,
    deleteHandoverItem,
    deleteDashboardItem,
    saveDashboardData,
    saveHandoverData,
    getUserData,
    isDataLoaded
  };
})();

// 전역 객체로 내보내기
window.DataManager = DataManager;
