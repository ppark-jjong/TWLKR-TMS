/**
 * 시각화 페이지 모듈 (단순화된 버전)
 */
const VisualizationPage = {
  // 차트 객체 저장
  charts: {
    orderTimeChart: null,
    csChartCanvas: null,
    hesChartCanvas: null,
    lenovoChartCanvas: null,
    allDeptChartCanvas: null,
  },

  // 필터 상태
  filters: {
    chartType: 'time', // 기본값 설정
    startDate: '',
    endDate: '',
    department: '',
  },

  // 로드된 데이터
  dashboardData: [],

  /**
   * 페이지 초기화
   */
  init: function () {
    console.log('시각화 페이지 초기화...');

    // 데이터 로드
    this.loadData();

    // 날짜 필터 초기값 설정
    this.initDateFilter();

    // 이벤트 리스너 등록
    this.registerEventListeners();
  },

  /**
   * 데이터 로드
   */
  loadData: function () {
    // 대시보드 데이터 로드
    fetch('dashboard_data.json')
      .then((response) => response.json())
      .then((data) => {
        // 데이터 저장
        this.dashboardData = data.orders || [];

        // 기본 차트 생성
        this.generateCharts();
      })
      .catch((error) => {
        console.error('데이터 로드 오류:', error);
        this.showMessage('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
      });
  },

  /**
   * 날짜 필터 초기화
   */
  initDateFilter: function () {
    // 현재 날짜와 일주일 전 날짜 가져오기
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    // YYYY-MM-DD 형식으로 변환
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // 날짜 필터에 설정
    document.getElementById('vizStartDate').value = formatDate(lastWeek);
    document.getElementById('vizEndDate').value = formatDate(today);

    // 필터 상태에 저장
    this.filters.startDate = formatDate(lastWeek);
    this.filters.endDate = formatDate(today);
  },

  /**
   * 이벤트 리스너 등록
   */
  registerEventListeners: function () {
    // 차트 유형 선택 드롭다운
    document.getElementById('vizChartType')?.addEventListener('change', (e) => {
      this.handleChartTypeChange(e.target.value);
    });

    // 필터 적용 버튼
    document
      .getElementById('applyVizFilterBtn')
      ?.addEventListener('click', () => {
        this.generateCharts();
      });

    // 날짜 필터
    document.getElementById('vizStartDate')?.addEventListener('change', (e) => {
      this.filters.startDate = e.target.value;
    });

    document.getElementById('vizEndDate')?.addEventListener('change', (e) => {
      this.filters.endDate = e.target.value;
    });

    // 부서 필터
    document
      .getElementById('vizDepartmentFilter')
      ?.addEventListener('change', (e) => {
        this.filters.department = e.target.value;
      });
  },

  /**
   * 차트 유형 변경 처리
   */
  handleChartTypeChange: function (chartType) {
    // 필터 상태 업데이트
    this.filters.chartType = chartType;

    // 차트 영역 초기 상태 설정
    document.getElementById('chartPlaceholder').style.display = 'flex';
    document.getElementById('chartContainerWrapper').style.display = 'none';

    // 부서별 차트 컨테이너 초기화
    document.getElementById('departmentChartsContainer').style.display = 'none';
    document.getElementById('mainChartContainer').style.display = 'none';
  },

  /**
   * 차트 생성
   */
  generateCharts: function () {
    // 필수 필드 검증
    if (!this.filters.chartType) {
      this.showMessage('차트 유형을 선택해주세요.', 'warning');
      return;
    }

    if (!this.filters.startDate || !this.filters.endDate) {
      this.showMessage('기간을 선택해주세요.', 'warning');
      return;
    }

    // 차트 표시 영역 업데이트
    document.getElementById('chartPlaceholder').style.display = 'none';
    document.getElementById('chartContainerWrapper').style.display = 'block';

    // 로딩 표시
    document.getElementById('timeChartLoading').style.display = 'flex';

    // 선택된 차트 유형에 따라 다른 차트 렌더링
    if (this.filters.chartType === 'time') {
      // 시간대별 주문 접수 차트 표시
      document.getElementById('mainChartContainer').style.display = 'block';
      document.getElementById('departmentChartsContainer').style.display =
        'none';
      this.renderTimeChart();
    } else if (this.filters.chartType === 'dept-status') {
      // 부서별 배송 상태 분포 차트 표시
      document.getElementById('mainChartContainer').style.display = 'none';
      document.getElementById('departmentChartsContainer').style.display =
        'block';
      this.renderDepartmentCharts();
    }

    // 로딩 표시 숨기기
    setTimeout(() => {
      document.getElementById('timeChartLoading').style.display = 'none';
    }, 500);
  },

  /**
   * 시간대별 주문 접수 차트 렌더링
   */
  renderTimeChart: function () {
    // 기존 차트 파괴
    if (this.charts.orderTimeChart) {
      this.charts.orderTimeChart.destroy();
    }

    // 필터링된 데이터 가져오기
    const filteredData = this.getFilteredData();
    if (!filteredData || filteredData.length === 0) {
      this.showMessage('선택한 기간에 해당하는 데이터가 없습니다.', 'info');
      return;
    }

    // 시간대별 주문 수 계산
    const timeData = this.calculateTimeBasedOrders(filteredData);

    // 차트 생성
    const ctx = document.getElementById('orderTimeChart').getContext('2d');
    this.charts.orderTimeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: timeData.labels,
        datasets: [
          {
            label: '주문 접수',
            data: timeData.values,
            borderColor: '#1890ff',
            backgroundColor: 'rgba(24, 144, 255, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: '시간대별 주문 접수 현황',
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
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: '시간',
            },
            grid: {
              display: false,
            },
          },
          y: {
            title: {
              display: true,
              text: '주문 수',
            },
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
      },
    });
  },

  /**
   * 부서별 차트 렌더링
   */
  renderDepartmentCharts: function () {
    // 기존 차트 파괴
    Object.keys(this.charts).forEach((key) => {
      if (key !== 'orderTimeChart' && this.charts[key]) {
        this.charts[key].destroy();
      }
    });

    // 필터링된 데이터 가져오기
    const filteredData = this.getFilteredData();
    if (!filteredData || filteredData.length === 0) {
      this.showMessage('선택한 기간에 해당하는 데이터가 없습니다.', 'info');
      return;
    }

    // 부서 목록
    const departments = ['CS', 'HES', 'LENOVO'];

    // 부서별 상태 데이터 계산
    departments.forEach((dept) => {
      const deptData = filteredData.filter((item) => item.department === dept);

      // 상태별 카운트
      const statusCounts = this.countByStatus(deptData);

      // 차트 생성
      this.createDeptChart(dept.toLowerCase(), dept, statusCounts);
    });

    // 전체 부서 통합 차트 생성
    const allStatusCounts = this.countByStatus(filteredData);
    this.createDeptChart('allDept', '전체 부서', allStatusCounts);
  },

  /**
   * 부서별 차트 생성
   */
  createDeptChart: function (id, title, data) {
    const ctx = document.getElementById(`${id}Chart`).getContext('2d');

    this.charts[`${id}ChartCanvas`] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['대기', '진행', '완료', '취소', '이슈'],
        datasets: [
          {
            data: [
              data.WAITING || 0,
              data.IN_PROGRESS || 0,
              data.COMPLETED || 0,
              data.CANCELLED || 0,
              data.ISSUE || 0,
            ],
            backgroundColor: [
              '#faad14', // 대기: 노랑
              '#1890ff', // 진행: 파랑
              '#52c41a', // 완료: 초록
              '#d9d9d9', // 취소: 회색
              '#f5222d', // 이슈: 빨강
            ],
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
            text: `${title} 배송 상태 분포`,
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          legend: {
            position: 'bottom',
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
      },
    });
  },

  /**
   * 필터링된 데이터 가져오기
   */
  getFilteredData: function () {
    if (
      !this.dashboardData ||
      !Array.isArray(this.dashboardData) ||
      this.dashboardData.length === 0
    ) {
      return [];
    }

    const { startDate, endDate, department } = this.filters;

    // 날짜 객체로 변환
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    endDateObj.setHours(23, 59, 59, 999); // 종료일 마지막 시간으로 설정

    // 필터링
    return this.dashboardData.filter((item) => {
      // 날짜 필터
      const createDate = new Date(item.create_time || item.created_at);
      const isInDateRange =
        createDate >= startDateObj && createDate <= endDateObj;

      // 부서 필터
      const isMatchDept = !department || item.department === department;

      return isInDateRange && isMatchDept;
    });
  },

  /**
   * 시간대별 주문 수 계산
   */
  calculateTimeBasedOrders: function (data) {
    // 시간대별 주문 수 초기화 (0시 ~ 23시)
    const hourCounts = Array(24).fill(0);

    // 데이터 순회하며 시간대별 카운트
    data.forEach((item) => {
      const date = new Date(item.create_time || item.created_at);
      const hour = date.getHours();
      hourCounts[hour]++;
    });

    // 라벨 생성 (시간대)
    const labels = hourCounts.map((_, i) => `${i}시`);

    return {
      labels,
      values: hourCounts,
    };
  },

  /**
   * 상태별 카운트
   */
  countByStatus: function (data) {
    const statusCounts = {
      WAITING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      ISSUE: 0,
    };

    data.forEach((item) => {
      if (statusCounts[item.status] !== undefined) {
        statusCounts[item.status]++;
      }
    });

    return statusCounts;
  },

  /**
   * 메시지 표시
   */
  showMessage: function (message, type = 'info') {
    if (typeof messageUtils !== 'undefined' && messageUtils.showMessage) {
      messageUtils.showMessage(message, type);
    } else {
      alert(message);
    }
  },
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function () {
  VisualizationPage.init();
});
