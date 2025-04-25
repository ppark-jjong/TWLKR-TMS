/**
 * 대시보드 메인 모듈
 * 대시보드 페이지 메인 기능을 관리합니다.
 */
window.Dashboard = (function() {
  /**
   * 초기화 함수
   */
  function init() {
    // 모듈 의존성 확인
    if (!checkDependencies()) {
      console.error('대시보드 초기화 실패: 필수 모듈이 로드되지 않았습니다.');
      return;
    }
    
    // 대시보드 초기화
    DashboardInit.init();
    
    // 디버깅 정보 출력
    console.log('대시보드가 성공적으로 초기화되었습니다.');
  }
  
  /**
   * 모듈 의존성을 확인합니다.
   * @returns {boolean} - 의존성 확인 결과
   */
  function checkDependencies() {
    const dependencies = [
      { name: 'Utils', module: window.Utils },
      { name: 'API', module: window.API },
      { name: 'Modal', module: window.Modal },
      { name: 'Alerts', module: window.Alerts },
      { name: 'Pagination', module: window.Pagination },
      { name: 'DashboardTable', module: window.DashboardTable },
      { name: 'DashboardFilter', module: window.DashboardFilter },
      { name: 'DashboardModals', module: window.DashboardModals },
      { name: 'DashboardActions', module: window.DashboardActions },
      { name: 'DashboardInit', module: window.DashboardInit }
    ];
    
    const missingDependencies = dependencies.filter(dep => !dep.module);
    
    if (missingDependencies.length > 0) {
      console.error('누락된 의존성:', missingDependencies.map(dep => dep.name).join(', '));
      
      // 사용자에게 알림
      if (window.Alerts) {
        Alerts.error('일부 필수 스크립트를 로드할 수 없습니다. 페이지를 새로고침하세요.');
      } else {
        alert('일부 필수 스크립트를 로드할 수 없습니다. 페이지를 새로고침하세요.');
      }
      
      return false;
    }
    
    return true;
  }
  
  /**
   * 주문 테이블에서 행을 클릭했을 때 호출할 핸들러
   * @param {string} orderId - 주문 ID
   */
  function onRowClick(orderId) {
    if (window.DashboardModals) {
      DashboardModals.showOrderDetail(orderId);
    }
  }
  
  /**
   * 체크박스 클릭 시 호출할 핸들러
   * @param {string} orderId - 주문 ID
   * @param {boolean} checked - 체크 여부
   */
  function onCheckboxClick(orderId, checked) {
    if (window.DashboardTable) {
      DashboardTable.selectRow(orderId, checked);
    }
  }
  
  /**
   * 상태별로 행을 필터링합니다.
   * @param {string} status - 상태 값
   */
  function filterByStatus(status) {
    if (window.DashboardFilter) {
      DashboardFilter.state.status = status;
      DashboardFilter.applyFilters();
    }
  }
  
  /**
   * 부서별로 행을 필터링합니다.
   * @param {string} department - 부서 값
   */
  function filterByDepartment(department) {
    if (window.DashboardFilter) {
      DashboardFilter.state.department = department;
      DashboardFilter.applyFilters();
    }
  }
  
  /**
   * 창고별로 행을 필터링합니다.
   * @param {string} warehouse - 창고 값
   */
  function filterByWarehouse(warehouse) {
    if (window.DashboardFilter) {
      DashboardFilter.state.warehouse = warehouse;
      DashboardFilter.applyFilters();
    }
  }
  
  /**
   * 주문 상세 정보를 표시합니다.
   * @param {string} orderId - 주문 ID
   */
  async function showOrderDetail(orderId) {
    if (window.DashboardModals) {
      await DashboardModals.showOrderDetail(orderId);
    }
  }
  
  /**
   * 주문 상태를 변경합니다.
   * @param {Array<string>} orderIds - 주문 ID 목록
   * @param {string} newStatus - 변경할 상태
   */
  async function changeStatus(orderIds, newStatus) {
    if (window.DashboardActions) {
      return await DashboardActions.changeStatus(orderIds, newStatus);
    }
    return { success: false, message: '상태 변경 모듈을 찾을 수 없습니다.' };
  }
  
  /**
   * 기사를 배정합니다.
   * @param {Array<string>} orderIds - 주문 ID 목록
   * @param {string} driverName - 기사 이름
   * @param {string} driverContact - 기사 연락처
   */
  async function assignDriver(orderIds, driverName, driverContact) {
    if (window.DashboardActions) {
      return await DashboardActions.assignDriver(orderIds, driverName, driverContact);
    }
    return { success: false, message: '배차 처리 모듈을 찾을 수 없습니다.' };
  }
  
  /**
   * 주문을 생성합니다.
   * @param {Object} orderData - 주문 데이터
   */
  async function createOrder(orderData) {
    if (window.DashboardActions) {
      return await DashboardActions.createOrder(orderData);
    }
    return { success: false, message: '주문 생성 모듈을 찾을 수 없습니다.' };
  }
  
  /**
   * 주문을 수정합니다.
   * @param {string} orderId - 주문 ID
   * @param {Object} orderData - 주문 데이터
   */
  async function updateOrder(orderId, orderData) {
    if (window.DashboardActions) {
      return await DashboardActions.updateOrder(orderId, orderData);
    }
    return { success: false, message: '주문 수정 모듈을 찾을 수 없습니다.' };
  }
  
  /**
   * 주문을 삭제합니다.
   * @param {Array<string>} orderIds - 주문 ID 목록
   */
  async function deleteOrders(orderIds) {
    if (window.DashboardActions) {
      return await DashboardActions.deleteOrders(orderIds);
    }
    return { success: false, message: '주문 삭제 모듈을 찾을 수 없습니다.' };
  }
  
  /**
   * 컬럼 가시성을 초기화합니다.
   */
  function initColumnVisibility() {
    if (window.DashboardTable) {
      DashboardTable.loadColumnVisibility();
    }
  }
  
  // 페이지 로드 시 대시보드 초기화
  document.addEventListener('DOMContentLoaded', init);
  
  // 공개 API
  return {
    init,
    onRowClick,
    onCheckboxClick,
    filterByStatus,
    filterByDepartment,
    filterByWarehouse,
    showOrderDetail,
    changeStatus,
    assignDriver,
    createOrder,
    updateOrder,
    deleteOrders,
    initColumnVisibility
  };
})();
