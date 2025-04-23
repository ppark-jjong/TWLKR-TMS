/**
 * 시각화 페이지 JavaScript
 */

// 전역 변수 설정
const COLORS = {
  PENDING: '#ffbb33', // 대기: 노란색
  PROCESSING: '#4285f4', // 처리중: 파란색
  COMPLETED: '#34a853', // 완료: 초록색
  DELAYED: '#ea4335', // 지연: 빨간색
  CANCELED: '#999999', // 취소: 회색
};

// 페이지 로드 시 차트 초기화
document.addEventListener('DOMContentLoaded', function () {
  // 초기 날짜 범위 설정 (기본값: 오늘)
  const today = new Date();
  const dateRange = {
    start: formatDate(today),
    end: formatDate(today),
  };

  // 날짜 필터 버튼 활성화
  const dateButtons = document.querySelectorAll('.date-button');
  let activeFilter = 'today'; // 기본값

  dateButtons.forEach((button) => {
    button.addEventListener('click', function () {
      dateButtons.forEach((btn) => btn.classList.remove('active'));
      this.classList.add('active');
      activeFilter = this.dataset.period;
      loadAllData(activeFilter);
    });
  });

  // 초기 데이터 로드
  loadAllData(activeFilter);
});

// 현재 선택된 기간
let currentPeriod = 'month';

// 차트 객체 저장
const charts = {};

// 차트 색상 설정
const chartColors = {
  primary: '#D72519', // 포인트 색상
  blue: '#1890FF',
  green: '#52C41A',
  yellow: '#FAAD14',
  purple: '#722ED1',
  red: '#F5222D',
  gray: '#8C8C8C',
  lightGray: '#D9D9D9',
  // 상태별 색상
  WAITING: '#fffbe6', // 대기
  IN_PROGRESS: '#e6f7ff', // 진행
  COMPLETE: '#f6ffed', // 완료
  ISSUE: '#fff2f0', // 이슈
  CANCEL: '#f5f5f5', // 취소
  // 부서별 색상
  CS: '#1890FF',
  HES: '#52C41A',
  LENOVO: '#722ED1',
};

