/**
 * 시각화 페이지 JavaScript - 수정 버전
 */

// 전역 변수 설정
const COLORS = {
  WAITING: '#fffbe6',     // 대기: 연한 노란색
  IN_PROGRESS: '#e6f7ff', // 진행: 연한 파란색
  COMPLETE: '#f6ffed',    // 완료: 연한 초록색
  ISSUE: '#fff2f0',       // 이슈: 연한 빨간색
  CANCEL: '#f5f5f5',      // 취소: 연한 회색
};

// 부서별 색상
const DEPT_COLORS = {
  CS: '#1890ff',       // 파란색
  HES: '#52c41a',      // 초록색
  LENOVO: '#722ed1',   // 보라색
};

// 포인트 색상
const PRIMARY_COLOR = '#D72519'; // TeckWah 포인트 색상

// 페이지 로드 시 차트 초기화
document.addEventListener('DOMContentLoaded', function () {
  console.log('시각화 페이지 초기화 시작');
  
  // 날짜 필터 버튼 설정
  setupDateFilters();
  
  // 초기 데이터 로드 (기본값: 오늘)
  loadAllData('today');
  
  console.log('시각화 페이지 초기화 완료');
});

/**
 * 날짜 필터 버튼 설정
 */
function setupDateFilters() {
  const dateButtons = document.querySelectorAll('.date-button');
  
  dateButtons.forEach(button => {
    button.addEventListener('click', function() {
      // 이전 버튼 비활성화
      dateButtons.forEach(btn => {
        btn.classList.remove('active');
      });
      
      // 현재 버튼 활성화
      this.classList.add('active');
      
      // 선택된 기간으로 데이터 로드
      const period = this.dataset.period;
      loadAllData(period);
    });
  });
}

/**
 * 선택된 기간으로 모든 데이터 로드
 * @param {string} period - 기간 (today, week, month)
 */
function loadAllData(period) {
  console.log(`데이터 로드 시작: 기간 ${period}`);
  
  // 로딩 표시
  showLoading(true);
  
  // 데이터 가져오기
  fetch(`/visualization/summary?period=${period}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('요약 데이터를 불러오는데 실패했습니다.');
      }
      return response.json();
    })
    .then(summaryData => {
      if (!summaryData.success) {
        throw new Error(summaryData.message || '요약 데이터 로드 실패');
      }
      
      // 요약 카드 업데이트
      updateSummaryCards(summaryData.data);
      
      // 날짜 범위 구하기
      const timeRange = summaryData.timeRange;
      
      // 시간대별 차트 데이터 로드
      return fetch(`/visualization/time-blocks?start_date=${timeRange.start}&end_date=${timeRange.end}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('시간대별 데이터를 불러오는데 실패했습니다.');
          }
          return response.json();
        })
        .then(timeData => {
          if (!timeData.success) {
            throw new Error(timeData.message || '시간대별 데이터 로드 실패');
          }
          
          // 시간대별 차트 업데이트
          updateTimeChart(timeData.data);
          
          // 부서별 상태 데이터 로드
          return fetch(`/visualization/department-status?start_date=${timeRange.start}&end_date=${timeRange.end}`)
            .then(response => {
              if (!response.ok) {
                throw new Error('부서별 데이터를 불러오는데 실패했습니다.');
              }
              return response.json();
            })
            .then(deptData => {
              if (!deptData.success) {
                throw new Error(deptData.message || '부서별 데이터 로드 실패');
              }
              
              // 부서별 상태 차트 업데이트
              updateDepartmentChart(deptData.data);
              
              // 일별 추세 데이터 로드 (기간에 따라 일수 조정)
              let days = 7;
              if (period === 'month') days = 30;
              else if (period === 'week') days = 7;
              else days = 1;
              
              return fetch(`/visualization/daily-trend?days=${days}`)
                .then(response => {
                  if (!response.ok) {
                    throw new Error('일별 추세 데이터를 불러오는데 실패했습니다.');
                  }
                  return response.json();
                })
                .then(trendData => {
                  if (!trendData.success) {
                    throw new Error(trendData.message || '일별 추세 데이터 로드 실패');
                  }
                  
                  // 일별 추세 차트 업데이트
                  updateTrendChart(trendData.data);
                  
                  // 모든 데이터 로드 완료
                  console.log('모든 데이터 로드 완료');
                  showLoading(false);
                });
            });
        });
    })
    .catch(error => {
      console.error('데이터 로드 오류:', error);
      showLoading(false);
      showError('데이터 로드 오류', error.message);
    });
}

