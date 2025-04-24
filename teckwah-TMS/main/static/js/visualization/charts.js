/**
 * 시각화 페이지 차트 관련 JS
 * 배송 현황 및 통계 데이터를 시각적으로 표현하기 위한 차트 생성 및 관리 기능
 */

// Chart.js 라이브러리 필요

/**
 * 차트 렌더링 영역 초기화
 */
function initChartAreas() {
  createTimeBlockChart();
  createDepartmentStatusChart();
  createDailyTrendChart();
}

/**
 * 시간대별 접수량 차트 생성
 * @param {Object[]} data - 차트 데이터
 */
function createTimeBlockChart(data = null) {
  const ctx = document.getElementById('time-block-chart');
  if (!ctx) return;
  
  // 차트 컨테이너 초기 상태 설정
  const container = ctx.closest('.chart-container');
  if (container) {
    container.classList.add('loading');
  }
  
  // 데이터가 없을 경우 서버에서 로드
  if (!data) {
    // 시작일과 종료일 가져오기
    const startDate = document.getElementById('date-start')?.value || getCurrentDate();
    const endDate = document.getElementById('date-end')?.value || getCurrentDate();
    
    window.Api.getTimeBlockData(startDate, endDate)
      .then(response => {
        if (response.success && response.data) {
          renderTimeBlockChart(ctx, response.data);
        } else {
          showChartError(container, '시간대별 접수량 데이터를 불러올 수 없습니다.');
        }
      })
      .catch(error => {
        console.error('시간대별 차트 데이터 로드 오류:', error);
        showChartError(container, '시간대별 접수량 데이터를 불러올 수 없습니다.');
      })
      .finally(() => {
        if (container) {
          container.classList.remove('loading');
        }
      });
  } else {
    // 데이터가 이미 있는 경우 바로 렌더링
    renderTimeBlockChart(ctx, data);
    if (container) {
      container.classList.remove('loading');
    }
  }
}

/**
 * 시간대별 접수량 차트 렌더링
 * @param {HTMLElement} ctx - 차트 캔버스 요소
 * @param {Object[]} data - 차트 데이터
 */
