/**
 * 시각화 페이지 모듈
 */
const VisualizationPage = {
  // 차트 객체 저장
  charts: {
    mainChart: null,
    csChartCanvas: null,
    hesChartCanvas: null,
    lenovoChartCanvas: null,
    allDeptChartCanvas: null,
  },

  // 페이지 상태 관리
  state: {
    startDate: '',
    endDate: '',
    chartType: '',
    department: '',
    filteredData: [],
  },

  /**
   * 페이지 초기화
   */
  init: function () {
    console.log('시각화 페이지 초기화...');

    // 날짜 필터 초기화 - 현재 날짜 기준 지난 주 데이터
    this.initLastWeekDateFilter();

    // 이벤트 리스너 등록
    this.registerEventListeners();

    // 필터 레이아웃 개선 - 모든 필터를 한 줄에 배치
    this.optimizeFilterLayout();

    // 페이지 접근 시 시간별 접수량을 기본으로 자동 선택 및 차트 표시
    setTimeout(() => {
      document.getElementById('vizChartType').value = 'time';
      this.handleChartTypeChange({ target: { value: 'time' } });
      this.showFilterStep('time');
      this.applyFilters();
    }, 500);
    
    // 데이터 로드되었는지 확인
    if (DataManager.isDataLoaded()) {
      console.log('데이터가 이미 로드되어 있습니다.');
      this.logDataStats();
    } else {
      console.log('데이터 로드 대기 중...');
      // 데이터 로드 대기
      document.addEventListener('data:loaded', () => {
        console.log('데이터 로드 이벤트 수신');
        this.logDataStats();
      });
    }

    // 데이터 변경 이벤트 리스닝
    document.addEventListener('data:dashboardChanged', () => {
      console.log('대시보드 데이터 변경 이벤트 수신');
      this.logDataStats();
    });

    // 차트 로딩 인디케이터 추가
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach((container) => {
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'chart-loading';
      loadingDiv.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>차트를 불러오는 중...</span>
      `;
      loadingDiv.style.display = 'none';
      container.appendChild(loadingDiv);
    });
  },
  
  /**
   * 필터 레이아웃 최적화 - 모든 필터를 한 줄에 배치
   */
  optimizeFilterLayout: function() {
    // 필터 영역 컨테이너를 찾아 스타일 변경
    const filterStep = document.getElementById('filterStep');
    if (filterStep) {
      filterStep.style.display = 'flex';
      filterStep.style.flexDirection = 'row';
      filterStep.style.alignItems = 'center';
      filterStep.style.flexWrap = 'wrap';
      filterStep.style.gap = '20px';
      filterStep.style.marginBottom = '20px';
      
      // 필터 항목들을 가로 정렬로 변경
      const filterItems = filterStep.querySelectorAll('.filter-item');
      filterItems.forEach(item => {
        item.style.marginBottom = '0';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '10px';
      });
      
      // 적용 버튼 위치 조정
      const applyBtn = document.getElementById('applyVizFilterBtn');
      if (applyBtn) {
        applyBtn.style.marginLeft = 'auto';
      }
    }
  },

  /**
   * 데이터 통계 로깅
   */
  logDataStats: function () {
    const dashboardData = DataManager.getDashboardData();
    if (!dashboardData || dashboardData.length === 0) {
      console.log('대시보드 데이터가 없습니다.');
      return;
    }

    console.log(`대시보드 데이터: ${dashboardData.length}건`);

    // 시각화 유형 자동 선택 방지를 위해 자동 초기화하지 않음
    // 사용자가 직접 시각화 유형부터 선택하도록 안내
  },

  /**
   * 이벤트 리스너 등록
   */
  registerEventListeners: function () {
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
    document
      .getElementById('vizDepartmentFilter')
      .addEventListener('change', this.handleDepartmentChange.bind(this));

    // 보기 버튼 클릭
    document
      .getElementById('applyVizFilterBtn')
      .addEventListener('click', this.applyFilters.bind(this));

    // 날짜 필터
    document
      .getElementById('vizStartDate')
      .addEventListener('change', this.handleDateChange.bind(this));
    document
      .getElementById('vizEndDate')
      .addEventListener('change', this.handleDateChange.bind(this));
  },

  /**
   * 필터 단계 표시 및 설정
   */
  showFilterStep: function (chartType) {
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
   * 지난 주 날짜 필터 초기화 (현재 기준 지난 주 월요일부터 일요일까지)
   */
  initLastWeekDateFilter: function () {
    const today = new Date();
    const currentDay = today.getDay(); // 0(일요일)부터 6(토요일)
    
    // 지난 주 일요일 계산 (현재 날짜에서 현재 요일 + 7 일 빼기)
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - currentDay - 7);
    
    // 지난 주 월요일 계산 (지난 주 일요일에서 6일 빼기)
    const lastMonday = new Date(lastSunday);
    lastMonday.setDate(lastSunday.getDate() - 6);
    
    // 포맷팅
    const startDateStr = DateUtils.formatDate(lastMonday);
    const endDateStr = DateUtils.formatDate(lastSunday);
    
    // 초기값 설정
    document.getElementById('vizStartDate').value = startDateStr;
    document.getElementById('vizEndDate').value = endDateStr;
    
    // 상태 업데이트
    this.state.startDate = startDateStr;
    this.state.endDate = endDateStr;
    
    console.log(`지난 주 날짜 필터 설정: ${startDateStr} ~ ${endDateStr}`);
  },

  /**
   * 차트 업데이트
   */
  updateCharts: function () {
    // 데이터 필터링
    this.filterData();

    // 디버그 로깅
    console.log(
      `차트 업데이트: ${this.state.chartType}, 필터링된 데이터: ${this.state.filteredData.length}건`
    );

    // 차트 타입에 따른 렌더링
    if (this.state.chartType === 'time') {
      this.renderTimeChart();
      document.getElementById('mainChartContainer').style.display = 'block';
      document.getElementById('departmentChartsContainer').style.display =
        'none';
    } else if (this.state.chartType === 'dept-status') {
      this.renderDeptStatusCharts();
      document.getElementById('mainChartContainer').style.display = 'none';
      document.getElementById('departmentChartsContainer').style.display =
        'block';
    }
  },

  /**
   * 필터 적용 기능
   */
  applyFilters: function () {
    console.log('필터 적용 시작...');

    const chartType = document.getElementById('vizChartType').value;
    const startDate = document.getElementById('vizStartDate').value;
    const endDate = document.getElementById('vizEndDate').value;
    // 부서 필터는 항상 전체로 설정 (필터링 제거)
    const department = '';

    // 필수 입력값 검증
    if (!chartType) {
      MessageManager.warning('시각화 유형을 선택해주세요.');
      return;
    }

    if (!startDate || !endDate) {
      MessageManager.warning('시작일과 종료일을 모두 입력해주세요.');
      return;
    }

    // 로딩 표시
    this.showLoading(chartType);

    // 상태 업데이트
    this.state.chartType = chartType;
    this.state.startDate = startDate;
    this.state.endDate = endDate;
    this.state.department = department;

    // 차트 표시 전 모든 차트 컨테이너 초기화
    this.resetChartVisibility();

    // 차트 컨테이너 표시
    document.getElementById('chartContainerWrapper').style.display = 'block';
    document.getElementById('chartPlaceholder').style.display = 'none';

    // 약간의 딜레이 후 차트 업데이트 (UI가 먼저 업데이트되도록)
    setTimeout(() => {
      try {
        // 차트 업데이트
        if (chartType === 'time') {
          document.getElementById('mainChartContainer').style.display = 'block';
          document.getElementById('departmentChartsContainer').style.display =
            'none';

          // 데이터 필터링 및 차트 렌더링
          this.filterData();
          this.renderTimeChart();
        } else if (chartType === 'dept-status') {
          document.getElementById('mainChartContainer').style.display = 'none';
          document.getElementById('departmentChartsContainer').style.display =
            'block';

          // 데이터 필터링 및 차트 렌더링
          this.filterData();
          this.renderDeptStatusCharts();
        }

        // 로딩 숨김
        this.hideLoading();
      } catch (error) {
        console.error('차트 업데이트 오류:', error);
        this.handleChartError(chartType, error.message);
      }
    }, 300);
  },

  /**
   * 로딩 표시
   */
  showLoading: function (chartType) {
    console.log('로딩 표시:', chartType);

    if (chartType === 'time') {
      document.querySelector(
        '#mainChartContainer .chart-loading'
      ).style.display = 'flex';
    } else if (chartType === 'dept-status') {
      // 모든 부서 차트 로딩 표시
      document
        .querySelectorAll('.department-chart .chart-loading')
        .forEach((el) => {
          el.style.display = 'flex';
        });
    }
  },

  /**
   * 로딩 숨김
   */
  hideLoading: function () {
    document.querySelectorAll('.chart-loading').forEach((el) => {
      el.style.display = 'none';
    });
  },

  /**
   * 차트 에러 처리
   */
  handleChartError: function (chartType, errorMessage) {
    this.hideLoading();

    const errorHTML = `
      <div class="chart-error">
        <i class="fa-solid fa-exclamation-circle"></i>
        <p>차트 생성 중 오류가 발생했습니다: ${errorMessage}</p>
      </div>
    `;

    if (chartType === 'time') {
      const container = document.getElementById('mainChartContainer');
      const errorDiv =
        container.querySelector('.chart-error') ||
        document.createElement('div');
      errorDiv.innerHTML = errorHTML;
      if (!container.querySelector('.chart-error')) {
        container.appendChild(errorDiv);
      }
    } else if (chartType === 'dept-status') {
      // 모든 부서 차트 에러 표시
      document.querySelectorAll('.department-chart').forEach((container) => {
        const errorDiv =
          container.querySelector('.chart-error') ||
          document.createElement('div');
        errorDiv.innerHTML = errorHTML;
        if (!container.querySelector('.chart-error')) {
          container.appendChild(errorDiv);
        }
      });
    }

    MessageManager.error('차트 생성 중 오류가 발생했습니다.');
  },

  /**
   * 차트 컨테이너 가시성 초기화
   */
  resetChartVisibility: function () {
    // 모든 차트 컨테이너 숨김
    document.getElementById('mainChartContainer').style.display = 'none';
    document.getElementById('departmentChartsContainer').style.display = 'none';

    // 차트 객체 초기화
    this.resetCharts();
  },

  /**
   * 데이터 필터링
   */
  filterData: function () {
    console.log('데이터 필터링 시작...');

    // 데이터 매니저로 데이터 가져오기
    const dashboardData = DataManager.getDashboardData();
    if (!dashboardData || !Array.isArray(dashboardData) || dashboardData.length === 0) {
      console.log('대시보드 데이터가 없거나 유효하지 않습니다.');
      this.state.filteredData = [];
      MessageManager.warning('데이터를 불러올 수 없습니다.');
      return;
    }

    console.log(`필터링 전 전체 데이터: ${dashboardData.length}건`);

    // 원본 데이터 복사
    let filteredData = [...dashboardData];

    // 날짜 필터 적용 (차트 유형에 따라 다른 날짜 필드 사용)
    if (this.state.startDate && this.state.endDate) {
      console.log(`날짜 필터: ${this.state.startDate} ~ ${this.state.endDate}`);
      const startDate = new Date(this.state.startDate);
      const endDate = new Date(this.state.endDate);
      endDate.setHours(23, 59, 59, 999); // 종료일 끝까지 포함

      filteredData = filteredData.filter((item) => {
        if (this.state.chartType === 'time') {
          // 시간대별 차트는 create_time 기준
          const createTime = item.create_time;
          if (!createTime) {
            return false;
          }

          const createDate = new Date(createTime);
          if (isNaN(createDate.getTime())) {
            console.log(
              `날짜 변환 실패 (create_time): ${createTime}, 주문번호: ${item.order_no}`
            );
            return false;
          }

          return createDate >= startDate && createDate <= endDate;
        } else {
          // 부서별 차트는 eta 기준
          const eta = item.eta;
          if (!eta) {
            return false;
          }

          const etaDate = new Date(eta);
          if (isNaN(etaDate.getTime())) {
            console.log(
              `날짜 변환 실패 (eta): ${eta}, 주문번호: ${item.order_no}`
            );
            return false;
          }

          return etaDate >= startDate && etaDate <= endDate;
        }
      });

      console.log(`날짜 필터 후 데이터: ${filteredData.length}건`);
    }

    // 부서 필터 적용
    if (this.state.department) {
      console.log(`부서 필터: ${this.state.department}`);
      filteredData = filteredData.filter(
        (item) => item.department === this.state.department
      );
      console.log(`부서 필터 후 데이터: ${filteredData.length}건`);
    }

    this.state.filteredData = filteredData;
    console.log(`최종 필터링된 데이터: ${this.state.filteredData.length}건`);

    if (this.state.filteredData.length === 0) {
      console.log('필터링된 데이터가 없습니다.');
      MessageManager.warning('선택한 조건에 맞는 데이터가 없습니다.');
    }
  },

  /**
   * 시간대별 차트 렌더링
   */
  renderTimeChart: function () {
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
          datasets: [
            {
              label: '주문 건수',
              data: [0],
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: '시간대별 주문 접수 현황 (데이터 없음)',
              font: {
                size: 16,
                weight: 'bold',
              },
              padding: {
                top: 10,
                bottom: 20,
              },
            },
            tooltip: {
              callbacks: {
                title: function (tooltipItems) {
                  return tooltipItems[0].label;
                },
                label: function (context) {
                  return `주문 건수: ${context.raw}건`;
                },
              },
            },
            legend: {
              display: false,
            },
          },
          animation: {
            duration: 1000,
            easing: 'easeOutQuart',
          },
        },
      });

      return;
    }

    // 시간대 구분 (요구사항에 맞춰 조정)
    // 9시~18시: 1시간 단위, 18시~20시, 20시~00시, 00시~9시: 각각 하나의 단위
    const timeSlots = [
      '00시~09시',
      '09시~10시',
      '10시~11시',
      '11시~12시',
      '12시~13시',
      '13시~14시',
      '14시~15시',
      '15시~16시',
      '16시~17시',
      '17시~18시',
      '18시~20시',
      '20시~00시',
    ];

    // 부서별 시간대 데이터 집계 초기화
    const csTimeData = Array(timeSlots.length).fill(0);
    const hesTimeData = Array(timeSlots.length).fill(0);
    const lenovoTimeData = Array(timeSlots.length).fill(0);

    console.log(
      `시간대별 집계 시작 (데이터 ${this.state.filteredData.length}건)`
    );

    // create_time 필드가 있는지 확인
    const hasCreateTime = this.state.filteredData.some(
      (item) => item.create_time
    );
    console.log(`create_time 필드 존재 여부: ${hasCreateTime}`);

    this.state.filteredData.forEach((item) => {
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

        // 부서별로 데이터 추가
        const department = item.department || '';
        if (department === 'CS') {
          csTimeData[slotIndex]++;
        } else if (department === 'HES') {
          hesTimeData[slotIndex]++;
        } else if (department === 'LENOVO') {
          lenovoTimeData[slotIndex]++;
        }
      } catch (error) {
        console.warn('날짜 파싱 오류:', error);
      }
    });

    console.log('부서별 시간대 데이터 집계 결과:', {
      CS: csTimeData,
      HES: hesTimeData,
      LENOVO: lenovoTimeData,
    });

    // 차트 업데이트 또는 생성
    if (this.charts.mainChart) {
      this.charts.mainChart.destroy();
    }

    this.charts.mainChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: timeSlots,
        datasets: [
          {
            label: 'CS 부서',
            data: csTimeData,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            borderRadius: 4,
            hoverBackgroundColor: 'rgba(54, 162, 235, 0.8)',
          },
          {
            label: 'HES 부서',
            data: hesTimeData,
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1,
            borderRadius: 4,
            hoverBackgroundColor: 'rgba(255, 159, 64, 0.8)',
          },
          {
            label: 'LENOVO 부서',
            data: lenovoTimeData,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            borderRadius: 4,
            hoverBackgroundColor: 'rgba(75, 192, 192, 0.8)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: '부서별 시간대별 주문 접수 현황',
            font: {
              size: 16,
              weight: 'bold',
            },
            padding: {
              top: 10,
              bottom: 20,
            },
          },
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              title: function (tooltipItems) {
                return tooltipItems[0].label;
              },
              label: function (context) {
                return `${context.dataset.label}: ${context.raw}건`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '주문 건수',
              font: {
                weight: 'bold',
              },
            },
            ticks: {
              precision: 0,
              stepSize: 1,
            },
            grid: {
              drawBorder: false,
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
          x: {
            title: {
              display: true,
              text: '시간대',
              font: {
                weight: 'bold',
              },
            },
            grid: {
              display: false,
            },
          },
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart',
        },
      },
    });

    console.log('시간대별 차트 렌더링 완료');
  },

  /**
   * 부서별 배송 상태 차트 렌더링
   */
  renderDeptStatusCharts: function () {
    console.log('부서별 배송 상태 차트 렌더링...');

    // 데이터가 없는 경우
    if (this.state.filteredData.length === 0) {
      MessageManager.warning('해당 기간에 데이터가 없습니다.');
      return;
    }

    // 부서별로 데이터 그룹화
    const deptData = {
      CS: this.state.filteredData.filter((item) => item.department === 'CS'),
      HES: this.state.filteredData.filter((item) => item.department === 'HES'),
      LENOVO: this.state.filteredData.filter(
        (item) => item.department === 'LENOVO'
      ),
    };

    // 상태별 색상 및 라벨
    const chartColors = {
      PENDING: 'rgba(255, 193, 7, 0.7)',
      IN_PROGRESS: 'rgba(0, 123, 255, 0.7)',
      COMPLETE: 'rgba(40, 167, 69, 0.7)',
      ISSUE: 'rgba(220, 53, 69, 0.7)',
      CANCEL: 'rgba(108, 117, 125, 0.7)',
    };

    const statusLabels = {
      PENDING: '대기',
      IN_PROGRESS: '진행',
      COMPLETE: '완료',
      ISSUE: '이슈',
      CANCEL: '취소',
    };

    // 모든 부서 차트 렌더링
    console.log('모든 부서 차트 렌더링...');
    this.renderDeptStatusChart(
      'csChartCanvas',
      'CS 부서 배송 상태',
      deptData.CS,
      chartColors,
      statusLabels
    );
    this.renderDeptStatusChart(
      'hesChartCanvas',
      'HES 부서 배송 상태',
      deptData.HES,
      chartColors,
      statusLabels
    );
    this.renderDeptStatusChart(
      'lenovoChartCanvas',
      'LENOVO 부서 배송 상태',
      deptData.LENOVO,
      chartColors,
      statusLabels
    );
    
    // 차트 컨테이너 표시
    document.getElementById('csChart').style.display = 'block';
    document.getElementById('hesChart').style.display = 'block';
    document.getElementById('lenovoChart').style.display = 'block';
    document.getElementById('allDeptChart').style.display = 'none';
  },

  /**
   * 부서별 상태 차트 렌더링 (각 부서)
   */
  renderDeptStatusChart: function (
    chartId,
    title,
    data,
    chartColors,
    statusLabels
  ) {
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
          datasets: [
            {
              data: [1],
              backgroundColor: ['#f5f5f5'],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: `${title} (데이터 없음)`,
              font: {
                size: 14,
                weight: 'bold',
              },
              padding: {
                top: 10,
                bottom: 20,
              },
            },
            legend: {
              position: 'right',
              labels: {
                boxWidth: 12,
                padding: 15,
              },
            },
          },
          animation: {
            duration: 1000,
            easing: 'easeOutQuart',
          },
        },
      });

      return;
    }

    // 부서 데이터 집계
    const statusCounts = this.countByStatus(data);

    // 차트 데이터 준비
    const labels = Object.keys(statusCounts).map(
      (key) => statusLabels[key] || key
    );
    const dataset = {
      label: '건수',
      data: Object.values(statusCounts),
      backgroundColor: Object.keys(statusCounts).map(
        (key) => chartColors[key] || 'rgba(108, 117, 125, 0.7)'
      ),
      borderWidth: 1,
      borderColor: '#ffffff',
      hoverOffset: 4,
    };

    // 차트 업데이트 또는 생성
    if (this.charts[chartId]) {
      this.charts[chartId].destroy();
    }

    this.charts[chartId] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [dataset],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: {
              size: 14,
              weight: 'bold',
            },
            padding: {
              top: 10,
              bottom: 20,
            },
          },
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              padding: 15,
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value}건 (${percentage}%)`;
              },
            },
          },
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart',
        },
      },
    });
  },

  /**
   * 차트 타입 변경 처리
   */
  handleChartTypeChange: function (e) {
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
  resetCharts: function () {
    // 모든 차트 객체 파괴
    Object.keys(this.charts).forEach((key) => {
      if (this.charts[key]) {
        this.charts[key].destroy();
        this.charts[key] = null;
      }
    });

    // 모든 에러 메시지 제거
    document.querySelectorAll('.chart-error').forEach((el) => {
      el.remove();
    });

    console.log('모든 차트 객체 리셋 완료');
  },

  /**
   * 부서 변경 처리
   */
  handleDepartmentChange: function (e) {
    this.state.department = e.target.value;
  },

  /**
   * 날짜 변경 처리
   */
  handleDateChange: function () {
    const startDate = document.getElementById('vizStartDate').value;
    const endDate = document.getElementById('vizEndDate').value;

    console.log(`날짜 변경: ${startDate} ~ ${endDate}`);

    // 상태 업데이트
    this.state.startDate = startDate;
    this.state.endDate = endDate;
  },

  /**
   * 상태별 카운트 계산 함수
   */
  countByStatus: function (data) {
    // 모든 가능한 상태 초기화 (ASSIGNED 제외)
    const counts = {
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETE: 0,
      ISSUE: 0,
      CANCEL: 0,
    };

    // 데이터가 없으면 빈 counts 객체 반환
    if (!data || data.length === 0) {
      return counts;
    }

    // 상태 카운트
    data.forEach((item) => {
      const status = item.status || 'PENDING';

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
  }
};

// 전역 객체에 페이지 모듈 할당
window.VisualizationPage = VisualizationPage;