/**
 * 요약 카드 업데이트
 * @param {Object} data - 요약 데이터
 */
function updateSummaryCards(data) {
  console.log('요약 카드 업데이트:', data);
  
  document.getElementById('total-orders').textContent = data.total || 0;
  document.getElementById('pending-orders').textContent = data.waiting + data.in_progress || 0;
  document.getElementById('completed-orders').textContent = data.complete || 0;
  document.getElementById('delayed-orders').textContent = data.delayed || 0;
}

/**
 * 시간대별 차트 업데이트
 * @param {Array} data - 시간대별 데이터
 */
function updateTimeChart(data) {
  console.log('시간대별 차트 업데이트:', data);
  
  const canvas = document.getElementById('time-chart');
  const ctx = canvas.getContext('2d');
  
  // 기존 차트가 있으면 파괴
  if (canvas.chart) {
    canvas.chart.destroy();
  }
  
  // 데이터 준비
  const timeBlocks = data.map(item => item.timeBlock);
  const datasets = [
    {
      label: 'CS',
      data: data.map(item => item.CS || 0),
      backgroundColor: DEPT_COLORS.CS,
      borderColor: DEPT_COLORS.CS,
      borderWidth: 1
    },
    {
      label: 'HES',
      data: data.map(item => item.HES || 0),
      backgroundColor: DEPT_COLORS.HES,
      borderColor: DEPT_COLORS.HES,
      borderWidth: 1
    },
    {
      label: 'LENOVO',
      data: data.map(item => item.LENOVO || 0),
      backgroundColor: DEPT_COLORS.LENOVO,
      borderColor: DEPT_COLORS.LENOVO,
      borderWidth: 1
    }
  ];
  
  // 차트 생성
  canvas.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: timeBlocks,
      datasets: datasets
    },
    options: {
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
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            precision: 0
          }
        }
      },
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value}건`;
            }
          }
        }
      }
    }
  });
}

/**
 * 부서별 상태 차트 업데이트
 * @param {Object} data - 부서별 상태 데이터
 */
function updateDepartmentChart(data) {
  console.log('부서별 상태 차트 업데이트:', data);
  
  const container = document.getElementById('department-chart');
  container.innerHTML = '';
  
  // 부서별 데이터 처리
  Object.entries(data).forEach(([dept, deptData]) => {
    // 부서 항목 생성
    const deptElement = document.createElement('div');
    deptElement.className = 'department-item';
    
    // 부서 제목
    const deptTitle = document.createElement('h3');
    deptTitle.className = 'dept-title';
    deptTitle.textContent = `${dept} (총 ${deptData.total}건)`;
    deptElement.appendChild(deptTitle);
    
    // 상태 바 컨테이너
    const statusBars = document.createElement('div');
    statusBars.className = 'status-bars';
    
    // 각 상태별 바 생성
    deptData.statuses.forEach(statusData => {
      const percentage = deptData.total > 0 ? (statusData.count / deptData.total * 100) : 0;
      
      // 상태 바 컨테이너
      const statusBar = document.createElement('div');
      statusBar.className = 'status-bar';
      
      // 상태 라벨
      const statusLabel = document.createElement('div');
      statusLabel.className = 'status-label';
      statusLabel.textContent = `${statusData.label} (${statusData.count})`;
      statusBar.appendChild(statusLabel);
      
      // 상태 프로그레스 바
      const statusProgress = document.createElement('div');
      statusProgress.className = 'status-progress';
      
      // 상태 프로그레스 바 채우기
      const statusFill = document.createElement('div');
      statusFill.className = `status-fill status-${statusData.status.toLowerCase()}`;
      statusFill.style.width = `${percentage}%`;
      statusFill.textContent = percentage > 5 ? `${Math.round(percentage)}%` : '';
      
      statusProgress.appendChild(statusFill);
      statusBar.appendChild(statusProgress);
      
      // 상태바를 컨테이너에 추가
      statusBars.appendChild(statusBar);
    });
    
    deptElement.appendChild(statusBars);
    container.appendChild(deptElement);
  });
}

/**
 * 일별 추세 차트 업데이트
 * @param {Array} data - 일별 추세 데이터
 */
function updateTrendChart(data) {
  console.log('일별 추세 차트 업데이트:', data);
  
  const canvas = document.getElementById('trend-chart');
  const ctx = canvas.getContext('2d');
  
  // 기존 차트가 있으면 파괴
  if (canvas.chart) {
    canvas.chart.destroy();
  }
  
  // 날짜 및 요일 포맷팅
  const formattedDates = data.map(item => {
    const date = new Date(item.date);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = item.dayOfWeek;
    return `${month}/${day} (${dayOfWeek})`;
  });
  
  // 데이터 준비
  const datasets = [
    {
      label: '대기',
      data: data.map(item => item.WAITING || 0),
      backgroundColor: '#fffbe6',
      borderColor: '#faad14',
      borderWidth: 1,
      stack: 'Stack 0'
    },
    {
      label: '진행',
      data: data.map(item => item.IN_PROGRESS || 0),
      backgroundColor: '#e6f7ff',
      borderColor: '#1890ff',
      borderWidth: 1,
      stack: 'Stack 0'
    },
    {
      label: '완료',
      data: data.map(item => item.COMPLETE || 0),
      backgroundColor: '#f6ffed',
      borderColor: '#52c41a',
      borderWidth: 1,
      stack: 'Stack 0'
    },
    {
      label: '이슈',
      data: data.map(item => item.ISSUE || 0),
      backgroundColor: '#fff2f0',
      borderColor: '#f5222d',
      borderWidth: 1,
      stack: 'Stack 0'
    },
    {
      label: '취소',
      data: data.map(item => item.CANCEL || 0),
      backgroundColor: '#f5f5f5',
      borderColor: '#8c8c8c',
      borderWidth: 1,
      stack: 'Stack 0'
    }
  ];
  
  // 차트 생성
  canvas.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: formattedDates,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          grid: {
            display: false
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            precision: 0
          }
        }
      },
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value}건`;
            }
          }
        }
      }
    }
  });
}

