/**
 * 시각화 페이지 관련 기능
 */

class VisualizationPage {
  constructor() {
    // 상태 초기화
    this.currentChart = null;
    this.dashboardData = [];
    this.processedData = [];
    
    // 요소
    this.elements = {
      startDate: document.getElementById('vizStartDate'),
      endDate: document.getElementById('vizEndDate'),
      dateRangeLabel: document.getElementById('vizDateRangeLabel'),
      departmentFilter: document.getElementById('vizDepartmentFilter'),
      applyFilterBtn: document.getElementById('applyVizFilterBtn'),
      refreshBtn: document.getElementById('refreshVisualizationBtn'),
      chartCanvas: document.getElementById('orderTimeChart'),
      summaryTableBody: document.getElementById('summaryTableBody')
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
      
      console.log(`데이터 ${index+1}: create_time=${item.create_time}, 타입=${type}`);
    });
    
    console.log('create_time 필드 타입 분포:', createTimeTypes);
    console.log('create_time 필드 타입별 샘플:', createTimeSamples);
    
    // 부서 필드 분석
    const departments = {};
    this.dashboardData.forEach(item => {
      departments[item.department] = (departments[item.department] || 0) + 1;
    });
    
    console.log('부서별 데이터 분포:', departments);
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
    
    // 데이터 필터링 및 처리
    this.processedData = this.processData(filters);
    
    // 차트 업데이트
    this.updateChart();
    
    // 요약 테이블 업데이트
    this.updateSummaryTable();
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
   * 데이터 처리 - 시간대별 집계
   */
  processData(filters) {
    // 필터링된 데이터
    let filteredData = [...this.dashboardData];
    
    // 날짜 필터링
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      console.log(`날짜 범위 필터: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);
      
      filteredData = filteredData.filter(item => {
        if (!item.create_time) return false;
        
        let createTime;
        
        // 숫자 형식인 경우 (Excel 날짜)
        if (typeof item.create_time === 'number') {
          createTime = this.convertExcelDate(item.create_time);
        } 
        // 문자열인 경우
        else if (typeof item.create_time === 'string') {
          createTime = new Date(item.create_time);
        }
        // 날짜 객체인 경우
        else if (item.create_time instanceof Date) {
          createTime = item.create_time;
        }
        // 기타 경우는 필터링에서 제외
        else {
          return false;
        }
        
        // 유효한 날짜인지 확인
        if (!createTime || isNaN(createTime.getTime())) {
          return false;
        }
        
        return createTime >= startDate && createTime <= endDate;
      });
      
      console.log(`필터링 후 데이터 수: ${filteredData.length}`);
    }
    
    // 부서 필터링
    if (filters.department) {
      filteredData = filteredData.filter(item => item.department === filters.department);
      console.log(`부서 필터링 후 데이터 수: ${filteredData.length}`);
    }
    
    // 시간대별 집계
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
        if (!item.create_time) return;
        
        let createTime;
        
        // 숫자 형식인 경우 (Excel 날짜)
        if (typeof item.create_time === 'number') {
          createTime = this.convertExcelDate(item.create_time);
        } 
        // 문자열인 경우
        else if (typeof item.create_time === 'string') {
          createTime = new Date(item.create_time);
        }
        // 날짜 객체인 경우
        else if (item.create_time instanceof Date) {
          createTime = item.create_time;
        }
        // 기타 경우는 건너뛰기
        else {
          return;
        }
        
        // 유효한 날짜인지 확인
        if (!createTime || isNaN(createTime.getTime())) {
          return;
        }
        
        const hours = createTime.getHours();
        const minutes = createTime.getMinutes();
        
        // 시간을 문자열로 변환 (hh:mm 형식)
        const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        
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
    
    // 결과 형식 변환
    const result = Object.entries(timeSlots).map(([timeSlot, count]) => {
      return {
        timeSlot,
        count,
        percentage: totalCount > 0 ? (count / totalCount * 100).toFixed(1) + '%' : '0.0%'
      };
    });
    
    // 총계 추가
    result.push({
      timeSlot: '총계',
      count: totalCount,
      percentage: '100.0%'
    });
    
    return result;
  }
  
  /**
   * 차트 업데이트
   */
  updateChart() {
    // 차트 데이터 준비
    const chartData = this.processedData.filter(item => item.timeSlot !== '총계');
    const labels = chartData.map(item => item.timeSlot);
    const data = chartData.map(item => item.count);
    
    // 데이터 로깅
    console.log('차트 데이터 생성:');
    console.table(chartData);
    
    // 기존 차트가 있으면 파괴
    if (this.currentChart) {
      this.currentChart.destroy();
    }
    
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
            text: '시간대별 주문 접수 건수'
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
   * 요약 테이블 업데이트
   */
  updateSummaryTable() {
    const tableBody = this.elements.summaryTableBody;
    tableBody.innerHTML = '';
    
    this.processedData.forEach(item => {
      const row = document.createElement('tr');
      
      // 총계 행에 특별한 스타일 적용
      if (item.timeSlot === '총계') {
        row.className = 'total-row';
      }
      
      row.innerHTML = `
        <td>${item.timeSlot}</td>
        <td>${item.count}</td>
        <td>${item.percentage}</td>
      `;
      
      tableBody.appendChild(row);
    });
  }
}

// 시각화 페이지 인스턴스
const visualizationPage = new VisualizationPage();