function renderTimeBlockChart(ctx, data) {
  // 기존 차트 있으면 제거
  if (window.timeBlockChart) {
    window.timeBlockChart.destroy();
  }
  
  // 차트 데이터 구성
  const chartData = {
    labels: data.map(item => item.timeBlock),
    datasets: [
      {
        label: 'CS',
        data: data.map(item => item.CS),
        backgroundColor: '#4e73df',
        borderColor: '#4e73df',
        borderWidth: 1
      },
      {
        label: 'HES',
        data: data.map(item => item.HES),
        backgroundColor: '#1cc88a',
        borderColor: '#1cc88a',
        borderWidth: 1
      },
      {
        label: 'LENOVO',
        data: data.map(item => item.LENOVO),
        backgroundColor: '#f6c23e',
        borderColor: '#f6c23e',
        borderWidth: 1
      }
    ]
  };
  
  // 차트 옵션
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: false,
        grid: {
          display: false
        }
      },
      y: {
        stacked: false,
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw}건`;
          }
        }
      }
    }
  };
  
  // 차트 생성
  window.timeBlockChart = new Chart(ctx, {
    type: 'bar',
    data: chartData,
    options: options
  });
}

/**
 * 부서별 상태 차트 생성
 * @param {Object} data - 차트 데이터
 */
function createDepartmentStatusChart(data = null) {
  const container = document.getElementById('department-status-charts');
  if (!container) return;
  
  // 차트 컨테이너 초기 상태 설정
  container.classList.add('loading');
  
  // 데이터가 없을 경우 서버에서 로드
  if (!data) {
    // 시작일과 종료일 가져오기
    const startDate = document.getElementById('date-start')?.value || getCurrentDate();
    const endDate = document.getElementById('date-end')?.value || getCurrentDate();
    
    window.Api.getDepartmentStatusData(startDate, endDate)
      .then(response => {
        if (response.success && response.data) {
          renderDepartmentStatusCharts(container, response.data);
        } else {
          showChartError(container, '부서별 상태 데이터를 불러올 수 없습니다.');
        }
      })
      .catch(error => {
        console.error('부서별 상태 차트 데이터 로드 오류:', error);
        showChartError(container, '부서별 상태 데이터를 불러올 수 없습니다.');
      })
      .finally(() => {
        container.classList.remove('loading');
      });
  } else {
    // 데이터가 이미 있는 경우 바로 렌더링
    renderDepartmentStatusCharts(container, data);
    container.classList.remove('loading');
  }
}

/**
 * 부서별 상태 차트 렌더링
 * @param {HTMLElement} container - 차트 컨테이너 요소
 * @param {Object} data - 차트 데이터
 */
function renderDepartmentStatusCharts(container, data) {
  // 기존 차트 제거
  container.innerHTML = '';
  
  // 색상 정의
  const statusColors = {
    WAITING: '#fffbe6',     // 연한 노란색
    IN_PROGRESS: '#e6f7ff', // 연한 파란색
    COMPLETE: '#f6ffed',    // 연한 녹색
    ISSUE: '#fff2f0',       // 연한 빨간색
    CANCEL: '#f5f5f5'       // 연한 회색
  };
  
  // 상태 레이블
  const statusLabels = {
    WAITING: '대기',
    IN_PROGRESS: '진행',
    COMPLETE: '완료',
    ISSUE: '이슈',
    CANCEL: '취소'
  };
  
  // 각 부서별 차트 생성
  Object.keys(data).forEach(dept => {
    const deptData = data[dept];
    
    // 부서별 차트 컨테이너 생성
    const deptContainer = document.createElement('div');
    deptContainer.className = 'department-chart';
    deptContainer.innerHTML = `
      <h3 class="chart-title">${dept} 부서 현황</h3>
      <div class="chart-content">
        <canvas id="dept-chart-${dept}"></canvas>
      </div>
      <div class="chart-info">
        <div class="chart-total">총 ${deptData.total}건</div>
      </div>
    `;
    
    container.appendChild(deptContainer);
    
    // 차트 데이터 구성
    const chartData = {
      labels: deptData.statuses.map(status => statusLabels[status.status]),
      datasets: [{
        data: deptData.statuses.map(status => status.count),
        backgroundColor: deptData.statuses.map(status => statusColors[status.status]),
        borderColor: deptData.statuses.map(status => statusColors[status.status].replace('f', 'e')), // 약간 어둡게
        borderWidth: 1
      }]
    };
    
    // 차트 옵션
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              const percentage = Math.round((value / deptData.total) * 100);
              return `${value}건 (${percentage}%)`;
            }
          }
        }
      }
    };
    
    // 차트 생성
    const ctx = document.getElementById(`dept-chart-${dept}`);
    if (ctx) {
      new Chart(ctx, {
        type: 'pie',
        data: chartData,
        options: options
      });
    }
  });
}

/**
 * 일별 추세 차트 생성
 * @param {Object[]} data - 차트 데이터
 */
function createDailyTrendChart(data = null) {
  const ctx = document.getElementById('daily-trend-chart');
  if (!ctx) return;
  
  // 차트 컨테이너 초기 상태 설정
  const container = ctx.closest('.chart-container');
  if (container) {
    container.classList.add('loading');
  }
  
  // 데이터가 없을 경우 서버에서 로드
  if (!data) {
    // 표시할 일수
    const days = 7; // 기본값 7일
    
    window.Api.getDailyTrendData(days)
      .then(response => {
        if (response.success && response.data) {
          renderDailyTrendChart(ctx, response.data);
        } else {
          showChartError(container, '일별 추세 데이터를 불러올 수 없습니다.');
        }
      })
      .catch(error => {
        console.error('일별 추세 차트 데이터 로드 오류:', error);
        showChartError(container, '일별 추세 데이터를 불러올 수 없습니다.');
      })
      .finally(() => {
        if (container) {
          container.classList.remove('loading');
        }
      });
  } else {
    // 데이터가 이미 있는 경우 바로 렌더링
    renderDailyTrendChart(ctx, data);
    if (container) {
      container.classList.remove('loading');
    }
  }
}

/**
 * 일별 추세 차트 렌더링
 * @param {HTMLElement} ctx - 차트 캔버스 요소
 * @param {Object[]} data - 차트 데이터
 */
function renderDailyTrendChart(ctx, data) {
  // 기존 차트 있으면 제거
  if (window.dailyTrendChart) {
    window.dailyTrendChart.destroy();
  }
  
  // 색상 정의
  const statusColors = {
    WAITING: 'rgba(255, 206, 86, 0.7)',     // 노란색
    IN_PROGRESS: 'rgba(54, 162, 235, 0.7)', // 파란색
    COMPLETE: 'rgba(75, 192, 192, 0.7)',    // 녹색
    ISSUE: 'rgba(255, 99, 132, 0.7)',       // 빨간색
    CANCEL: 'rgba(201, 203, 207, 0.7)'      // 회색
  };
  
  // 상태 레이블
  const statusLabels = {
    WAITING: '대기',
    IN_PROGRESS: '진행',
    COMPLETE: '완료',
    ISSUE: '이슈',
    CANCEL: '취소'
  };
  
  // 날짜 형식 변환
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} (${date.toLocaleDateString('ko-KR', { weekday: 'short' })})`;
  };
  
  // 차트 데이터 구성
  const chartData = {
    labels: [...new Set(data.map(item => formatDate(item.date)))],
    datasets: [
      {
        label: '총 주문',
        data: [...new Set(data.map(item => item.date))].map(date => {
          const dayData = data.find(item => item.date === date);
          return dayData ? dayData.total : 0;
        }),
        type: 'line',
        fill: false,
        borderColor: 'rgba(78, 115, 223, 1)',
        pointBackgroundColor: 'rgba(78, 115, 223, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(78, 115, 223, 1)',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.1
      }
    ]
  };
  
  // 상태별 데이터셋 추가
  Object.keys(statusLabels).forEach(status => {
    chartData.datasets.push({
      label: statusLabels[status],
      data: [...new Set(data.map(item => item.date))].map(date => {
        const dayData = data.find(item => item.date === date);
        return dayData ? dayData[status] : 0;
      }),
      backgroundColor: statusColors[status],
      borderColor: statusColors[status].replace('0.7', '1'),
      borderWidth: 1
    });
  });
  
  // 차트 옵션
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw}건`;
          }
        }
      }
    }
  };
  
  // 차트 생성
  window.dailyTrendChart = new Chart(ctx, {
    type: 'bar',
    data: chartData,
    options: options
  });
}

/**
 * 현재 날짜 문자열 반환 ('YYYY-MM-DD' 형식)
 * @returns {string} 오늘 날짜
 */
function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 차트 오류 표시
 * @param {HTMLElement} container - 차트 컨테이너 요소
 * @param {string} message - 오류 메시지
 */
function showChartError(container, message) {
  if (container) {
    const errorElement = document.createElement('div');
    errorElement.className = 'chart-error';
    errorElement.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <p>${message}</p>
    `;
    
    container.innerHTML = '';
    container.appendChild(errorElement);
  }
}