// 차트 초기화
function initCharts() {
  // 일별 배송량 추이 차트
  charts.dailyDelivery = new Chart(
    document.getElementById('dailyDeliveryCanvas'),
    {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: '배송량',
            data: [],
            borderColor: chartColors.primary,
            backgroundColor: 'rgba(215, 37, 25, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    }
  );

  // 상태별 주문 비율 차트
  charts.statusRatio = new Chart(document.getElementById('statusRatioCanvas'), {
    type: 'doughnut',
    data: {
      labels: ['배차대기', '배차완료', '배송중', '배송완료', '취소'],
      datasets: [
        {
          data: [0, 0, 0, 0, 0],
          backgroundColor: [
            chartColors.blue,
            chartColors.yellow,
            chartColors.green,
            chartColors.purple,
            chartColors.red,
          ],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
        },
      },
    },
  });

  // 배송 지역별 분포 차트
  charts.regionDistribution = new Chart(
    document.getElementById('regionDistributionCanvas'),
    {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: '주문 수',
            data: [],
            backgroundColor: chartColors.primary,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    }
  );

  // 시간대별 주문 패턴 차트
  charts.hourlyPattern = new Chart(
    document.getElementById('hourlyPatternCanvas'),
    {
      type: 'line',
      data: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}시`),
        datasets: [
          {
            label: '주문 수',
            data: Array(24).fill(0),
            borderColor: chartColors.blue,
            backgroundColor: 'rgba(24, 144, 255, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    }
  );

  // 기사별 배송 실적 차트
  charts.driverPerformance = new Chart(
    document.getElementById('driverPerformanceCanvas'),
    {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: '배송 완료 건수',
            data: [],
            backgroundColor: chartColors.green,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    }
  );
}

// 날짜 필터 버튼 설정
function setupDateFilters() {
  const dateButtons = document.querySelectorAll('.date-button');

  dateButtons.forEach((button) => {
    button.addEventListener('click', function () {
      // 이전 활성화 버튼 비활성화
      dateButtons.forEach((btn) => btn.classList.remove('active'));

      // 현재 버튼 활성화
      this.classList.add('active');

      // 선택된 날짜 범위 설정
      const dateRange = getDateRangeFromButton(this.dataset.range);

      // 데이터 리로드
      loadSummaryData(dateRange);
      loadTimeSeriesData(dateRange);
      loadDepartmentStatusData(dateRange);
      loadDailyTrendData(dateRange);
    });
  });

  // 기본값으로 '오늘' 버튼 활성화
  document.querySelector('[data-range="today"]').classList.add('active');
}

// 버튼 데이터에서 날짜 범위 계산
function getDateRangeFromButton(rangeType) {
  const today = new Date();
  let startDate = new Date(today);

  switch (rangeType) {
    case 'today':
      break;
    case 'yesterday':
      startDate.setDate(today.getDate() - 1);
      return {
        start: formatDate(startDate),
        end: formatDate(startDate),
      };
    case '7days':
      startDate.setDate(today.getDate() - 6);
      break;
    case '30days':
      startDate.setDate(today.getDate() - 29);
      break;
    default:
      break;
  }

  return {
    start: formatDate(startDate),
    end: formatDate(today),
  };
}

// 날짜 포맷팅 (YYYY-MM-DD)
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 요약 데이터 로드
function loadSummaryData(dateRange) {
  const loadingIndicator = document.querySelector(
    '#summaryCards .loading-indicator'
  );
  loadingIndicator.style.display = 'flex';

  fetch(`/visualization/summary?start=${dateRange.start}&end=${dateRange.end}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('요약 데이터를 불러오는데 실패했습니다.');
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        updateSummaryCards(data.data);
      } else {
        showError('요약 데이터 로드 실패', data.message);
      }
    })
    .catch((error) => {
      showError('요약 데이터 로드 오류', error.message);
    })
    .finally(() => {
      loadingIndicator.style.display = 'none';
    });
}

// 시계열 접수 데이터 로드
function loadTimeSeriesData(dateRange) {
  const loadingIndicator = document.querySelector(
    '#timeSeriesChart .loading-indicator'
  );
  loadingIndicator.style.display = 'flex';

  fetch(
    `/visualization/timeseries?start=${dateRange.start}&end=${dateRange.end}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error('시계열 데이터를 불러오는데 실패했습니다.');
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        renderTimeSeriesChart(data.data);
      } else {
        showError('시계열 데이터 로드 실패', data.message);
      }
    })
    .catch((error) => {
      showError('시계열 데이터 로드 오류', error.message);
    })
    .finally(() => {
      loadingIndicator.style.display = 'none';
    });
}

// 부서별 상태 현황 데이터 로드
function loadDepartmentStatusData(dateRange) {
  const loadingIndicator = document.querySelector(
    '#departmentStatusContainer .loading-indicator'
  );
  loadingIndicator.style.display = 'flex';

  fetch(
    `/visualization/departments?start=${dateRange.start}&end=${dateRange.end}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error('부서별 상태 데이터를 불러오는데 실패했습니다.');
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        renderDepartmentStatusChart(data.data);
      } else {
        showError('부서별 상태 데이터 로드 실패', data.message);
      }
    })
    .catch((error) => {
      showError('부서별 상태 데이터 로드 오류', error.message);
    })
    .finally(() => {
      loadingIndicator.style.display = 'none';
    });
}

