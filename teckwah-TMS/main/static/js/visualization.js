/**
 * 시각화 페이지 관리 모듈
 * 배송 현황 데이터를 시각화하는 기능을 제공합니다.
 */
window.Visualization = (function() {
  /**
   * 차트 상태 관리
   */
  const state = {
    period: 'today', // 기본값: 오늘
    graphType: 'time-blocks', // 기본값: 시간대별 접수량
    charts: {
      timeBlock: null,
      departmentStatus: {}
    },
    data: {
      summary: null,
      timeBlocks: null,
      departmentStatus: null
    },
    isLoading: false
  };
  
  // 차트 색상 설정
  const chartColors = {
    departments: {
      CS: 'rgba(54, 162, 235, 0.8)',
      HES: 'rgba(255, 159, 64, 0.8)',
      LENOVO: 'rgba(153, 102, 255, 0.8)'
    },
    status: {
      waiting: 'rgba(255, 206, 86, 0.8)',
      in_progress: 'rgba(54, 162, 235, 0.8)',
      complete: 'rgba(75, 192, 192, 0.8)',
      issue: 'rgba(255, 99, 132, 0.8)',
      cancel: 'rgba(201, 203, 207, 0.8)'
    }
  };
  
  /**
   * 시각화 페이지를 초기화합니다.
   */
  function init() {
    // 인증 확인
    if (window.Auth) {
      Auth.checkLoginStatus().catch(error => {
        console.error('인증 확인 오류:', error);
      });
    }
    
    // UI 요소 이벤트 리스너 설정
    setupEventListeners();
    
    // 초기 데이터 로드
    loadData();
    
    console.log('시각화 페이지 초기화 완료');
  }
  
  /**
   * 이벤트 리스너를 설정합니다.
   */
  function setupEventListeners() {
    // 기간 선택 버튼
    document.querySelectorAll('.date-button').forEach(button => {
      button.addEventListener('click', function() {
        // 이미 선택된 버튼이면 무시
        if (this.classList.contains('active')) return;
        
        // 기존 선택 해제
        document.querySelectorAll('.date-button').forEach(btn => {
          btn.classList.remove('active');
        });
        
        // 새 선택 활성화
        this.classList.add('active');
        
        // 상태 업데이트
        state.period = this.dataset.period;
        
        // 데이터 다시 로드
        loadData();
      });
    });
    
    // 그래프 유형 선택
    const graphTypeSelect = document.getElementById('graphTypeSelect');
    if (graphTypeSelect) {
      graphTypeSelect.addEventListener('change', function() {
        state.graphType = this.value;
        updateChartVisibility();
      });
    }
    
    // 조회 버튼
    const loadGraphBtn = document.getElementById('loadGraphBtn');
    if (loadGraphBtn) {
      loadGraphBtn.addEventListener('click', function() {
        loadData();
      });
    }
  }
  
  /**
   * 선택된 그래프 유형에 따라 차트 표시/숨김을 업데이트합니다.
   */
  function updateChartVisibility() {
    const timeBlockContainer = document.getElementById('timeBlockChartContainer');
    const departmentStatusContainer = document.getElementById('departmentStatusChartContainer');
    
    if (state.graphType === 'time-blocks') {
      if (timeBlockContainer) timeBlockContainer.style.display = '';
      if (departmentStatusContainer) departmentStatusContainer.style.display = 'none';
      
      // 시간대별 접수량 데이터 로드
      if (!state.data.timeBlocks) {
        loadTimeBlockData();
      } else {
        updateTimeBlockChart(state.data.timeBlocks);
      }
    } else {
      if (timeBlockContainer) timeBlockContainer.style.display = 'none';
      if (departmentStatusContainer) departmentStatusContainer.style.display = '';
      
      // 부서별 상태 현황 데이터 로드
      if (!state.data.departmentStatus) {
        loadDepartmentStatusData();
      } else {
        updateDepartmentStatusCharts(state.data.departmentStatus);
      }
    }
  }
  
  /**
   * 로딩 표시를 설정합니다.
   * @param {string} selector - 로딩 표시할 요소 선택자
   * @param {boolean} isLoading - 로딩 상태
   */
  function setLoading(selector, isLoading) {
    const container = document.querySelector(selector);
    if (!container) return;
    
    const loadingIndicator = container.querySelector('.loading-indicator');
    const noDataMessage = container.querySelector('.no-data-message');
    
    if (loadingIndicator) {
      loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    }
    
    // 데이터 없음 메시지는 로딩 중에는 항상 숨김
    if (noDataMessage && isLoading) {
      noDataMessage.style.display = 'none';
    }
  }
  
  /**
   * 데이터 없음 메시지를 표시합니다.
   * @param {string} selector - 메시지를 표시할 요소 선택자
   * @param {boolean} show - 표시 여부
   */
  function showNoDataMessage(selector, show) {
    const container = document.querySelector(selector);
    if (!container) return;
    
    const noDataMessage = container.querySelector('.no-data-message');
    if (noDataMessage) {
      noDataMessage.style.display = show ? 'flex' : 'none';
    }
  }
  
  /**
   * 전체 데이터를 로드합니다.
   */
  async function loadData() {
    // 선택된 그래프 유형에 따라 데이터 로드
    if (state.graphType === 'time-blocks') {
      await Promise.all([
        loadSummaryData(),
        loadTimeBlockData()
      ]);
    } else {
      await Promise.all([
        loadSummaryData(),
        loadDepartmentStatusData()
      ]);
    }
  }
  
  /**
   * 요약 데이터를 로드합니다.
   */
  async function loadSummaryData() {
    try {
      // 로딩 표시
      document.querySelectorAll('.summary-card .loading-indicator').forEach(indicator => {
        indicator.style.display = 'flex';
      });
      
      // API 요청
      const response = await fetch(`/visualization/summary?period=${state.period}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        state.data.summary = data.data;
        updateSummaryCards(data.data);
      } else {
        showAlert(data.message || '요약 데이터를 불러오는데 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('요약 데이터 로드 중 오류:', error);
      showAlert('요약 데이터를 불러오는데 실패했습니다.', 'error');
    } finally {
      // 로딩 숨김
      document.querySelectorAll('.summary-card .loading-indicator').forEach(indicator => {
        indicator.style.display = 'none';
      });
    }
  }
  
  /**
   * 시간대별 접수량 데이터를 로드합니다.
   */
  async function loadTimeBlockData() {
    try {
      // 로딩 표시
      setLoading('#timeBlockChartContainer', true);
      
      // API 요청
      const response = await fetch(`/visualization/time-blocks?period=${state.period}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        state.data.timeBlocks = data.data;
        updateTimeBlockChart(data.data);
        
        // 데이터 없음 메시지 표시/숨김
        showNoDataMessage('#timeBlockChartContainer', data.data.length === 0);
      } else {
        showAlert(data.message || '시간대별 접수량 데이터를 불러오는데 실패했습니다.', 'error');
        showNoDataMessage('#timeBlockChartContainer', true);
      }
    } catch (error) {
      console.error('시간대별 접수량 데이터 로드 중 오류:', error);
      showAlert('시간대별 접수량 데이터를 불러오는데 실패했습니다.', 'error');
      showNoDataMessage('#timeBlockChartContainer', true);
    } finally {
      // 로딩 숨김
      setLoading('#timeBlockChartContainer', false);
    }
  }
  
  /**
   * 부서별 상태 현황 데이터를 로드합니다.
   */
  async function loadDepartmentStatusData() {
    try {
      // 로딩 표시
      setLoading('#departmentStatusChartContainer', true);
      
      // API 요청
      const response = await fetch(`/visualization/department-status?period=${state.period}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        state.data.departmentStatus = data.data;
        updateDepartmentStatusCharts(data.data);
        
        // 데이터 없음 메시지 표시/숨김
        const isEmpty = Object.values(data.data).every(dept => 
          Object.values(dept).every(count => count === 0)
        );
        showNoDataMessage('#departmentStatusChartContainer', isEmpty);
      } else {
        showAlert(data.message || '부서별 상태 현황 데이터를 불러오는데 실패했습니다.', 'error');
        showNoDataMessage('#departmentStatusChartContainer', true);
      }
    } catch (error) {
      console.error('부서별 상태 현황 데이터 로드 중 오류:', error);
      showAlert('부서별 상태 현황 데이터를 불러오는데 실패했습니다.', 'error');
      showNoDataMessage('#departmentStatusChartContainer', true);
    } finally {
      // 로딩 숨김
      setLoading('#departmentStatusChartContainer', false);
    }
  }
  
  /**
   * 요약 카드를 업데이트합니다.
   * @param {Object} data - 요약 데이터
   */
  function updateSummaryCards(data) {
    // 요약 카드 값 업데이트
    document.getElementById('total-orders').textContent = data.total || 0;
    document.getElementById('pending-orders').textContent = data.in_progress || 0;
    document.getElementById('completed-orders').textContent = data.complete || 0;
    document.getElementById('delayed-orders').textContent = data.issue || 0;
  }
  
  /**
   * 시간대별 접수량 차트를 업데이트합니다.
   * @param {Array} data - 시간대별 접수량 데이터
   */
  function updateTimeBlockChart(data) {
    const canvas = document.getElementById('timeBlockChart');
    if (!canvas) return;
    
    // 기존 차트 있으면 파기
    if (state.charts.timeBlock) {
      state.charts.timeBlock.destroy();
    }
    
    // 데이터 없으면 빈 차트 표시
    if (!data || data.length === 0) {
      showNoDataMessage('#timeBlockChartContainer', true);
      return;
    }
    
    // 데이터 가공
    const labels = data.map(item => item.time_block); // 시간대
    const departmentNames = ['CS', 'HES', 'LENOVO']; // 부서 목록
    
    // 부서별 데이터셋 생성
    const datasets = departmentNames.map(dept => {
      return {
        label: dept,
        data: data.map(item => item[dept.toLowerCase()] || 0),
        backgroundColor: chartColors.departments[dept],
        borderColor: chartColors.departments[dept].replace('0.8', '1'),
        borderWidth: 1
      };
    });
    
    // 차트 생성
    state.charts.timeBlock = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: datasets
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
            text: '시간대별 접수량'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: {
            stacked: false,
            title: {
              display: true,
              text: '시간대'
            }
          },
          y: {
            stacked: false,
            beginAtZero: true,
            title: {
              display: true,
              text: '접수량'
            },
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
    
    // 데이터 없음 메시지 숨김
    showNoDataMessage('#timeBlockChartContainer', false);
  }
  
  /**
   * 부서별 상태 현황 차트를 업데이트합니다.
   * @param {Object} data - 부서별 상태 현황 데이터
   */
  function updateDepartmentStatusCharts(data) {
    const container = document.getElementById('departmentStatusChart');
    if (!container) return;
    
    // 컨테이너 초기화
    container.innerHTML = '';
    
    // 기존 차트 객체 정리
    Object.values(state.charts.departmentStatus).forEach(chart => {
      if (chart) chart.destroy();
    });
    state.charts.departmentStatus = {};
    
    // 데이터 없으면 메시지 표시
    const isEmpty = Object.values(data).every(dept => 
      Object.values(dept).every(count => count === 0)
    );
    
    if (isEmpty) {
      showNoDataMessage('#departmentStatusChartContainer', true);
      return;
    }
    
    // 부서별 파이 차트 생성
    const departments = Object.keys(data);
    
    departments.forEach(dept => {
      // 부서 데이터
      const deptData = data[dept];
      
      // 값이 모두 0이면 건너뜀
      if (Object.values(deptData).every(value => value === 0)) {
        return;
      }
      
      // 차트 컨테이너 생성
      const chartDiv = document.createElement('div');
      chartDiv.className = 'pie-chart-wrapper';
      
      const canvas = document.createElement('canvas');
      canvas.id = `${dept.toLowerCase()}-chart`;
      chartDiv.appendChild(canvas);
      
      // 제목 추가
      const title = document.createElement('h3');
      title.className = 'chart-title';
      title.textContent = dept;
      chartDiv.appendChild(title);
      
      container.appendChild(chartDiv);
      
      // 차트 데이터 구성
      const statusLabels = {
        waiting: '대기',
        in_progress: '진행 중',
        complete: '완료',
        issue: '이슈',
        cancel: '취소'
      };
      
      const chartData = {
        labels: Object.keys(deptData).map(key => statusLabels[key] || key),
        datasets: [{
          data: Object.values(deptData),
          backgroundColor: Object.keys(deptData).map(key => chartColors.status[key] || '#ccc'),
          borderWidth: 1
        }]
      };
      
      // 차트 생성
      state.charts.departmentStatus[dept] = new Chart(canvas, {
        type: 'pie',
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const value = context.raw;
                  const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${context.label}: ${value}건 (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    });
    
    // 데이터 없음 메시지 숨김
    showNoDataMessage('#departmentStatusChartContainer', false);
  }
  
  /**
   * 알림 메시지를 표시합니다.
   * @param {string} message - 표시할 메시지
   * @param {string} type - 알림 유형 (success, error, warning, info)
   */
  function showAlert(message, type = 'info') {
    if (window.Alerts) {
      Alerts.show(message, type);
    } else if (window.Utils && Utils.showAlert) {
      Utils.showAlert(message, type);
    } else {
      alert(message);
    }
  }
  
  // 페이지 로드 시 초기화
  document.addEventListener('DOMContentLoaded', init);
  
  // 공개 API
  return {
    init,
    loadData,
    updateChartVisibility
  };
})();
