/**
 * 데이터 관리 모듈
 * 
 * JSON 파일에서 데이터를 불러오고 관리하는 역할
 */

class DataManager {
  constructor() {
    this.dashboards = [];
    this.drivers = [];
    this.handovers = [];
    this.isLoaded = false;
    this.loadingPromise = null;
  }
  
  /**
   * 데이터 초기 로드
   */
  async loadData() {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }
    
    this.loadingPromise = new Promise((resolve, reject) => {
      // JSON 데이터만 로드 (Excel 파일 로직 제거됨)
      this.loadJsonData()
        .then(resolve)
        .catch(reject);
    });
    
    return this.loadingPromise;
  }
  
  /**
   * JSON 데이터 로드 (메인 데이터 소스)
   */
  async loadJsonData() {
    console.log('JSON 데이터 로드 시도...');
    try {
      const response = await fetch('dashboard_data.json');
      if (!response.ok) {
        throw new Error('JSON 데이터 로드 실패');
      }
      
      const data = await response.json();
      
      // 'dashboard' 시트의 데이터 처리
      if (data.dashboard && Array.isArray(data.dashboard)) {
        console.log(`JSON에서 로드된 대시보드 데이터: ${data.dashboard.length}개 행`);
        
        // 날짜 문자열을 Date 객체로 변환하는 함수
        const parseDate = (dateStr) => {
          if (!dateStr) return null;
          try {
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date;
          } catch (e) {
            console.warn('날짜 파싱 오류:', dateStr, e);
            return null;
          }
        };
        
        // 날짜를 포맷팅하는 함수
        const formatDateString = (date) => {
          if (!date) return '';
          try {
            return date.toISOString().split('T')[0] + ' ' + 
                  date.toTimeString().split(' ')[0].substring(0, 5);
          } catch (e) {
            console.warn('날짜 포맷 변환 실패:', date, e);
            return '';
          }
        };
        
        // 데이터 매핑 및 필터링
        this.dashboards = data.dashboard.map((row, index) => {
          // ISO 형식 날짜 문자열을 Date 객체로 변환
          const etaDate = parseDate(row.eta);
          const createTimeDate = parseDate(row.create_time);
          const updateTimeDate = parseDate(row.update_at);
          const departTimeDate = parseDate(row.depart_time);
          const completeTimeDate = parseDate(row.complete_time);
          
          // 날짜 포맷팅 (화면 표시용)
          const etaFormatted = etaDate ? formatDateString(etaDate) : '';
          const createTime = createTimeDate ? formatDateString(createTimeDate) : '';
          const updateTime = updateTimeDate ? formatDateString(updateTimeDate) : createTime;
          const departTime = departTimeDate ? formatDateString(departTimeDate) : '';
          const completeTime = completeTimeDate ? formatDateString(completeTimeDate) : '';
          
          // 디버깅: 처음 5개 항목 로깅
          if (index < 5) {
            console.log(`JSON 항목 ${index+1}:`);
            console.log(`  - create_time: ${row.create_time}, 변환=${createTime}`);
            console.log(`  - eta: ${row.eta}, 변환=${etaFormatted}`);
            console.log(`  - 날짜 데이터 정합성: create_time_date는 ${createTimeDate instanceof Date ? '유효' : '유효하지 않음'}`);
            console.log(`  - 날짜 데이터 정합성: eta_date는 ${etaDate instanceof Date ? '유효' : '유효하지 않음'}`);
          }
          
          return {
            dashboard_id: index + 1,
            order_no: row.order_no || '',
            customer: row.customer || '',
            type: row.type || 'DELIVERY',
            delivery_status: row.status || 'PENDING',
            department: row.department ? 
              (row.department === 'CS' || row.department === 'HES' || row.department === 'LENOVO' 
                ? row.department 
                : 'CS') 
              : 'CS',
            warehouse: row.warehouse || '서울', // 요구사항에 맞는 기본값
            sla: row.sla || '',
            eta: etaFormatted,
            eta_date: etaDate,
            depart_time: departTime,
            depart_time_date: departTimeDate,
            complete_time: completeTime,
            complete_time_date: completeTimeDate,
            driver_name: row.driver_name || '',
            driver_contact: row.driver_contact || '',
            address: row.address || '',
            postal_code: row.postal_code || '',
            city: row.city || '',
            district: row.district || '',
            region: row.region || '',
            created_at: createTime,
            updated_at: updateTime,
            memo: row.remark || '', // 비고를 메모로 명칭 변경
            contact: row.contact || '',
            // 날짜 객체 저장 (필터링용)
            create_time_date: createTimeDate,
            update_at_date: updateTimeDate
          };
        });
        
        console.log('대시보드 데이터 변환 완료:', this.dashboards.length);
      } else {
        console.warn('JSON 파일에 dashboard 데이터가 없습니다');
        this.createDefaultData();
      }
      
      // 드라이버 데이터 - 항상 기본 데이터 사용
      this.createDefaultDriversData();
      
      // 인수인계 데이터 - 요구사항에 따라 빈 배열 또는 JSON 데이터 활용
      this.handovers = []; // 빈 배열로 시작하고 사용자 이벤트에 따라 데이터 추가
      
      this.isLoaded = true;
      
      // 필터 옵션 초기화
      this.initFilterOptions();
      
      console.log('JSON 데이터 로드 완료:', {
        dashboards: this.dashboards.length,
        drivers: this.drivers.length,
        handovers: this.handovers.length
      });
      
      return { dashboards: this.dashboards, drivers: this.drivers, handovers: this.handovers };
    } catch (error) {
      console.error('JSON 데이터 로드 오류:', error);
      // 하드코딩된 기본 데이터 생성
      this.createDefaultData();
      this.createDefaultDriversData();
      this.handovers = [];
      
      this.isLoaded = true;
      this.initFilterOptions();
      
      return { dashboards: this.dashboards, drivers: this.drivers, handovers: this.handovers };
    }
  }
  
  /**
   * 기본 드라이버 데이터 생성
   */
  createDefaultDriversData() {
    console.log('기본 드라이버 데이터 생성...');
    
    this.drivers = [
      {
        driver_id: 1,
        name: "김기사",
        contact: "010-1234-5678",
        vehicle_type: "트럭",
        vehicle_no: "서울 1234",
        status: "ACTIVE"
      },
      {
        driver_id: 2,
        name: "박배송",
        contact: "010-9876-5432",
        vehicle_type: "밴",
        vehicle_no: "서울 5678",
        status: "ACTIVE"
      },
      {
        driver_id: 3,
        name: "이운송",
        contact: "010-5555-7777",
        vehicle_type: "트럭",
        vehicle_no: "경기 9876",
        status: "ACTIVE"
      },
      {
        driver_id: 4,
        name: "정배달",
        contact: "010-2222-3333",
        vehicle_type: "밴",
        vehicle_no: "경기 5432",
        status: "ACTIVE"
      }
    ];
  }
  
  /**
   * 기본 대시보드 데이터 생성 (모든 로드 실패 시)
   */
  createDefaultData() {
    console.log('기본 대시보드 데이터 생성...');
    
    // 기본 대시보드 데이터
    this.dashboards = [
      {
        dashboard_id: 1,
        order_no: "ORD001",
        customer: "삼성전자",
        type: "DELIVERY",
        delivery_status: "PENDING",
        department: "CS",
        warehouse: "서울",
        eta: "2025-04-10 14:00",
        driver_name: "",
        driver_contact: "",
        address: "서울시 강남구 테헤란로 123",
        postal_code: "06234",
        created_at: "2025-04-05 09:30",
        updated_at: "2025-04-05 09:30",
        memo: "빠른 배송 요청" // 비고를 메모로 명칭 변경
      },
      {
        dashboard_id: 2,
        order_no: "ORD002",
        customer: "LG전자",
        type: "DELIVERY",
        delivery_status: "ASSIGNED",
        department: "HES",
        warehouse: "부산",
        eta: "2025-04-11 10:00",
        driver_name: "김기사",
        driver_contact: "010-1234-5678",
        address: "서울시 서초구 강남대로 111",
        postal_code: "06123",
        created_at: "2025-04-05 10:15",
        updated_at: "2025-04-05 11:30",
        memo: "대형 냉장고 배송" // 비고를 메모로 명칭 변경
      },
      {
        dashboard_id: 3,
        order_no: "ORD003",
        customer: "현대자동차",
        type: "PICKUP",
        delivery_status: "IN_PROGRESS",
        department: "LENOVO",
        warehouse: "광주",
        eta: "2025-04-10 16:30",
        driver_name: "박배송",
        driver_contact: "010-9876-5432",
        address: "경기도 화성시 산업로 500",
        postal_code: "18469",
        created_at: "2025-04-04 14:20",
        updated_at: "2025-04-05 09:15",
        memo: "" // 비고를 메모로 명칭 변경
      },
      {
        dashboard_id: 4,
        order_no: "ORD004",
        customer: "네이버",
        type: "DELIVERY",
        delivery_status: "COMPLETE",
        department: "CS",
        warehouse: "대전",
        eta: "2025-04-08 11:00",
        driver_name: "이운송",
        driver_contact: "010-5555-7777",
        address: "경기도 성남시 분당구 불정로 6",
        postal_code: "13561",
        created_at: "2025-04-03 09:00",
        updated_at: "2025-04-05 12:30",
        memo: "배송 완료" // 비고를 메모로 명칭 변경
      },
      {
        dashboard_id: 5,
        order_no: "ORD005",
        customer: "카카오",
        type: "DELIVERY",
        delivery_status: "ISSUE",
        department: "HES",
        warehouse: "서울",
        eta: "2025-04-09 13:00",
        driver_name: "정배달",
        driver_contact: "010-2222-3333",
        address: "제주시 첨단로 242",
        postal_code: "63309",
        created_at: "2025-04-04 11:30",
        updated_at: "2025-04-05 14:00",
        memo: "주소지 오류로 배송 지연" // 비고를 메모로 명칭 변경
      },
      {
        dashboard_id: 6,
        order_no: "ORD006",
        customer: "SK하이닉스",
        type: "PICKUP",
        delivery_status: "CANCEL",
        department: "LENOVO",
        warehouse: "부산",
        eta: "2025-04-12 09:00",
        driver_name: "",
        driver_contact: "",
        address: "경기도 이천시 부발읍 경충대로 2091",
        postal_code: "17336",
        created_at: "2025-04-06 08:30",
        updated_at: "2025-04-06 08:30",
        memo: "고객 요청으로 취소" // 비고를 메모로 명칭 변경
      }
    ];
    
    // 드라이버 데이터 생성
    this.createDefaultDriversData();
    
    // 인수인계 데이터 - 요구사항에 따라 빈 배열로 설정
    this.handovers = [];
  }
  
  /**
   * 필터 옵션 초기화
   */
  initFilterOptions() {
    this.departments = new Set();
    this.warehouses = new Set(['서울', '부산', '광주', '대전']); // 창고 옵션 고정 추가
    
    this.dashboards.forEach(dashboard => {
      if (dashboard.department) this.departments.add(dashboard.department);
    });
  }
  
  /**
   * 필터 옵션 가져오기
   */
  getFilterOptions() {
    return {
      departments: [...this.departments],
      warehouses: [...this.warehouses]
    };
  }
  
  /**
   * 대시보드 데이터 필터링 및 페이징 처리
   */
  getDashboards(filters = {}, page = 1, pageSize = 10) {
    let filtered = [...this.dashboards];
    
    // 상태 필터링 - 유효한 상태만 필터링
    if (filters.status) {
      // 유효한 상태 확인
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETE', 'ISSUE', 'CANCEL'];
      if (validStatuses.includes(filters.status)) {
        filtered = filtered.filter(item => item.delivery_status === filters.status);
      }
    }
    
    // 부서 필터링
    if (filters.department) {
      filtered = filtered.filter(item => item.department === filters.department);
    }
    
    // 창고 필터링
    if (filters.warehouse) {
      filtered = filtered.filter(item => item.warehouse === filters.warehouse);
    }
    
    // 날짜 필터링 - ETA 기준으로 변경
    if (filters.startDate && filters.endDate) {
      console.log(`날짜 필터 적용 (ETA 기준): ${filters.startDate} ~ ${filters.endDate}`);
      
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0); // 시작일 처음 시간으로 설정
      
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999); // 종료일 마지막 시간으로 설정
      
      // 필터링 전 항목 수
      const beforeCount = filtered.length;
      
      filtered = filtered.filter(item => {
        // 저장된 Date 객체가 있으면 사용
        if (item.eta_date instanceof Date) {
          const result = item.eta_date >= startDate && item.eta_date <= endDate;
          
          // 디버깅 목적으로 일부 항목만 로깅
          if (Math.random() < 0.05) { // 5% 확률로 로깅
            console.log(`ETA 필터링 체크: ${item.order_no}, ETA: ${item.eta}, ETA Date: ${item.eta_date}, 포함여부: ${result}`);
          }
          
          return result;
        }
        
        // eta_date가 없는 경우 문자열에서 변환 시도
        if (item.eta) {
          try {
            const etaDate = new Date(item.eta);
            if (!isNaN(etaDate.getTime())) {
              const result = etaDate >= startDate && etaDate <= endDate;
              return result;
            }
          } catch (error) {
            console.warn('날짜 변환 오류:', item.eta, error);
          }
        }
        
        // 유효한 날짜가 없는 경우는 포함하지 않음
        return false;
      });
      
      // 필터링 후 항목 수
      const afterCount = filtered.length;
      console.log(`날짜 필터 적용 결과: ${beforeCount}개 → ${afterCount}개 (${beforeCount - afterCount}개 필터링됨)`);
    }
    
    // 키워드 검색
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      filtered = filtered.filter(item => 
        (item.order_no && item.order_no.toLowerCase().includes(keyword)) ||
        (item.customer && item.customer.toLowerCase().includes(keyword)) ||
        (item.driver_name && item.driver_name.toLowerCase().includes(keyword)) ||
        (item.address && item.address.toLowerCase().includes(keyword))
      );
    }
    
    // 총 아이템 수
    const totalItems = filtered.length;
    
    // 페이징 처리
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);
    
    return {
      items: paginatedItems,
      page,
      totalItems,
      totalPages,
      pageSize
    };
  }
  
  /**
   * 상태별 개수 가져오기
   */
  getStatusCounts() {
    const counts = {
      PENDING: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      COMPLETE: 0,
      ISSUE: 0,
      CANCEL: 0
    };
    
    this.dashboards.forEach(item => {
      if (counts[item.delivery_status] !== undefined) {
        counts[item.delivery_status]++;
      }
    });
    
    return counts;
  }
  
  /**
   * 대시보드 상세 정보 가져오기
   */
  getDashboardById(id) {
    return this.dashboards.find(item => item.dashboard_id === id);
  }
  
  /**
   * 대시보드 상태 변경
   */
  updateDashboardStatus(id, newStatus, memo) {
    const dashboard = this.getDashboardById(id);
    if (!dashboard) return null;
    
    dashboard.delivery_status = newStatus;
    dashboard.updated_at = this.getCurrentDateTime();
    
    if (memo) {
      dashboard.memo = memo; // 비고를 메모로 명칭 변경
    }
    
    return dashboard;
  }
  
  /**
   * 배차 처리
   */
  assignDriver(ids, driverId) {
    if (!Array.isArray(ids)) {
      ids = [ids];
    }
    
    const driver = this.getDriverById(driverId);
    if (!driver) return [];
    
    const updatedDashboards = [];
    
    ids.forEach(id => {
      const dashboard = this.getDashboardById(id);
      if (dashboard) {
        dashboard.driver_name = driver.name;
        dashboard.driver_contact = driver.contact;
        dashboard.delivery_status = 'ASSIGNED';
        dashboard.updated_at = this.getCurrentDateTime();
        updatedDashboards.push(dashboard);
      }
    });
    
    return updatedDashboards;
  }
  
  /**
   * 대시보드 추가
   */
  addDashboard(dashboardData) {
    const newId = Math.max(...this.dashboards.map(d => d.dashboard_id), 0) + 1;
    
    const newDashboard = {
      dashboard_id: newId,
      ...dashboardData,
      created_at: this.getCurrentDateTime(),
      updated_at: this.getCurrentDateTime()
    };
    
    this.dashboards.push(newDashboard);
    return newDashboard;
  }
  
  /**
   * 대시보드 삭제
   */
  deleteDashboards(ids) {
    if (!Array.isArray(ids)) {
      ids = [ids];
    }
    
    // 삭제 전 대시보드 수
    const beforeCount = this.dashboards.length;
    
    // 선택된 ID와 일치하지 않는 대시보드만 남김
    this.dashboards = this.dashboards.filter(dashboard => !ids.includes(dashboard.dashboard_id));
    
    // 삭제된 항목 수 반환
    const deletedCount = beforeCount - this.dashboards.length;
    console.log(`${deletedCount}개의 대시보드 항목이 삭제되었습니다.`);
    
    return deletedCount;
  }
  
  /**
   * 드라이버 목록 가져오기
   */
  getDrivers() {
    return this.drivers;
  }
  
  /**
   * 드라이버 상세 정보 가져오기
   */
  getDriverById(id) {
    return this.drivers.find(driver => driver.driver_id === parseInt(id));
  }
  
  /**
   * 인수인계 목록 가져오기
   */
  getHandovers() {
    return this.handovers;
  }
  
  /**
   * 인수인계 상세 정보 가져오기
   */
  getHandoverById(id) {
    return this.handovers.find(item => item.handover_id === id);
  }
  
  /**
   * 인수인계 추가
   */
  addHandover(handoverData) {
    const newId = Math.max(...this.handovers.map(h => h.handover_id), 0) + 1;
    
    const newHandover = {
      handover_id: newId,
      ...handoverData,
      created_by: '홍길동', // 현재 사용자 이름
      created_at: this.getCurrentDateTime(),
      updated_at: this.getCurrentDateTime()
    };
    
    this.handovers.push(newHandover);
    return newHandover;
  }
  
  /**
   * 현재 날짜시간 문자열 반환
   */
  getCurrentDateTime() {
    const now = new Date();
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
}

// dataManager 인스턴스 생성 및 전역 변수로 설정
// 전역 객체를 통해 명시적으로 등록
window.dataManager = new DataManager();