// 일별 추이 데이터 로드
function loadDailyTrendData(dateRange) {
  const loadingIndicator = document.querySelector(
    '#dailyTrendChart .loading-indicator'
  );
  loadingIndicator.style.display = 'flex';

  fetch(
    `/visualization/daily-trend?start=${dateRange.start}&end=${dateRange.end}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error('일별 추이 데이터를 불러오는데 실패했습니다.');
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        renderDailyTrendChart(data.data);
      } else {
        showError('일별 추이 데이터 로드 실패', data.message);
      }
    })
    .catch((error) => {
      showError('일별 추이 데이터 로드 오류', error.message);
    })
    .finally(() => {
      loadingIndicator.style.display = 'none';
    });
}

// 요약 카드 업데이트
function updateSummaryCards(data) {
  document.getElementById('totalOrders').textContent = data.totalOrders;
  document.getElementById('pendingOrders').textContent = data.pendingOrders;
  document.getElementById('completedOrders').textContent = data.completedOrders;
  document.getElementById('delayedOrders').textContent = data.delayedOrders;
}

// 시계열 접수 차트 렌더링
function renderTimeSeriesChart(data) {
  const ctx = document.getElementById('timeSeriesChartCanvas').getContext('2d');

  // 이전 차트 파괴
  if (window.timeSeriesChart) {
    window.timeSeriesChart.destroy();
  }

  window.timeSeriesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: '접수 건수',
          data: data.values,
          borderColor: '#D72519',
          backgroundColor: 'rgba(215, 37, 25, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: false,
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
        legend: {
          display: true,
          position: 'top',
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            drawBorder: false,
          },
        },
      },
    },
  });
}

// 부서별 상태 현황 차트 렌더링
function renderDepartmentStatusChart(data) {
  const container = document.getElementById('departmentStatusChart');
  container.innerHTML = '';

  data.forEach((dept) => {
    const deptContainer = document.createElement('div');
    deptContainer.className = 'department-chart';

    const deptTitle = document.createElement('h3');
    deptTitle.textContent = dept.name;
    deptContainer.appendChild(deptTitle);

    // 상태 바 생성
    const statusBar = document.createElement('div');
    statusBar.className = 'status-bar';

    const totalOrders = Object.values(dept.statuses).reduce(
      (sum, count) => sum + count,
      0
    );

    // 각 상태별 세그먼트 생성
    Object.entries(dept.statuses).forEach(([status, count]) => {
      if (count > 0) {
        const percentage = (count / totalOrders) * 100;
        const segment = document.createElement('div');
        segment.className = 'status-segment';
        segment.style.width = `${percentage}%`;
        segment.style.backgroundColor = COLORS[status];
        segment.textContent = count;
        statusBar.appendChild(segment);
      }
    });

    deptContainer.appendChild(statusBar);

    // 상태 수치 정보
    const statusInfo = document.createElement('div');
    statusInfo.className = 'status-info';

    Object.entries(dept.statuses).forEach(([status, count]) => {
      const statusItem = document.createElement('div');
      statusItem.textContent = `${status}: ${count}건`;
      statusInfo.appendChild(statusItem);
    });

    deptContainer.appendChild(statusInfo);

    // 범례 생성
    const legend = document.createElement('div');
    legend.className = 'status-legend';

    Object.entries(COLORS).forEach(([status, color]) => {
      if (dept.statuses[status] > 0) {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';

        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = color;

        const label = document.createElement('span');
        label.textContent = status;

        legendItem.appendChild(colorBox);
        legendItem.appendChild(label);
        legend.appendChild(legendItem);
      }
    });

    deptContainer.appendChild(legend);
    container.appendChild(deptContainer);
  });
}

// 일별 추이 차트 렌더링
function renderDailyTrendChart(data) {
  const ctx = document.getElementById('dailyTrendChartCanvas').getContext('2d');

  // 이전 차트 파괴
  if (window.dailyTrendChart) {
    window.dailyTrendChart.destroy();
  }

  window.dailyTrendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.dates,
      datasets: [
        {
          label: '접수',
          data: data.received,
          backgroundColor: '#D72519',
          stack: 'Stack 0',
        },
        {
          label: '완료',
          data: data.completed,
          backgroundColor: '#34a853',
          stack: 'Stack 1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: false,
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
        legend: {
          display: true,
          position: 'top',
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            drawBorder: false,
          },
        },
      },
    },
  });
}

// 오류 표시
function showError(title, message) {
  console.error(`${title}: ${message}`);

  const errorToast = document.createElement('div');
  errorToast.className = 'error-toast';
  errorToast.innerHTML = `
    <div class="error-title">${title}</div>
    <div class="error-message">${message}</div>
  `;

  document.body.appendChild(errorToast);

  // 5초 후 자동 제거
  setTimeout(() => {
    errorToast.classList.add('fade-out');
    setTimeout(() => {
      document.body.removeChild(errorToast);
    }, 300);
  }, 5000);
}

// 데이터 로드 함수
function loadAllData(period) {
  // 로딩 표시
  document.querySelectorAll('.loading-indicator').forEach((loader) => {
    loader.style.display = 'flex';
  });

  // 데이터 가져오기
  fetch(`/visualization/data?period=${period}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('데이터를 불러오는데 실패했습니다.');
      }
      return response.json();
    })
    .then((data) => {
      // 데이터 로드 완료 후 로딩 숨기기
      document.querySelectorAll('.loading-indicator').forEach((loader) => {
        loader.style.display = 'none';
      });

      // 요약 카드 업데이트
      updateSummaryCards(data.summary);

      // 차트 업데이트
      updateTimeChart(data.time_series);
      updateDepartmentStatus(data.departments);
      updateTrendChart(data.daily_trend);
    })
    .catch((error) => {
      console.error('데이터 로드 오류:', error);
      // 에러 시 로딩 숨기기
      document.querySelectorAll('.loading-indicator').forEach((loader) => {
        loader.style.display = 'none';
      });

      // 에러 메시지 표시
      alert(
        '데이터를 불러오는 중 오류가 발생했습니다. 새로고침을 시도해주세요.'
      );
    });
}

