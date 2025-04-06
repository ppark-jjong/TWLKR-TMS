/**
 * 시각화 페이지 관련 기능
 */

class VisualizationPage {
  constructor() {
    // 상태 초기화
    this.currentChart = null;
    this.departmentCharts = {
      cs: null,
      hes: null,
      lenovo: null,
      all: null
    };
    this.dashboardData = [];
    this.processedData = [];
    this.currentChartType = 'time'; // 기본 차트 타입은 시간대별
    
    // 요소
    this.elements = {
      startDate: document.getElementById('vizStartDate'),
      endDate: document.getElementById('vizEndDate'),
      dateRangeLabel: document.getElementById('vizDateRangeLabel'),
      departmentFilter: document.getElementById('vizDepartmentFilter'),
      chartTypeSelect: document.getElementById('vizChartType'),
      applyFilterBtn: document.getElementById('applyVizFilterBtn'),
      refreshBtn: document.getElementById('refreshVisualizationBtn'),
      chartCanvas: document.getElementById('orderTimeChart'),
      // 부서별 차트 컨테이너
      mainChartContainer: document.getElementById('mainChartContainer'),
      departmentChartsContainer: document.getElementById('departmentChartsContainer'),
      // 부서별 차트 캔버스
      csChartCanvas: document.getElementById('csChart'),
      hesChartCanvas: document.getElementById('hesChart'),
      lenovoChartCanvas: document.getElementById('lenovoChart'),
      allDeptChartCanvas: document.getElementById('allDeptChart')
    };
    
    // 이벤트 핸들러 바인딩
    this.bindEvents();
  }
  
  /**
   * 이벤트 핸들러 바인딩
   */
  bindEvents() {
    // 필터 적용 버튼
    this.elements.applyFilterBtn.addEventListener('click', this.applyFilters.bind(this));
    
    // 새로고침 버튼
    this.elements.refreshBtn.addEventListener('click', this.refreshData.bind(this));
    
    // 날짜 입력 이벤트
    this.elements.startDate.addEventListener('change', this.updateDateLabel.bind(this));
    this.elements.endDate.addEventListener('change', this.updateDateLabel.bind(this));
    
    // 차트 타입 변경 이벤트
    this.elements.chartTypeSelect.addEventListener('change', () => {
      this.currentChartType = this.elements.chartTypeSelect.value;
      this.toggleChartContainers(this.currentChartType);
      this.refreshData();
    });
  }
  
  /**
   * 차트 컨테이너 전환
   */
  toggleChartContainers(chartType) {
    if (chartType === 'dept-status') {
      this.elements.mainChartContainer.style.display = 'none';
      this.elements.departmentChartsContainer.style.display = 'block';
    } else {
      this.elements.mainChartContainer.style.display = 'block';
      this.elements.departmentChartsContainer.style.display = 'none';
    }
  }
  
