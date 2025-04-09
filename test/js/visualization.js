/**
 * 시각화 페이지 스크립트
 */

// 차트 객체 저장 변수
let mainChart = null;

// 시각화 페이지 초기화
function initVisualization() {
  console.log('시각화 페이지 초기화');
  
  // 페이지 타이틀 설정
  setPageTitle('데이터 시각화');
  
  // 차트 필터 버튼 이벤트 설정
  const applyFilterBtn = document.getElementById('applyFilterBtn');
  if (applyFilterBtn) {
    applyFilterBtn.addEventListener('click', renderChart);
  }
  
  // 기본 날짜 필터 설정 - 오늘 기준 ±14일
  setDefaultDateFilter();
  
  // 데이터 로드
  loadAppData().then(() => {
    // 초기 차트 렌더링
    renderChart();
  });
}

// 기본 날짜 필터 설정 (오늘 기준 ±14일)
function setDefaultDateFilter() {
  const today = new Date();
  
  // 2주 전
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 14);
  
  // 2주 후
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 14);
  
  // YYYY-MM-DD 형식으로 변환
  const formatDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // 입력 필드에 날짜 설정
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  
  if (startDateInput) startDateInput.value = formatDateInput(startDate);
  if (endDateInput) endDateInput.value = formatDateInput(endDate);
}

// 차트 렌더링
function renderChart() {
  // 차트 유형 가져오기
  const chartType = document.getElementById('chartType').value;
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  
  // 필터링할 날짜 설정
  const filters = {
    startDate,
    endDate
  };
  
  // 데이터 필터링
  const filteredData = filterDashboardData(filters);
  
  // 차트 유형에 따라 다른 차트 렌더링
  switch (chartType) {
    case 'status':
      renderStatusChart(filteredData);
      break;
    case 'time':
      renderTimeChart(filteredData);
      break;
    case 'department':
      renderDepartmentChart(filteredData);
      break;
    default:
      renderStatusChart(filteredData);
  }
}

// 상태별 분포 차트 렌더링
function renderStatusChart(data) {
  const canvas = document.getElementById('mainChart');
  const ctx = canvas.getContext('2d');
  
  // 기존 차트가 있으면 제거
  if (mainChart) {
    mainChart.destroy();
  }
  
  // 데이터 분석
  const statusCount = {
    'PENDING': 0,
    'IN_PROGRESS': 0,
    'COMPLETE': 0,
    'ISSUE': 0,
    'CANCEL': 0
  };
  
  // 각 상태별 개수 계산
  data.forEach(item => {
    if (item.status in statusCount) {
      statusCount[item.status]++;
    }
  });
  
  // 차트 데이터 준비
  const chartData = {
    labels: ['대기', '진행', '완료', '이슈', '취소'],
    datasets: [{
      label: '주문 상태 분포',
      data: [
        statusCount['PENDING'],
        statusCount['IN_PROGRESS'],
        statusCount['COMPLETE'],
        statusCount['ISSUE'],
        statusCount['CANCEL']
      ],
      backgroundColor: [
        '#6c757d',  // 대기
        '#0d6efd',  // 진행
        '#198754',  // 완료
        '#dc3545',  // 이슈
        '#343a40'   // 취소
      ],
      borderWidth: 1
    }]
  };
  
  // 차트 옵션
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '주문 상태별 분포'
      }
    }
  };
  
  // 차트 생성
  mainChart = new Chart(ctx, {
    type: 'pie',
    data: chartData,
    options: options
  });
}

// 시간대별 추이 차트 렌더링
function renderTimeChart(data) {
  const canvas = document.getElementById('mainChart');
  const ctx = canvas.getContext('2d');
  
  // 기존 차트가 있으면 제거
  if (mainChart) {
    mainChart.destroy();
  }
  
  // 날짜별 주문 수 집계
  const dateCount = {};
  
  // 각 날짜별 주문 수 계산
  data.forEach(item => {
    if (item.eta) {
      const date = item.eta.split('T')[0]; // YYYY-MM-DD 부분만 추출
      if (date in dateCount) {
        dateCount[date]++;
      } else {
        dateCount[date] = 1;
      }
    }
  });
  
  // 날짜 정렬
  const sortedDates = Object.keys(dateCount).sort();
  
  // 차트 데이터 준비
  const chartData = {
    labels: sortedDates,
    datasets: [{
      label: '일별 주문 수',
      data: sortedDates.map(date => dateCount[date]),
      backgroundColor: 'rgba(13, 110, 253, 0.5)',
      borderColor: 'rgba(13, 110, 253, 1)',
      borderWidth: 1,
      tension: 0.1
    }]
  };
  
  // 차트 옵션
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '주문 수'
        }
      },
      x: {
        title: {
          display: true,
          text: '날짜'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '일별 주문 추이'
      }
    }
  };
  
  // 차트 생성
  mainChart = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: options
  });
}

// 부서별 분포 차트 렌더링
function renderDepartmentChart(data) {
  const canvas = document.getElementById('mainChart');
  const ctx = canvas.getContext('2d');
  
  // 기존 차트가 있으면 제거
  if (mainChart) {
    mainChart.destroy();
  }
  
  // 부서별 상태 데이터 분석
  const deptData = {
    'CS': {
      'PENDING': 0,
      'IN_PROGRESS': 0,
      'COMPLETE': 0,
      'ISSUE': 0,
      'CANCEL': 0
    },
    'HES': {
      'PENDING': 0,
      'IN_PROGRESS': 0,
      'COMPLETE': 0,
      'ISSUE': 0,
      'CANCEL': 0
    },
    'LENOVO': {
      'PENDING': 0,
      'IN_PROGRESS': 0,
      'COMPLETE': 0,
      'ISSUE': 0,
      'CANCEL': 0
    }
  };
  
  // 각 부서별 상태 집계
  data.forEach(item => {
    if (item.department && item.status) {
      if (item.department in deptData && item.status in deptData[item.department]) {
        deptData[item.department][item.status]++;
      }
    }
  });
  
  // 차트 데이터 준비
  const chartData = {
    labels: ['CS', 'HES', 'LENOVO'],
    datasets: [
      {
        label: '대기',
        data: [deptData['CS']['PENDING'], deptData['HES']['PENDING'], deptData['LENOVO']['PENDING']],
        backgroundColor: '#6c757d'
      },
      {
        label: '진행',
        data: [deptData['CS']['IN_PROGRESS'], deptData['HES']['IN_PROGRESS'], deptData['LENOVO']['IN_PROGRESS']],
        backgroundColor: '#0d6efd'
      },
      {
        label: '완료',
        data: [deptData['CS']['COMPLETE'], deptData['HES']['COMPLETE'], deptData['LENOVO']['COMPLETE']],
        backgroundColor: '#198754'
      },
      {
        label: '이슈',
        data: [deptData['CS']['ISSUE'], deptData['HES']['ISSUE'], deptData['LENOVO']['ISSUE']],
        backgroundColor: '#dc3545'
      },
      {
        label: '취소',
        data: [deptData['CS']['CANCEL'], deptData['HES']['CANCEL'], deptData['LENOVO']['CANCEL']],
        backgroundColor: '#343a40'
      }
    ]
  };
  
  // 차트 옵션
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
        title: {
          display: true,
          text: '주문 수'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: '부서별 주문 상태 분포'
      }
    }
  };
  
  // 차트 생성
  mainChart = new Chart(ctx, {
    type: 'bar',
    data: chartData,
    options: options
  });
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initVisualization);
