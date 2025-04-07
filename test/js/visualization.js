/**
 * 시각화 페이지 모듈
 */
const VisualizationPage = {
  // 차트 객체 저장
  charts: {
    mainChart: null,
    csChart: null,
    hesChart: null,
    lenovoChart: null,
    allDeptChart: null
  },
  
  // 페이지 상태 관리
  state: {
    startDate: '',
    endDate: '',
    chartType: 'time',
    department: '',
    filteredData: []
  },
  
  /**
   * 페이지 초기화
   */
  init: function() {
    console.log('시각화 페이지 초기화...');
    
    // 날짜 필터 초기화
    this.initDateFilter();
    
    // 이벤트 리스너 등록
    this.registerEventListeners();
    
    // 데이터 로드되었는지 확인
    if (TMS.store.isDataLoaded) {
      console.log('데이터가 이미 로드되어 있습니다.');
      this.logDataStats();
    } else {
      console.log('데이터 로드 대기 중...');
      // 데이터 로드 대기
      document.addEventListener('tms:dataLoaded', () => {
        console.log('데이터 로드 이벤트 수신');
        this.logDataStats();
      });
    }
    
    // 데이터 변경 이벤트 리스닝
    document.addEventListener('tms:dashboardDataChanged', () => {
      console.log('대시보드 데이터 변경 이벤트 수신');
      this.logDataStats();
    });
  },
  
  /**
   * 데이터 통계 로깅
   */
  logDataStats: function() {
    if (!TMS.store.dashboardData) {
      console.log('대시보드 데이터가 없습니다.');
      return;
    }
    
    console.log(`대시보드 데이터: ${TMS.store.dashboardData.length}건`);
    
    // 시각화 유형 자동 선택 방지를 위해 자동 초기화하지 않음
    // 사용자가 직접 시각화 유형부터 선택하도록 안내
  },
  
  /**
   * 이벤트 리스너 등록
   */
  registerEventListeners: function() {
    // 필터 관련 이벤트
    document.getElementById('vizChartType').addEventListener('change', (e) => {
      const selectedType = e.target.value;
      
      // 유형이 선택되었을 때만 필터 단계 표시
      if (selectedType) {
        this.handleChartTypeChange(e);
        this.showFilterStep(selectedType);
      } else {
        // 유형 미선택 시 필터 숨김
        document.getElementById('filterStep').style.display = 'none';
        // 차트 숨김 및 안내 메시지 표시
        document.getElementById('chartContainerWrapper').style.display = 'none';
        document.getElementById('chartPlaceholder').style.display = 'flex';
      }
    });
    
    // 부서 필터 변경
    document.getElementById('vizDepartmentFilter').addEventListener('change', this.handleDepartmentChange.bind(this));
    
    // 보기 버튼 클릭
    document.getElementById('applyVizFilterBtn').addEventListener('click', this.applyFilters.bind(this));
    
    // 날짜 필터
    document.getElementById('vizStartDate').addEventListener('change', this.handleDateChange.bind(this));
    document.getElementById('vizEndDate').addEventListener('change', this.handleDateChange.bind(this));
  },
  
  /**
   * 필터 단계 표시 및 설정
   */
  showFilterStep: function(chartType) {
    // 필터 단계 표시
    document.getElementById('filterStep').style.display = 'block';
    
    // 차트 유형에 따른 날짜 필터 타이틀 변경
    const dateFilterTitle = document.getElementById('dateFilterTitle');
    if (chartType === 'time') {
      dateFilterTitle.textContent = '기간 (접수일 기준)';
    } else if (chartType === 'dept-status') {
      dateFilterTitle.textContent = '기간 (ETA 기준)';
    }
    
    // 차트 숨김 및 안내 메시지 표시 (보기 버튼 클릭 전까지)
    document.getElementById('chartContainerWrapper').style.display = 'none';
    document.getElementById('chartPlaceholder').style.display = 'flex';
  },
  
  /**
   * 날짜 필터 초기화
   */
  initDateFilter: function() {
    const today = new Date();
    const endDateStr = dateUtils.formatDate(today);
    
    // 30일 전
    const startDate = new Date();
    startDate.setDate(today.getDate() - 30);
    const startDateStr = dateUtils.formatDate(startDate);
    
    // 초기값 설정
    document.getElementById('vizStartDate').value = startDateStr;
    document.getElementById('vizEndDate').value = endDateStr;
    
    // 상태 업데이트
    this.state.startDate = startDateStr;
    this.state.endDate = endDateStr;
  },
  
  /**
   * 차트 업데이트
   */
  updateCharts: function() {
    // 데이터 필터링
    this.filterData();
    
    // 디버그 로깅
    console.log(`차트 업데이트: ${this.state.chartType}, 필터링된 데이터: ${this.state.filteredData.length}건`);
    
    // 차트 타입에 따른 렌더링
    if (this.state.chartType === 'time') {
      this.renderTimeChart();
      document.getElementById('mainChartContainer').style.display = 'block';
      document.getElementById('departmentChartsContainer').style.display = 'none';
    } else if (this.state.chartType === 'dept-status') {
      this.renderDeptStatusCharts();
      document.getElementById('mainChartContainer').style.display = 'none';
      document.getElementById('departmentChartsContainer').style.display = 'block';
    }
  },
  
  /**
   * 데이터 필터링
   */
  filterData: function() {
    console.log('데이터 필터링 시작...');
    
    if (!TMS.store.dashboardData) {
      console.log('대시보드 데이터가 없습니다.');
      this.state.filteredData = [];
      return;
    }
    
    console.log(`필터링 전 전체 데이터: ${TMS.store.dashboardData.length}건`);
    
    // 원본 데이터 복사
    let filteredData = [...TMS.store.dashboardData];
    
    // 날짜 필터 적용 (차트 유형에 따라 다른 날짜 필드 사용)
    if (this.state.startDate && this.state.endDate) {
      console.log(`날짜 필터: ${this.state.startDate} ~ ${this.state.endDate}`);
      const startDate = new Date(this.state.startDate);
      const endDate = new Date(this.state.endDate);
      endDate.setHours(23, 59, 59, 999); // 종료일 끝까지 포함
      
      // 날짜 필드 샘플 확인
      const sampleItem = filteredData[0];
      if (sampleItem) {
        console.log('샘플 아이템 날짜 필드:', {
          create_time: sampleItem.create_time,
          eta: sampleItem.eta
        });
      }
      
      filteredData = filteredData.filter(item => {
        if (this.state.chartType === 'time') {
          // 시간대별 차트는 create_time 기준
          const createTime = item.create_time;
          if (!createTime) {
            return false;
          }
          
          const createDate = new Date(createTime);
          const result = createDate >= startDate && createDate <= endDate;
          return result;
        } else {
          // 부서별 차트는 eta 기준
          const eta = item.eta;
          if (!eta) {
            return false;
          }
          
          const etaDate = new Date(eta);
          const result = etaDate >= startDate && etaDate <= endDate;
          return result;
        }
      });
      
      console.log(`날짜 필터 후 데이터: ${filteredData.length}건`);
    }
    
    // 부서 필터 적용
    if (this.state.department) {
      console.log(`부서 필터: ${this.state.department}`);
      
      // 부서 필드 값 확인
      const departments = new Set(filteredData.map(item => item.department));
      console.log('데이터에 존재하는 부서:', [...departments]);
      
      filteredData = filteredData.filter(item => item.department === this.state.department);
      console.log(`부서 필터 후 데이터: ${filteredData.length}건`);
    }
    
    this.state.filteredData = filteredData;
    console.log(`최종 필터링된 데이터: ${this.state.filteredData.length}건`);
  },
  
  /**
   * 시간대별 차트 렌더링
   */
  renderTimeChart: function() {
    console.log('시간대별 차트 렌더링 시작...');
    
    const ctx = document.getElementById('orderTimeChart').getContext('2d');
    
    // 데이터가 없는 경우
    if (this.state.filteredData.length === 0) {
      console.log('시간대별 차트: 데이터가 없습니다.');
      
      if (this.charts.mainChart) {
        this.charts.mainChart.destroy();
      }
      
      // 빈 차트 표시
      this.charts.mainChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['데이터 없음'],
          datasets: [{
            label: '주문 건수',
            data: [0],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: '시간대별 주문 접수 현황 (데이터 없음)'
            }
          }
        }
      });
      
      return;
    }
    
    // 시간대 구분 (요구사항에 맞춰 조정)
    // 9시~18시: 1시간 단위, 18시~20시, 20시~00시, 00시~9시: 각각 하나의 단위
    const timeSlots = [
      '00시~09시', 
      '09시~10시', '10시~11시', '11시~12시', '12시~13시', '13시~14시', 
      '14시~15시', '15시~16시', '16시~17시', '17시~18시', 
      '18시~20시', '20시~00시'
    ];
    
    // 각 시간대별 데이터 집계
    const timeData = Array(timeSlots.length).fill(0);
    
    console.log(`시간대별 집계 시작 (데이터 ${this.state.filteredData.length}건)`);
    
    // create_time 필드가 있는지 확인
    const hasCreateTime = this.state.filteredData.some(item => item.create_time);
    console.log(`create_time 필드 존재 여부: ${hasCreateTime}`);
    
    if (!hasCreateTime) {
      console.log('create_time 샘플:', this.state.filteredData.slice(0, 3).map(item => ({
        order_no: item.order_no,
        create_time: item.create_time
      })));
    }
    
    this.state.filteredData.forEach(item => {
      if (!item.create_time) {
        console.log(`create_time이 없는 항목 건너뜀:`, item.order_no);
        return;
      }
      
      try {
        const createDate = new Date(item.create_time);
        
        if (isNaN(createDate.getTime())) {
          console.log(`날짜 변환 실패: ${item.create_time}`);
          return;
        }
        
        const hour = createDate.getHours();
        
        // 시간대 인덱스 계산
        let slotIndex;
        if (hour >= 0 && hour < 9) {
          slotIndex = 0; // 00시~09시
        } else if (hour >= 9 && hour < 18) {
          slotIndex = hour - 8; // 09시~18시 (1시간 단위)
        } else if (hour >= 18 && hour < 20) {
          slotIndex = 10; // 18시~20시
        } else {
          slotIndex = 11; // 20시~00시
        }
        
        timeData[slotIndex]++;
      } catch (error) {
        console.warn('날짜 파싱 오류:', error);
      }
    });
    
    console.log('시간대별 데이터 집계 결과:', timeData);
    
    // 차트 업데이트 또는 생성
    if (this.charts.mainChart) {
      this.charts.mainChart.destroy();
    }
    
    this.charts.mainChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: timeSlots,
        datasets: [{
          label: '주문 건수',
          data: timeData,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: '시간대별 주문 접수 현황'
          },
          legend: {
            position: 'top',
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '주문 건수'
            },
            ticks: {
              stepSize: 1
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
    
    console.log('시간대별 차트 렌더링 완료');
  },
  
  /**
   * 부서별 상태 차트 렌더링
   */
  renderDeptStatusCharts: function() {
    console.log("렌더링 부서별 상태 차트 - 데이터 건수:", this.state.filteredData.length);
    
    // 부서별 데이터 분류
    const deptData = {
      CS: this.state.filteredData.filter(item => item.department === 'CS'),
      HES: this.state.filteredData.filter(item => item.department === 'HES'),
      LENOVO: this.state.filteredData.filter(item => item.department === 'LENOVO')
    };
    
    console.log("부서별 데이터 건수:", {
      CS: deptData.CS.length,
      HES: deptData.HES.length,
      LENOVO: deptData.LENOVO.length
    });
    
    // 차트 색상
    const chartColors = {
      'PENDING': 'rgba(255, 193, 7, 0.7)',
      'IN_PROGRESS': 'rgba(0, 123, 255, 0.7)',
      'ASSIGNED': 'rgba(13, 110, 253, 0.7)',
      'COMPLETE': 'rgba(40, 167, 69, 0.7)',
      'ISSUE': 'rgba(220, 53, 69, 0.7)',
      'CANCEL': 'rgba(108, 117, 125, 0.7)'
    };
    
    // 상태 라벨
    const statusLabels = {
      'PENDING': '대기',
      'IN_PROGRESS': '진행',
      'ASSIGNED': '배정',
      'COMPLETE': '완료',
      'ISSUE': '이슈',
      'CANCEL': '취소'
    };
    
    // 부서 필터가 적용된 경우 해당 부서 차트만 표시
    if (this.state.department === 'CS') {
      this.renderDeptStatusChart('csChart', 'CS 부서 배송 상태', deptData.CS, chartColors, statusLabels);
      document.getElementById('hesChart').parentElement.parentElement.style.display = 'none';
      document.getElementById('lenovoChart').parentElement.parentElement.style.display = 'none';
      document.getElementById('allDeptChart').parentElement.parentElement.style.display = 'none';
      document.getElementById('csChart').parentElement.parentElement.style.display = 'block';
    } else if (this.state.department === 'HES') {
      this.renderDeptStatusChart('hesChart', 'HES 부서 배송 상태', deptData.HES, chartColors, statusLabels);
      document.getElementById('csChart').parentElement.parentElement.style.display = 'none';
      document.getElementById('lenovoChart').parentElement.parentElement.style.display = 'none';
      document.getElementById('allDeptChart').parentElement.parentElement.style.display = 'none';
      document.getElementById('hesChart').parentElement.parentElement.style.display = 'block';
    } else if (this.state.department === 'LENOVO') {
      this.renderDeptStatusChart('lenovoChart', 'LENOVO 부서 배송 상태', deptData.LENOVO, chartColors, statusLabels);
      document.getElementById('csChart').parentElement.parentElement.style.display = 'none';
      document.getElementById('hesChart').parentElement.parentElement.style.display = 'none';
      document.getElementById('allDeptChart').parentElement.parentElement.style.display = 'none';
      document.getElementById('lenovoChart').parentElement.parentElement.style.display = 'block';
    } else {
      // 전체 부서 표시
      this.renderDeptStatusChart('csChart', 'CS 부서 배송 상태', deptData.CS, chartColors, statusLabels);
      this.renderDeptStatusChart('hesChart', 'HES 부서 배송 상태', deptData.HES, chartColors, statusLabels);
      this.renderDeptStatusChart('lenovoChart', 'LENOVO 부서 배송 상태', deptData.LENOVO, chartColors, statusLabels);
      this.renderAllDeptChart(deptData, chartColors, statusLabels);
      
      document.getElementById('csChart').parentElement.parentElement.style.display = 'block';
      document.getElementById('hesChart').parentElement.parentElement.style.display = 'block';
      document.getElementById('lenovoChart').parentElement.parentElement.style.display = 'block';
      document.getElementById('allDeptChart').parentElement.parentElement.style.display = 'block';
    }
  },
  
  /**
   * 부서별 상태 차트 렌더링 (각 부서)
   */
  renderDeptStatusChart: function(chartId, title, data, chartColors, statusLabels) {
    const ctx = document.getElementById(chartId).getContext('2d');
    
    // 데이터가 없는 경우
    if (data.length === 0) {
      if (this.charts[chartId]) {
        this.charts[chartId].destroy();
      }
      
      this.charts[chartId] = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['데이터 없음'],
          datasets: [{
            data: [1],
            backgroundColor: ['#f5f5f5'],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: `${title} (데이터 없음)`
            },
            legend: {
              position: 'right',
            }
          }
        }
      });
      
      return;
    }
    
    // 부서 데이터 집계
    const statusCounts = this.countByStatus(data);
    
    // 차트 데이터 준비
    const labels = Object.keys(statusCounts).map(key => statusLabels[key] || key);
    const dataset = {
      label: '건수',
      data: Object.values(statusCounts),
      backgroundColor: Object.keys(statusCounts).map(key => chartColors[key] || 'rgba(108, 117, 125, 0.7)'),
      borderWidth: 1
    };
    
    // 차트 업데이트 또는 생성
    if (this.charts[chartId]) {
      this.charts[chartId].destroy();
    }
    
    this.charts[chartId] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [dataset]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title
          },
          legend: {
            position: 'right',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value}건 (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  },
  
  /**
   * 전체 부서 비교 차트 렌더링
   */
  renderAllDeptChart: function(deptData, chartColors, statusLabels) {
    const ctx = document.getElementById('allDeptChart').getContext('2d');
    
    // 부서별 완료율 계산
    const deptCompletionRates = {};
    
    Object.keys(deptData).forEach(dept => {
      const total = deptData[dept].length;
      const completed = deptData[dept].filter(item => item.status === 'COMPLETE').length;
      deptCompletionRates[dept] = total > 0 ? (completed / total) * 100 : 0;
    });
    
    // 차트 업데이트 또는 생성
    if (this.charts.allDeptChart) {
      this.charts.allDeptChart.destroy();
    }
    
    this.charts.allDeptChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(deptCompletionRates),
        datasets: [{
          label: '완료율 (%)',
          data: Object.values(deptCompletionRates),
          backgroundColor: 'rgba(40, 167, 69, 0.7)',
          borderColor: 'rgba(40, 167, 69, 1)',
          borderWidth: 1
        }, {
          label: '총 건수',
          data: Object.keys(deptData).map(dept => deptData[dept].length),
          backgroundColor: 'rgba(13, 110, 253, 0.7)',
          borderColor: 'rgba(13, 110, 253, 1)',
          borderWidth: 1,
          hidden: false
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: '부서별 배송 통계'
          },
          legend: {
            position: 'top',
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '값'
            }
          }
        }
      }
    });
  },
  
  /**
   * 차트 타입 변경 처리
   */
  handleChartTypeChange: function(e) {
    const newChartType = e.target.value;
    
    // 이전 차트 타입과 다른 경우에만 리셋 처리
    if (this.state.chartType !== newChartType) {
      // 필터 상태 초기화 (날짜는 유지)
      this.state.department = '';
      document.getElementById('vizDepartmentFilter').value = '';
      
      // 차트 컨테이너 숨김
      document.getElementById('chartContainerWrapper').style.display = 'none';
      document.getElementById('chartPlaceholder').style.display = 'flex';
      
      // 차트 객체 리셋
      this.resetCharts();
    }
    
    this.state.chartType = newChartType;
    
    // 차트 타입에 맞게 날짜 필터 라벨 변경
    const dateFilterTitle = document.getElementById('dateFilterTitle');
    if (this.state.chartType === 'time') {
      dateFilterTitle.textContent = '기간 (접수일 기준)';
    } else if (this.state.chartType === 'dept-status') {
      dateFilterTitle.textContent = '기간 (ETA 기준)';
    }
  },
  
  /**
   * 차트 객체 리셋
   */
  resetCharts: function() {
    // 모든 차트 객체 파괴
    Object.keys(this.charts).forEach(key => {
      if (this.charts[key]) {
        this.charts[key].destroy();
        this.charts[key] = null;
      }
    });
  },
  
  /**
   * 부서 변경 처리
   */
  handleDepartmentChange: function(e) {
    this.state.department = e.target.value;
  },
  
  /**
   * 날짜 변경 처리
   */
  handleDateChange: function() {
    const startDate = document.getElementById('vizStartDate').value;
    const endDate = document.getElementById('vizEndDate').value;
    
    console.log(`날짜 변경: ${startDate} ~ ${endDate}`);
    
    // 상태 업데이트
    this.state.startDate = startDate;
    this.state.endDate = endDate;
  },
  
  /**
   * 필터 적용 처리
   */
  applyFilters: function() {
    this.updateCharts();
    messageUtils.success('필터가 적용되었습니다.');
  },
  
  /**
   * 필터 적용 처리
   */
  applyFilters: function() {
    // 유형 선택 확인
    if (!this.state.chartType) {
      messageUtils.warning('시각화 유형을 선택해주세요.');
      return;
    }
    
    // 필수 입력 검증
    if (!this.state.startDate || !this.state.endDate) {
      messageUtils.warning('시작일과 종료일을 모두 입력해주세요.');
      return;
    }
    
    // 데이터 샘플 확인
    console.log("대시보드 데이터 샘플:", TMS.store.dashboardData.slice(0, 2));
    
    // 날짜 형식 변환 문제 해결을 위한 임시 데이터 처리
    if (TMS.store.dashboardData) {
      // create_time 필드 형식 수정 (일부 데이터에서 공백 대신 T 사용)
      TMS.store.dashboardData.forEach(item => {
        if (item.create_time && item.create_time.includes(' ')) {
          // 공백을 T로 변환하여 ISO 형식으로 표준화
          item.create_time = item.create_time.replace(' ', 'T');
        }
      });
      
      console.log("데이터 표준화 후 샘플:", TMS.store.dashboardData.slice(0, 2).map(item => ({
        order_no: item.order_no,
        create_time: item.create_time,
        eta: item.eta
      })));
    }
    
    // 차트 컨테이너 표시 및 안내 메시지 숨김
    document.getElementById('chartContainerWrapper').style.display = 'block';
    document.getElementById('chartPlaceholder').style.display = 'none';
    
    // 차트 업데이트
    this.updateCharts();
    
    // 디버그 정보 로깅 (차트 업데이트 후)
    this.logDebugInfo();
    
    messageUtils.success('차트가 업데이트되었습니다.');
  },
  
  /**
   * 상태별 카운트 계산 함수
   */
  countByStatus: function(data) {
    // 모든 가능한 상태 초기화
    const counts = {
      'PENDING': 0,
      'IN_PROGRESS': 0,
      'ASSIGNED': 0,
      'COMPLETE': 0,
      'ISSUE': 0,
      'CANCEL': 0
    };
    
    // 데이터가 없으면 빈 counts 객체 반환
    if (!data || data.length === 0) {
      return counts;
    }
    
    // status 필드가 없는 경우 delivery_status 사용
    data.forEach(item => {
      const status = item.status || item.delivery_status || 'PENDING';
      
      if (status in counts) {
        counts[status]++;
      } else {
        // 알 수 없는 상태 처리
        console.warn(`알 수 없는 상태: ${status}`);
      }
    });
    
    // 값이 0인 상태는 제거하여 차트에 표시되지 않도록 함
    return Object.fromEntries(
      Object.entries(counts).filter(([_, count]) => count > 0)
    );
  },
  
  /**
   * 데이터 디버그 로그 출력
   */
  logDebugInfo: function() {
    // 전체 데이터 건수
    console.log("전체 데이터 건수:", TMS.store.dashboardData ? TMS.store.dashboardData.length : 0);
    
    // 필터링된 데이터 건수
    console.log("필터링된 데이터 건수:", this.state.filteredData.length);
    
    // 필터 상태
    console.log("필터 상태:", {
      chartType: this.state.chartType,
      startDate: this.state.startDate,
      endDate: this.state.endDate,
      department: this.state.department
    });
    
    // 샘플 데이터 (최대 3건)
    console.log("샘플 데이터:", this.state.filteredData.slice(0, 3));
  }
};

// 전역 객체에 페이지 모듈 할당
window.VisualizationPage = VisualizationPage;

// DOM이 로드되면 확인을 위한 기본 초기화 코드
document.addEventListener('DOMContentLoaded', function() {
  // TMS 애플리케이션에서 자동으로 페이지 초기화를 수행합니다.
});