  /**
   * 초기화 함수
   */
  async init() {
    try {
      // 초기 날짜 범위 설정
      const today = dateUtils.getCurrentDate();
      this.elements.endDate.value = today;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14); // 기본 2주 데이터
      this.elements.startDate.value = dateUtils.formatDate(startDate);
      
      // 날짜 라벨 업데이트
      this.updateDateLabel();
      
      // 데이터 로드
      await dataManager.loadData();
      this.dashboardData = dataManager.dashboards;
      
      // 데이터 분석 및 로깅
      this.analyzeAndLogData();
      
      // 차트 타입 초기화
      this.currentChartType = this.elements.chartTypeSelect.value || 'time';
      this.toggleChartContainers(this.currentChartType);
      
      // 차트 생성
      this.refreshData();
      
    } catch (error) {
      console.error('시각화 페이지 초기화 오류:', error);
      messageUtils.error('시각화 페이지를 초기화하는 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 데이터 분석 및 로깅
   */
  analyzeAndLogData() {
    if (!this.dashboardData || this.dashboardData.length === 0) {
      console.warn('분석할 데이터가 없습니다.');
      return;
    }
    
    console.log(`총 데이터 항목 수: ${this.dashboardData.length}`);
    
    // create_time 필드 분석
    const createTimeTypes = {};
    const createTimeSamples = {};
    
    this.dashboardData.slice(0, 10).forEach((item, index) => {
      const type = typeof item.create_time;
      createTimeTypes[type] = (createTimeTypes[type] || 0) + 1;
      
      // 타입별 샘플 데이터 저장
      if (!createTimeSamples[type]) {
        createTimeSamples[type] = item.create_time;
      }
      
      console.log(`데이터 ${index+1}: create_time=${item.create_time}, 타입=${type}, create_time_date=${item.create_time_date}`);
    });
    
    console.log('create_time 필드 타입 분포:', createTimeTypes);
    console.log('create_time 필드 타입별 샘플:', createTimeSamples);
    
    // 부서 필드 분석
    const departments = {};
    this.dashboardData.forEach(item => {
      departments[item.department] = (departments[item.department] || 0) + 1;
    });
    
    console.log('부서별 데이터 분포:', departments);
    
    // 상태 필드 분석
    const statuses = {};
    this.dashboardData.forEach(item => {
      statuses[item.delivery_status] = (statuses[item.delivery_status] || 0) + 1;
    });
    
    console.log('상태별 데이터 분포:', statuses);
  }
  
  /**
   * 날짜 라벨 업데이트
   */
  updateDateLabel() {
    const startDate = this.elements.startDate.value;
    const endDate = this.elements.endDate.value;
    
    if (startDate && endDate) {
      // 시작일이 종료일보다 늦을 경우 조정
      if (new Date(startDate) > new Date(endDate)) {
        messageUtils.warning('시작일은 종료일보다 이전이어야 합니다.');
        // 종료일을 시작일로 설정
        this.elements.endDate.value = startDate;
      }
      
      // 날짜 라벨 업데이트
      const startFormatted = dateUtils.formatDate(new Date(startDate));
      const endFormatted = dateUtils.formatDate(new Date(endDate));
      
      if (this.elements.dateRangeLabel) {
        this.elements.dateRangeLabel.textContent = `${startFormatted} ~ ${endFormatted}`;
      }
    }
  }
  
  /**
   * 필터 적용
   */
  applyFilters() {
    this.refreshData();
  }
  
  /**
   * 데이터 새로고침 및 차트 업데이트
   */
  refreshData() {
    // 필터 값 가져오기
    const filters = this.getFilters();
    
    // 차트 타입에 따라 다른 처리
    if (this.currentChartType === 'time') {
      // 시간대별 주문 접수 차트
      this.processedData = this.processTimeData(filters);
      this.updateTimeChart();
    } else if (this.currentChartType === 'dept-status') {
      // 부서별 배송 상태 분포 차트
      this.processedData = this.processDepartmentStatusData(filters);
      this.updateDepartmentStatusCharts();
    }
  }
  
  /**
   * 필터 값 가져오기
   */
  getFilters() {
    return {
      startDate: this.elements.startDate.value,
      endDate: this.elements.endDate.value,
      department: this.elements.departmentFilter.value
    };
  }
  
  /**
   * Excel 날짜를 Date 객체로 변환 (유틸리티 함수 사용)
   */
  convertExcelDate(excelDate) {
    return dateUtils.excelDateToDate(excelDate);
  }
  
  /**
   * 데이터 필터링 함수 - create_time 기준 날짜와 부서 필터
   */
  filterData(filters) {
    let filteredData = [...this.dashboardData];
    
    // 날짜 필터링 (create_time 기준)
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      console.log(`날짜 범위 필터 (생성 일자 기준): ${startDate.toISOString()} ~ ${endDate.toISOString()}`);
      
      filteredData = filteredData.filter(item => {
        // create_time_date가 Date 객체인 경우
        if (item.create_time_date instanceof Date) {
          return item.create_time_date >= startDate && item.create_time_date <= endDate;
        }
        
        // create_time 문자열이 있는 경우
        if (item.created_at && typeof item.created_at === 'string') {
          try {
            const createDate = new Date(item.created_at);
            if (!isNaN(createDate.getTime())) {
              return createDate >= startDate && createDate <= endDate;
            }
          } catch (error) {
            console.warn('생성 일자 변환 오류:', item.created_at, error);
          }
        }
        
        // 원본 숫자형 create_time이 있는 경우
        if (item.create_time && typeof item.create_time === 'number') {
          try {
            const createDate = this.convertExcelDate(item.create_time);
            if (createDate && !isNaN(createDate.getTime())) {
              return createDate >= startDate && createDate <= endDate;
            }
          } catch (error) {
            console.warn('Excel 생성 일자 변환 오류:', item.create_time, error);
          }
        }
        
        return false;
      });
      
      console.log(`날짜 필터링 후 데이터 수: ${filteredData.length}`);
    }
    
    // 부서 필터링
    if (filters.department) {
      filteredData = filteredData.filter(item => item.department === filters.department);
      console.log(`부서 필터링 후 데이터 수: ${filteredData.length}`);
    }
    
    return filteredData;
  }
  
  /**
   * 데이터 처리 - 시간대별 집계 (한국 시간 기준, create_time)
   */
  processTimeData(filters) {
    // 데이터 필터링
    const filteredData = this.filterData(filters);
    
    // 시간대별 집계 (9시~18시: 1시간 단위, 18시~9시: 한 묶음)
    const timeSlots = {
      '09:00 - 10:00': 0,
      '10:00 - 11:00': 0,
      '11:00 - 12:00': 0,
      '12:00 - 13:00': 0,
      '13:00 - 14:00': 0,
      '14:00 - 15:00': 0,
      '15:00 - 16:00': 0,
      '16:00 - 17:00': 0,
      '17:00 - 18:00': 0,
      '18:00 - 09:00': 0
    };
    
    let totalCount = 0;
    let processedCount = 0;
    let errorCount = 0;
    
    // 각 주문의 생성 시간을 확인하여 해당 시간대에 카운트 증가
    filteredData.forEach((item, index) => {
      try {
        // 생성 시간 사용
        let createTime;
        
        // Date 객체인 경우
        if (item.create_time_date instanceof Date) {
          createTime = item.create_time_date;
        }
        // created_at 문자열인 경우
        else if (item.created_at && typeof item.created_at === 'string') {
          createTime = new Date(item.created_at);
        }
        // 숫자인 경우 (Excel 날짜)
        else if (item.create_time && typeof item.create_time === 'number') {
          createTime = this.convertExcelDate(item.create_time);
        }
        
        // 유효한 날짜인지 확인
        if (!createTime || isNaN(createTime.getTime())) {
          return;
        }
        
        // 한국 시간 기준
        const hours = createTime.getHours();
        
        // 시간대 결정 
        let timeSlot;
        if (hours >= 9 && hours < 18) {
          // 09:00-18:00: 1시간 단위
          timeSlot = `${String(hours).padStart(2, '0')}:00 - ${String(hours + 1).padStart(2, '0')}:00`;
        } else {
          // 18:00-09:00: 하나의 단위
          timeSlot = '18:00 - 09:00';
        }
        
        // 해당 시간대 카운트 증가
        if (timeSlots.hasOwnProperty(timeSlot)) {
          timeSlots[timeSlot]++;
          totalCount++;
          processedCount++;
        }
        
        // 디버깅: 처음 5개 항목 로깅
        if (index < 5) {
          console.log(`항목 ${index+1}: create_time=${item.create_time}, 변환된 시간=${createTime}, 시간대=${timeSlot}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`항목 처리 중 오류 발생:`, error);
      }
    });
    
    console.log(`처리된 항목 수: ${processedCount}, 오류 발생 항목 수: ${errorCount}`);
    
    // 결과 형식 변환 (카운트가 있는 시간대만)
    const result = Object.entries(timeSlots)
      .filter(([_, count]) => count > 0)
      .map(([timeSlot, count]) => {
        return {
          label: timeSlot,
          count,
          percentage: totalCount > 0 ? (count / totalCount * 100).toFixed(1) + '%' : '0.0%'
        };
      });
    
    return result;
  }
  
  /**
   * 부서별 배송 상태 데이터 처리
   */
  processDepartmentStatusData(filters) {
    // 데이터 필터링
    const filteredData = this.filterData(filters);
    
    // 전체 부서 카운트 보관용 객체
    const allDeptData = {
      'CS': { total: 0 },
      'HES': { total: 0 },
      'LENOVO': { total: 0 }
    };
    
    // 상태별 카운트 데이터 객체
    const statusData = {
      'CS': {},
      'HES': {},
      'LENOVO': {}
    };
    
    // 실제 존재하는 상태 유형 (ASSIGNED 제외)
    const statusTypes = ['PENDING', 'IN_PROGRESS', 'COMPLETE', 'ISSUE', 'CANCEL'];
    
    // 상태 초기화
    statusTypes.forEach(status => {
      statusData['CS'][status] = 0;
      statusData['HES'][status] = 0;
      statusData['LENOVO'][status] = 0;
    });
    
    // 데이터 집계
    filteredData.forEach(item => {
      const dept = item.department;
      const status = item.delivery_status;
      
      if (dept && statusTypes.includes(status)) {
        if (dept === 'CS' || dept === 'HES' || dept === 'LENOVO') {
          statusData[dept][status]++;
          allDeptData[dept].total++;
        }
      }
    });
    
    return {
      allDeptData,
      statusData
    };
  }
  
  /**
   * 시간대별 차트 업데이트
   */
  updateTimeChart() {
    // 기존 차트가 있으면 파괴
    if (this.currentChart) {
      this.currentChart.destroy();
    }
    
    // 차트 데이터 준비
    const chartData = this.processedData;
    const labels = chartData.map(item => item.label);
    const data = chartData.map(item => item.count);
    
    // 부서 필터에 따른 배경색 설정
    const department = this.elements.departmentFilter.value;
    let backgroundColor;
    
    switch (department) {
      case 'CS':
        backgroundColor = 'rgba(54, 162, 235, 0.6)'; // 파란색
        break;
      case 'HES':
        backgroundColor = 'rgba(255, 159, 64, 0.6)'; // 주황색
        break;
      case 'LENOVO':
        backgroundColor = 'rgba(153, 102, 255, 0.6)'; // 보라색
        break;
      default:
        backgroundColor = 'rgba(75, 192, 192, 0.6)'; // 청록색
    }
    
    // 새 차트 생성
    const ctx = this.elements.chartCanvas.getContext('2d');
    this.currentChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: '주문 건수',
          data: data,
          backgroundColor: backgroundColor,
          borderColor: backgroundColor.replace('0.6', '1'),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: '시간대별 주문 접수 건수 (생성 일자 기준)'
          },
          tooltip: {
            callbacks: {
              afterLabel: function(context) {
                const percentage = context.dataset.data[context.dataIndex] / data.reduce((a, b) => a + b, 0) * 100;
                return `비율: ${percentage.toFixed(1)}%`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '주문 건수'
            }
          },
          x: {
            title: {
              display: true,
              text: '시간대'
            }
          }
        }
      }
    });
  }
  
  /**
   * 부서별 배송 상태 차트 업데이트
   */
  updateDepartmentStatusCharts() {
    // 기존 차트 파괴
    Object.keys(this.departmentCharts).forEach(key => {
      if (this.departmentCharts[key]) {
        this.departmentCharts[key].destroy();
        this.departmentCharts[key] = null;
      }
    });
    
    const { statusData } = this.processedData;
    
    // 상태별 색상 매핑
    const statusColors = {
      'PENDING': 'rgba(255, 205, 86, 0.6)', // 노란색
      'IN_PROGRESS': 'rgba(0, 123, 255, 0.6)', // 진한 파란색
      'COMPLETE': 'rgba(75, 192, 192, 0.6)', // 녹색
      'ISSUE': 'rgba(255, 99, 132, 0.6)', // 빨간색
      'CANCEL': 'rgba(201, 203, 207, 0.6)' // 회색
    };
    
    const statusLabels = {
      'PENDING': '대기',
      'IN_PROGRESS': '진행',
      'COMPLETE': '완료',
      'ISSUE': '이슈',
      'CANCEL': '취소'
    };
    
    // 부서별 차트 생성 함수
    const createDeptChart = (canvasId, deptName, statusCounts) => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return null;
      
      const ctx = canvas.getContext('2d');
      
      // 차트 데이터 준비
      const labels = [];
      const data = [];
      const backgroundColor = [];
      
      // 상태별로 데이터 추가 (0이 아닌 상태만)
      Object.entries(statusCounts).forEach(([status, count]) => {
        if (count > 0) {
          labels.push(statusLabels[status] || status);
          data.push(count);
          backgroundColor.push(statusColors[status] || 'rgba(153, 102, 255, 0.6)');
        }
      });
      
      // 데이터가 없으면 "데이터 없음" 표시
      if (data.length === 0) {
        labels.push('데이터 없음');
        data.push(1);
        backgroundColor.push('rgba(200, 200, 200, 0.6)');
      }
      
      return new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: backgroundColor,
            borderColor: backgroundColor.map(color => color.replace('0.6', '1')),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                font: {
                  size: 11
                }
              }
            },
            title: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${value}건 (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    };
    
    // 각 부서 차트 생성
    this.departmentCharts.cs = createDeptChart('csChart', 'CS', statusData['CS']);
    this.departmentCharts.hes = createDeptChart('hesChart', 'HES', statusData['HES']);
    this.departmentCharts.lenovo = createDeptChart('lenovoChart', 'LENOVO', statusData['LENOVO']);
    
    // 전체 부서 비교 차트 생성
    const allDeptCanvas = document.getElementById('allDeptChart');
    if (allDeptCanvas) {
      const allDeptCtx = allDeptCanvas.getContext('2d');
      
      // 각 부서의 총 건수 계산
      const csTotalCount = Object.values(statusData['CS']).reduce((sum, count) => sum + count, 0);
      const hesTotalCount = Object.values(statusData['HES']).reduce((sum, count) => sum + count, 0);
      const lenovoTotalCount = Object.values(statusData['LENOVO']).reduce((sum, count) => sum + count, 0);
      
      this.departmentCharts.all = new Chart(allDeptCtx, {
        type: 'doughnut',
        data: {
          labels: ['CS', 'HES', 'LENOVO'],
          datasets: [{
            data: [csTotalCount, hesTotalCount, lenovoTotalCount],
            backgroundColor: [
              'rgba(54, 162, 235, 0.6)', // CS - 파란색
              'rgba(255, 159, 64, 0.6)', // HES - 주황색
              'rgba(153, 102, 255, 0.6)'  // LENOVO - 보라색
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(255, 159, 64, 1)',
              'rgba(153, 102, 255, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            },
            title: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                  return `${label}: ${value}건 (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }
  }
}

// 시각화 페이지 인스턴스
const visualizationPage = new VisualizationPage();
