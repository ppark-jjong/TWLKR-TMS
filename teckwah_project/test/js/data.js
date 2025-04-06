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
      // 먼저 Excel 파일 로드 시도
      fetch('dashboard.xlsx')
        .then(response => {
          if (!response.ok) {
            throw new Error('Excel 데이터 로드 실패');
          }
          return response.arrayBuffer();
        })
        .then(buffer => {
          try {
            // XLSX가 전역 변수로 제대로 로드되었는지 확인
            if (typeof XLSX === 'undefined') {
              console.error('XLSX 라이브러리가 로드되지 않았습니다.');
              throw new Error('XLSX 라이브러리가 로드되지 않았습니다.');
            }
            
            // Excel 파일 읽기
            const workbook = XLSX.read(buffer, { type: 'array' });
            console.log('Excel 워크북 로드됨:', workbook.SheetNames);
            
            // 'dashboard' 시트 읽기 (분석 결과 확인된 실제 시트명)
            if (workbook.SheetNames.includes('dashboard')) {
              const dashboardSheet = workbook.Sheets['dashboard'];
              const rawData = XLSX.utils.sheet_to_json(dashboardSheet);
              console.log('대시보드 원본 데이터 로드됨:', rawData.length);
              
              // Excel 날짜 숫자를 JavaScript Date 객체로 변환하는 함수
              const excelDateToJSDate = (excelDate) => {
                if (!excelDate || isNaN(excelDate)) return null;
                
                // Excel의 날짜는 1900년 1월 1일부터 시작, 1900년은 윤년이 아닌데 Excel이 윤년으로 계산하는 버그가 있어 -1 조정
                const utcDays = excelDate - 25569; // 1970년 1월 1일과 1900년 1월 1일의 차이
                const millisecondsPerDay = 24 * 60 * 60 * 1000;
                const date = new Date(utcDays * millisecondsPerDay);
                
                return date;
              };
              
              // 날짜 형식 변환 함수
              const formatDate = (date) => {
                if (!date) return '';
                
                try {
                  // JavaScript Date 객체인 경우
                  if (date instanceof Date) {
                    return date.toISOString().split('T')[0] + ' ' +
                           date.toTimeString().split(' ')[0].substring(0, 5);
                  }
                  
                  // 숫자인 경우 Excel 날짜로 처리
                  if (typeof date === 'number') {
                    const jsDate = excelDateToJSDate(date);
                    if (jsDate) {
                      return jsDate.toISOString().split('T')[0] + ' ' +
                             jsDate.toTimeString().split(' ')[0].substring(0, 5);
                    }
                  }
                  
                  // 문자열인 경우 그대로 반환
                  return String(date);
                } catch (error) {
                  console.warn('날짜 형식 변환 오류:', date, error);
                  return String(date);
                }
              };
              
              // Utils에서 Excel 날짜 변환 함수 사용
              const excelDateToJSDate = dateUtils.excelDateToDate;
              
              /**
               * 날짜를 문자열로 포맷하는 함수
               */
              const formatDateString = (date) => {
                if (!date) return '';
                
                try {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const hours = String(date.getHours()).padStart(2, '0');
                  const minutes = String(date.getMinutes()).padStart(2, '0');
                  
                  return `${year}-${month}-${day} ${hours}:${minutes}`;
                } catch (e) {
                  console.warn('날짜 포맷 변환 실패:', date, e);
                  return '';
                }
              };
              
              // 데이터 변환 - 필드명 매핑 및 필터링
              this.dashboards = rawData.map((row, index) => {
                // === 날짜 필드 변환 ===
                
                // eta 필드 변환
                let etaDate = null;
                if (row.eta) {
                  // 숫자인 경우 Excel 날짜로 변환
                  if (typeof row.eta === 'number') {
                    etaDate = excelDateToJSDate(row.eta);
                  } 
                  // 문자열인 경우 Date 객체로 변환 시도
                  else if (typeof row.eta === 'string') {
                    try {
                      etaDate = new Date(row.eta);
                    } catch (e) {
                      console.warn('ETA 날짜 변환 실패:', row.eta);
                    }
                  }
                }
                
                // create_time 필드 변환
                let createTimeDate = null;
                if (row.create_time) {
                  // 숫자인 경우 Excel 날짜로 변환
                  if (typeof row.create_time === 'number') {
                    createTimeDate = excelDateToJSDate(row.create_time);
                  } 
                  // 문자열인 경우 Date 객체로 변환 시도
                  else if (typeof row.create_time === 'string') {
                    try {
                      createTimeDate = new Date(row.create_time);
                    } catch (e) {
                      console.warn('create_time 날짜 변환 실패:', row.create_time);
                    }
                  }
                }
                
                // update_at 필드 변환
                let updateTimeDate = null;
                if (row.update_at) {
                  // 숫자인 경우 Excel 날짜로 변환
                  if (typeof row.update_at === 'number') {
                    updateTimeDate = excelDateToJSDate(row.update_at);
                  } 
                  // 문자열인 경우 Date 객체로 변환 시도
                  else if (typeof row.update_at === 'string') {
                    try {
                      updateTimeDate = new Date(row.update_at);
                    } catch (e) {
                      console.warn('update_at 날짜 변환 실패:', row.update_at);
                    }
                  }
                }
                
                // 날짜 문자열 형식으로 변환
                const etaFormatted = etaDate ? formatDateString(etaDate) : '';
                const createTime = createTimeDate ? formatDateString(createTimeDate) : '';
                const updateTime = updateTimeDate ? formatDateString(updateTimeDate) : createTime;
                
                // 디버깅: 처음 5개 항목 로깅
                if (index < 5) {
                  console.log(`항목 ${index+1}: 원본 create_time=${row.create_time}, 변환=${createTime}, 타입=${typeof row.create_time}`);
                }
                
                // 변환된 데이터 반환
                return {
                  dashboard_id: index + 1, // dashboard_id가 null인 경우가 있어 인덱스 기반으로 생성
                  order_no: row.order_no || '',
                  customer: row.customer || '',
                  type: row.type || 'DELIVERY',
                  delivery_status: row.status || 'PENDING',
                  department: row.department === 'CS' || row.department === 'HES' || row.department === 'LENOVO' 
                    ? row.department
                    : 'CS', // 요구사항에 맞게 필터링
                  warehouse: '서울', // 요구사항에 따라 모두 서울로 통일
                  eta: etaFormatted,
                  eta_date: etaDate, // 필터링을 위한 Date 객체 저장
                  driver_name: row.driver_name || '',
                  driver_contact: row.driver_contact || '',
                  address: row.address || '',
                  postal_code: row.postal_code || '',
                  created_at: createTime,
                  updated_at: updateTime,
                  remark: row.remark || '',
                  // 원본 날짜 값과 변환된 날짜 객체 추가
                  create_time: row.create_time, // 원본 값 유지
                  create_time_date: createTimeDate, // 변환된 Date 객체
                  update_at: row.update_at, // 원본 값 유지
                  update_at_date: updateTimeDate // 변환된 Date 객체
                };
              });
              
              console.log('대시보드 데이터 변환 완료:', this.dashboards.length);
            } else {
              console.error('dashboard 시트를 찾을 수 없습니다.');
              throw new Error('필요한 시트가 없습니다.');
            }
            
            // drivers와 handovers는 요구사항에 따라 JSON 데이터 또는 기본 데이터 사용
            this.createDefaultDriversData();
            this.handovers = []; // handovers는 빈 배열로 시작
            
            this.isLoaded = true;
            
            // 필터 옵션 초기화
            this.initFilterOptions();
            
            console.log('Excel 데이터 로드 완료:', {
              dashboards: this.dashboards.length,
              drivers: this.drivers.length,
              handovers: this.handovers.length
            });
            
            resolve({ dashboards: this.dashboards, drivers: this.drivers, handovers: this.handovers });
          } catch (error) {
            console.error('Excel 파싱 오류:', error);
            // Excel 파싱 오류 시 JSON 데이터 로드 시도
            this.loadJsonData()
              .then(resolve)
              .catch(reject);
          }
        })
        .catch(error => {
          console.error('Excel 데이터 로드 오류:', error);
          // Excel 로드 실패 시 JSON 데이터 로드 시도
          this.loadJsonData()
            .then(resolve)
            .catch(reject);
        });
    });
    
    return this.loadingPromise;
  }
  
  /**
   * JSON 백업 데이터 로드
   */
  async loadJsonData() {
    console.log('JSON 백업 데이터 로드 시도...');
    try {
      const response = await fetch('dashboard_data.json');
      if (!response.ok) {
        throw new Error('JSON 데이터 로드 실패');
      }
      
      const data = await response.json();
      
      // 대시보드 데이터 처리
      if (data.dashboards && Array.isArray(data.dashboards)) {
        // 데이터 필터링 및 변환 - CS, HES, LENOVO만 사용하고 창고는 '서울'로 설정
        this.dashboards = data.dashboards.map(dashboard => {
          const updatedDashboard = {...dashboard};
          
          // 부서가 CS, HES, LENOVO가 아니면 'CS'로 설정
          if (!['CS', 'HES', 'LENOVO'].includes(updatedDashboard.department)) {
            updatedDashboard.department = 'CS';
          }
          
          // 창고 필드를 '서울'로 설정
          updatedDashboard.warehouse = '서울';
          
          // delivery_status 필드명 통일 (status -> delivery_status)
          if (updatedDashboard.status && !updatedDashboard.delivery_status) {
            updatedDashboard.delivery_status = updatedDashboard.status;
            delete updatedDashboard.status;
          }
          
          return updatedDashboard;
        });
      } else {
        // dashboards 데이터가 없으면 기본 데이터 생성
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
        remark: "빠른 배송 요청"
      },
      {
        dashboard_id: 2,
        order_no: "ORD002",
        customer: "LG전자",
        type: "DELIVERY",
        delivery_status: "ASSIGNED",
        department: "HES",
        warehouse: "서울",
        eta: "2025-04-11 10:00",
        driver_name: "김기사",
        driver_contact: "010-1234-5678",
        address: "서울시 서초구 강남대로 111",
        postal_code: "06123",
        created_at: "2025-04-05 10:15",
        updated_at: "2025-04-05 11:30",
        remark: "대형 냉장고 배송"
      },
      {
        dashboard_id: 3,
        order_no: "ORD003",
        customer: "현대자동차",
        type: "PICKUP",
        delivery_status: "IN_PROGRESS",
        department: "LENOVO",
        warehouse: "서울",
        eta: "2025-04-10 16:30",
        driver_name: "박배송",
        driver_contact: "010-9876-5432",
        address: "경기도 화성시 산업로 500",
        postal_code: "18469",
        created_at: "2025-04-04 14:20",
        updated_at: "2025-04-05 09:15",
        remark: ""
      },
      {
        dashboard_id: 4,
        order_no: "ORD004",
        customer: "네이버",
        type: "DELIVERY",
        delivery_status: "COMPLETE",
        department: "CS",
        warehouse: "서울",
        eta: "2025-04-08 11:00",
        driver_name: "이운송",
        driver_contact: "010-5555-7777",
        address: "경기도 성남시 분당구 불정로 6",
        postal_code: "13561",
        created_at: "2025-04-03 09:00",
        updated_at: "2025-04-05 12:30",
        remark: "배송 완료"
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
        remark: "주소지 오류로 배송 지연"
      },
      {
        dashboard_id: 6,
        order_no: "ORD006",
        customer: "SK하이닉스",
        type: "PICKUP",
        delivery_status: "CANCEL",
        department: "LENOVO",
        warehouse: "서울",
        eta: "2025-04-12 09:00",
        driver_name: "",
        driver_contact: "",
        address: "경기도 이천시 부발읍 경충대로 2091",
        postal_code: "17336",
        created_at: "2025-04-06 08:30",
        updated_at: "2025-04-06 08:30",
        remark: "고객 요청으로 취소"
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
    this.warehouses = new Set();
    
    this.dashboards.forEach(dashboard => {
      if (dashboard.department) this.departments.add(dashboard.department);
      if (dashboard.warehouse) this.warehouses.add(dashboard.warehouse);
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
  updateDashboardStatus(id, newStatus, remark) {
    const dashboard = this.getDashboardById(id);
    if (!dashboard) return null;
    
    dashboard.delivery_status = newStatus;
    dashboard.updated_at = this.getCurrentDateTime();
    
    if (remark) {
      dashboard.remark = remark;
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

// 싱글톤 인스턴스 생성
const dataManager = new DataManager();
