/**
 * 데이터 관리 모듈
 * 프로토타입에 필요한 최소한의 기능만 제공
 */

// 데이터 상태 객체 - 전역으로 접근 가능
const appData = {
  dashboard: [],
  handover: [],
  userData: {
    userName: 'CSAdmin',
    userRole: 'CS'
  },
  isLoaded: false
};

// 대시보드 데이터 로드
async function loadDashboardData() {
  try {
    console.log('대시보드 데이터 로드 중...');
    const response = await fetch('dashboard_data.json');
    
    if (!response.ok) {
      throw new Error(`데이터 로드 실패: ${response.status}`);
    }
    
    const data = await response.json();
    appData.dashboard = data.dashboard || [];
    
    // 날짜 필드 처리
    appData.dashboard.forEach(item => {
      if (item.eta) {
        item.eta_date = new Date(item.eta);
      }
    });
    
    console.log(`대시보드 데이터 ${appData.dashboard.length}건 로드 완료`);
    
    // 데이터를 로컬 스토리지에도 저장
    localStorage.setItem('tms_dashboard_data', JSON.stringify(appData.dashboard));
    
    return appData.dashboard;
  } catch (error) {
    console.error('대시보드 데이터 로드 오류:', error);
    showError('대시보드 데이터 로드 실패');
    
    // 로컬 스토리지에서 복구 시도
    try {
      const savedData = localStorage.getItem('tms_dashboard_data');
      if (savedData) {
        appData.dashboard = JSON.parse(savedData);
        console.log(`로컬 스토리지에서 대시보드 데이터 ${appData.dashboard.length}건 복구`);
      }
    } catch (e) {
      console.error('로컬 스토리지 복구 실패:', e);
    }
    
    return appData.dashboard;
  }
}

// 인수인계 데이터 로드
async function loadHandoverData() {
  try {
    console.log('인수인계 데이터 로드 중...');
    const response = await fetch('handover_data.json');
    
    if (!response.ok) {
      throw new Error(`데이터 로드 실패: ${response.status}`);
    }
    
    const data = await response.json();
    appData.handover = data.handovers || [];
    console.log(`인수인계 데이터 ${appData.handover.length}건 로드 완료`);
    
    // 데이터를 로컬 스토리지에도 저장
    localStorage.setItem('tms_handover_data', JSON.stringify(appData.handover));
    
    return appData.handover;
  } catch (error) {
    console.error('인수인계 데이터 로드 오류:', error);
    showError('인수인계 데이터 로드 실패');
    
    // 로컬 스토리지에서 복구 시도
    try {
      const savedData = localStorage.getItem('tms_handover_data');
      if (savedData) {
        appData.handover = JSON.parse(savedData);
        console.log(`로컬 스토리지에서 인수인계 데이터 ${appData.handover.length}건 복구`);
      } else {
        // 기본 데이터 초기화
        initDefaultHandoverData();
      }
    } catch (e) {
      console.error('로컬 스토리지 복구 실패:', e);
      // 기본 데이터 초기화
      initDefaultHandoverData();
    }
    
    return appData.handover;
  }
}

// 기본 인수인계 데이터 초기화 (파일 로드 실패 시 사용)
function initDefaultHandoverData() {
  appData.handover = [
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
    }
  ];
  
  console.log(`기본 인수인계 데이터 ${appData.handover.length}건 초기화 완료`);
}

// 앱 데이터 로드
async function loadAppData() {
  try {
    await Promise.all([
      loadDashboardData(),
      loadHandoverData()
    ]);
    
    appData.isLoaded = true;
    console.log('모든 데이터 로드 완료');
    
    // 데이터 로드 완료 이벤트 발생
    document.dispatchEvent(new Event('data_loaded'));
    
    return true;
  } catch (error) {
    console.error('데이터 로드 오류:', error);
    showError('데이터 로드 중 오류가 발생했습니다');
    return false;
  }
}

// 주문 정보 ID로 찾기
function findOrderById(orderId) {
  return appData.dashboard.find(item => item.order_no === orderId);
}

// 인수인계 ID로 찾기
function findHandoverById(handoverId) {
  return appData.handover.find(item => item.handover_id === handoverId);
}