/**
 * 시각화 데이터 새로고침
 */
function refreshCharts() {
  initChartAreas();
}

/**
 * 기간 변경에 따른 차트 업데이트
 */
function updateChartsByDateRange() {
  const startDate = document.getElementById('date-start')?.value;
  const endDate = document.getElementById('date-end')?.value;
  
  if (!startDate || !endDate) {
    window.Utils.showAlert('시작일과 종료일을 모두 선택하세요', 'warning');
    return;
  }
  
  // 모든 차트 다시 로드
  refreshCharts();
}

// 페이지 로드 시 차트 초기화
document.addEventListener('DOMContentLoaded', function() {
  // 날짜 선택 이벤트 설정
  const dateStartInput = document.getElementById('date-start');
  const dateEndInput = document.getElementById('date-end');
  
  if (dateStartInput && dateEndInput) {
    // 날짜 기본값 설정 (오늘)
    if (!dateStartInput.value) {
      dateStartInput.value = getCurrentDate();
    }
    if (!dateEndInput.value) {
      dateEndInput.value = getCurrentDate();
    }
    
    // 날짜 변경 이벤트
    document.getElementById('date-filter-btn')?.addEventListener('click', updateChartsByDateRange);
  }
  
  // 새로고침 버튼 이벤트
  document.getElementById('refresh-charts-btn')?.addEventListener('click', refreshCharts);
  
  // 차트 초기화
  initChartAreas();
});

// 전역 객체로 내보내기
window.VisualizationCharts = {
  init: initChartAreas,
  refresh: refreshCharts,
  updateByDateRange: updateChartsByDateRange,
  renderTimeBlockChart: renderTimeBlockChart,
  renderDepartmentStatusCharts: renderDepartmentStatusCharts,
  renderDailyTrendChart: renderDailyTrendChart
};