// 시간대별 차트 업데이트 함수
function updateTimeChart(data) {
  const ctx = document.getElementById('time-chart').getContext('2d');
  const timeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: '배송 진행 중',
          data: data.pending,
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
        {
          label: '배송 완료',
          data: data.completed,
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
        {
          label: '배송 지연',
          data: data.delayed,
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
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
        legend: {
          position: 'top',
        },
        title: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            precision: 0,
          },
        },
        x: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
        },
      },
    },
  });
}

// 부서별 상태 업데이트 함수
function updateDepartmentStatus(departments) {
  const container = document.getElementById('department-chart');
  container.innerHTML = '';

  departments.forEach((dept) => {
    const deptItem = document.createElement('div');
    deptItem.className = 'department-item';

    const deptName = document.createElement('div');
    deptName.className = 'department-name';
    deptName.textContent = dept.name;
    deptItem.appendChild(deptName);

    const statusBars = document.createElement('div');
    statusBars.className = 'status-bars';

    // 진행 중 상태바
    const pendingBar = createStatusBar(
      'status-pending',
      dept.pending,
      dept.total,
      '진행 중'
    );
    statusBars.appendChild(pendingBar);

    // 완료 상태바
    const completedBar = createStatusBar(
      'status-completed',
      dept.completed,
      dept.total,
      '완료'
    );
    statusBars.appendChild(completedBar);

    // 지연 상태바
    const delayedBar = createStatusBar(
      'status-delayed',
      dept.delayed,
      dept.total,
      '지연'
    );
    statusBars.appendChild(delayedBar);

    deptItem.appendChild(statusBars);
    container.appendChild(deptItem);
  });
}

// 상태바 생성 헬퍼 함수
function createStatusBar(statusClass, value, total, label) {
  const statusBar = document.createElement('div');
  statusBar.className = 'status-bar';

  const percentage = total > 0 ? (value / total) * 100 : 0;

  const statusFill = document.createElement('div');
  statusFill.className = `status-fill ${statusClass}`;
  statusFill.style.width = `${percentage}%`;
  statusFill.textContent = `${label}: ${value}`;

  statusBar.appendChild(statusFill);
  return statusBar;
}

// 일별 추세 차트 업데이트 함수
function updateTrendChart(data) {
  const ctx = document.getElementById('trend-chart').getContext('2d');
  const trendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.dates,
      datasets: [
        {
          label: '총 주문',
          data: data.counts,
          backgroundColor: '#D72519',
          borderColor: '#D72519',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            precision: 0,
          },
        },
        x: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
        },
      },
    },
  });
}