// 주문 정보 업데이트
function updateOrder(orderId, newData) {
  const index = appData.dashboard.findIndex(item => item.order_no === orderId);
  
  if (index === -1) {
    // 새 항목 추가
    const newOrder = {
      ...newData,
      order_no: orderId,
      update_at: new Date().toISOString(),
      updated_by: appData.userData.userName
    };
    
    appData.dashboard.push(newOrder);
    console.log('새 주문 추가:', orderId);
  } else {
    // 기존 항목 업데이트
    appData.dashboard[index] = {
      ...appData.dashboard[index],
      ...newData,
      update_at: new Date().toISOString(),
      updated_by: appData.userData.userName
    };
    console.log('주문 업데이트:', orderId);
  }
  
  // 로컬 스토리지에 저장
  localStorage.setItem('tms_dashboard_data', JSON.stringify(appData.dashboard));
  
  // 변경 알림 이벤트
  document.dispatchEvent(new Event('dashboard_updated'));
  
  return true;
}

// 인수인계 정보 추가
function addHandover(handoverData) {
  // 새 ID 생성
  const newId = `H${(appData.handover.length + 1).toString().padStart(3, '0')}`;
  
  // 새 항목 생성
  const newHandover = {
    handover_id: newId,
    title: handoverData.title,
    content: handoverData.content,
    is_notice: handoverData.is_notice || false,
    created_by: appData.userData.userName,
    created_at: formatDateTime(new Date())
  };
  
  // 배열에 추가
  appData.handover.push(newHandover);
  
  // 로컬 스토리지에 저장
  localStorage.setItem('tms_handover_data', JSON.stringify(appData.handover));
  
  // 변경 알림 이벤트
  document.dispatchEvent(new Event('handover_updated'));
  
  console.log('새 인수인계 추가:', newId);
  return newHandover;
}

// 인수인계 정보 업데이트
function updateHandover(handoverId, newData) {
  const index = appData.handover.findIndex(item => item.handover_id === handoverId);
  
  if (index === -1) {
    console.error('인수인계 ID를 찾을 수 없음:', handoverId);
    return false;
  }
  
  // 기존 항목 업데이트
  appData.handover[index] = {
    ...appData.handover[index],
    ...newData,
    update_at: new Date().toISOString()
  };
  
  // 로컬 스토리지에 저장
  localStorage.setItem('tms_handover_data', JSON.stringify(appData.handover));
  
  // 변경 알림 이벤트
  document.dispatchEvent(new Event('handover_updated'));
  
  console.log('인수인계 업데이트:', handoverId);
  return true;
}

// 필터링 함수
function filterDashboardData(filters = {}) {
  let result = [...appData.dashboard];
  
  // 상태 필터
  if (filters.status) {
    result = result.filter(item => item.status === filters.status);
  }
  
  // 부서 필터
  if (filters.department) {
    result = result.filter(item => item.department === filters.department);
  }
  
  // 창고 필터
  if (filters.warehouse) {
    result = result.filter(item => item.warehouse === filters.warehouse);
  }
  
  // 키워드 검색
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase();
    result = result.filter(item => 
      (item.order_no && item.order_no.toLowerCase().includes(keyword)) ||
      (item.customer && item.customer.toLowerCase().includes(keyword))
    );
  }
  
  // 날짜 필터
  if (filters.startDate && filters.endDate) {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59); // 종료일 끝까지 포함
    
    result = result.filter(item => {
      if (!item.eta) return false;
      const date = new Date(item.eta);
      return date >= start && date <= end;
    });
  }
  
  return result;
}

// 인수인계 필터링
function filterHandoverData(filters = {}) {
  let result = [...appData.handover];
  
  // 공지사항 필터
  if (filters.isNotice !== undefined) {
    result = result.filter(item => item.is_notice === filters.isNotice);
  }
  
  // 키워드 검색
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase();
    result = result.filter(item => 
      item.title.toLowerCase().includes(keyword) ||
      item.content.toLowerCase().includes(keyword)
    );
  }
  
  return result;
}

// 사용자 정보 가져오기
function getUserData() {
  return { ...appData.userData };
}
