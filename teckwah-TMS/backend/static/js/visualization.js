/**
 * 시각화 페이지 JavaScript
 */

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function () {
  // 차트 초기화
  initCharts();
  // 기본 기간(월별) 데이터 로드
  loadData('month');
});

// 현재 선택된 기간
let currentPeriod = 'month';

// 차트 객체 저장
const charts = {};

// 차트 색상 설정
const chartColors = {
  primary: '#D72519',
  blue: '#1890FF',
  green: '#52C41A',
  yellow: '#FAAD14',
  purple: '#722ED1',
  red: '#F5222D',
  gray: '#8C8C8C',
  lightGray: '#D9D9D9',
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

// 기간 변경 처리
function changePeriod(period) {
  if (period === currentPeriod) return;

  // 버튼 활성화 상태 변경
  document.querySelectorAll('.date-button').forEach((btn) => {
    btn.classList.remove('active');
  });
  document
    .querySelector(`.date-button[data-period="${period}"]`)
    .classList.add('active');

  // 기간 저장
  currentPeriod = period;

  // 데이터 로드
  loadData(period);
}

// 각 차트에 로딩 인디케이터 표시
function showLoading(chartId) {
  const container = document.getElementById(chartId);
  if (!container) return;

  // 이미 있는 로딩 인디케이터 제거
  removeLoading(chartId);

  // 로딩 인디케이터 추가
  const loadingElement = document.createElement('div');
  loadingElement.className = 'loading-indicator';
  loadingElement.innerHTML = '<div class="loading-spinner"></div>';

  container.appendChild(loadingElement);
}

// 로딩 인디케이터 제거
function removeLoading(chartId) {
  const container = document.getElementById(chartId);
  if (!container) return;

  const loadingElement = container.querySelector('.loading-indicator');
  if (loadingElement) {
    loadingElement.remove();
  }
}

// 데이터 없음 표시
function showNoData(chartId) {
  const container = document.getElementById(chartId);
  if (!container) return;

  // 이미 있는 표시 제거
  const existingElement = container.querySelector('.no-data');
  if (existingElement) {
    existingElement.remove();
  }

  // 데이터 없음 표시 추가
  const noDataElement = document.createElement('div');
  noDataElement.className = 'no-data';
  noDataElement.textContent = '데이터가 없습니다';

  container.appendChild(noDataElement);
}

// 데이터 로드
function loadData(period) {
  // 모든 차트에 로딩 인디케이터 표시
  showLoading('dailyDeliveryChart');
  showLoading('statusRatioChart');
  showLoading('regionDistributionChart');
  showLoading('hourlyPatternChart');
  showLoading('driverPerformanceChart');

  // 서버에서 데이터 로드
  apiRequest(`/visualization/data?period=${period}`)
    .then((result) => {
      if (result.success) {
        updateCharts(result.data);
      } else {
        showError(result.message || '데이터를 불러올 수 없습니다.');
        // 차트에 데이터 없음 표시
        showNoData('dailyDeliveryChart');
        showNoData('statusRatioChart');
        showNoData('regionDistributionChart');
        showNoData('hourlyPatternChart');
        showNoData('driverPerformanceChart');
      }
    })
    .catch((error) => {
      showError('데이터를 불러오는 중 오류가 발생했습니다.');
      console.error('시각화 데이터 로드 오류:', error);
      // 차트에 데이터 없음 표시
      showNoData('dailyDeliveryChart');
      showNoData('statusRatioChart');
      showNoData('regionDistributionChart');
      showNoData('hourlyPatternChart');
      showNoData('driverPerformanceChart');
    })
    .finally(() => {
      // 로딩 인디케이터 제거
      removeLoading('dailyDeliveryChart');
      removeLoading('statusRatioChart');
      removeLoading('regionDistributionChart');
      removeLoading('hourlyPatternChart');
      removeLoading('driverPerformanceChart');
    });
}

// 차트 업데이트
function updateCharts(data) {
  // 요약 정보 업데이트
  updateSummary(data.summary);

  // 일별 배송량 추이 차트 업데이트
  if (
    data.dailyDelivery &&
    data.dailyDelivery.labels &&
    data.dailyDelivery.values
  ) {
    charts.dailyDelivery.data.labels = data.dailyDelivery.labels;
    charts.dailyDelivery.data.datasets[0].data = data.dailyDelivery.values;
    charts.dailyDelivery.update();
  } else {
    showNoData('dailyDeliveryChart');
  }

  // 상태별 주문 비율 차트 업데이트
  if (data.statusRatio) {
    charts.statusRatio.data.datasets[0].data = [
      data.statusRatio.pending || 0,
      data.statusRatio.assigned || 0,
      data.statusRatio.in_progress || 0,
      data.statusRatio.delivered || 0,
      data.statusRatio.cancelled || 0,
    ];
    charts.statusRatio.update();
  } else {
    showNoData('statusRatioChart');
  }

  // 배송 지역별 분포 차트 업데이트
  if (
    data.regionDistribution &&
    data.regionDistribution.labels &&
    data.regionDistribution.values
  ) {
    charts.regionDistribution.data.labels = data.regionDistribution.labels;
    charts.regionDistribution.data.datasets[0].data =
      data.regionDistribution.values;
    charts.regionDistribution.update();
  } else {
    showNoData('regionDistributionChart');
  }

  // 시간대별 주문 패턴 차트 업데이트
  if (data.hourlyPattern && data.hourlyPattern.values) {
    charts.hourlyPattern.data.datasets[0].data = data.hourlyPattern.values;
    charts.hourlyPattern.update();
  } else {
    showNoData('hourlyPatternChart');
  }

  // 기사별 배송 실적 차트 업데이트
  if (
    data.driverPerformance &&
    data.driverPerformance.labels &&
    data.driverPerformance.values
  ) {
    charts.driverPerformance.data.labels = data.driverPerformance.labels;
    charts.driverPerformance.data.datasets[0].data =
      data.driverPerformance.values;
    charts.driverPerformance.update();
  } else {
    showNoData('driverPerformanceChart');
  }
}

// 요약 정보 업데이트
function updateSummary(summary) {
  if (!summary) return;

  const totalElement = document.querySelector(
    '.summary-item:nth-child(1) .summary-value'
  );
  const completedElement = document.querySelector(
    '.summary-item:nth-child(2) .summary-value'
  );
  const inProgressElement = document.querySelector(
    '.summary-item:nth-child(3) .summary-value'
  );
  const pendingElement = document.querySelector(
    '.summary-item:nth-child(4) .summary-value'
  );

  if (totalElement) totalElement.textContent = summary.total_orders || 0;
  if (completedElement)
    completedElement.textContent = summary.completed_orders || 0;
  if (inProgressElement)
    inProgressElement.textContent = summary.in_progress_orders || 0;
  if (pendingElement) pendingElement.textContent = summary.pending_orders || 0;
}