/**
 * 로딩 표시/숨김
 * @param {boolean} show - 로딩 표시 여부
 */
function showLoading(show) {
  const indicators = document.querySelectorAll('.loading-indicator');
  indicators.forEach(indicator => {
    indicator.style.display = show ? 'flex' : 'none';
  });
}

/**
 * 오류 메시지 표시
 * @param {string} title - 오류 제목
 * @param {string} message - 오류 메시지
 */
function showError(title, message) {
  console.error(`${title}: ${message}`);
  
  // 이전 오류 메시지 제거
  const existingError = document.querySelector('.error-toast');
  if (existingError) {
    existingError.remove();
  }
  
  // 오류 메시지 생성
  const errorToast = document.createElement('div');
  errorToast.className = 'error-toast';
  errorToast.innerHTML = `
    <div class="error-icon"><i class="fas fa-exclamation-circle"></i></div>
    <div class="error-content">
      <div class="error-title">${title}</div>
      <div class="error-message">${message}</div>
    </div>
    <div class="error-close"><i class="fas fa-times"></i></div>
  `;
  
  // 닫기 버튼 이벤트
  const closeBtn = errorToast.querySelector('.error-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      errorToast.remove();
    });
  }
  
  // 문서에 추가
  document.body.appendChild(errorToast);
  
  // 5초 후 자동 제거
  setTimeout(() => {
    if (errorToast.parentNode) {
      errorToast.classList.add('fade-out');
      setTimeout(() => {
        if (errorToast.parentNode) {
          errorToast.remove();
        }
      }, 300);
    }
  }, 5000);
}
