/**
 * 시각화 페이지 모듈 (개선된 버전)
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
    chartType: "",
    startDate: "",
    endDate: "",
    department: "",
  },

  /**
   * 페이지 초기화
   */
  init: function () {
    console.log("시각화 페이지 초기화...");

    // 날짜 필터 초기값 설정
    this.initDateFilter();

    // 이벤트 리스너 등록
    this.registerEventListeners();

    // 데이터 로드되었으면 페이지 초기화 완료
    if (TMS.store.isDataLoaded) {
      console.log("시각화 페이지 초기화 완료");
      // 기본 시각화 유형 선택 및 차트 자동 표시
      this.setDefaultVisualization();
    } else {
      // 데이터 로드 대기
      document.addEventListener("tms:dataLoaded", () => {
        console.log("시각화 페이지: 데이터 로드 완료");
        // 기본 시각화 유형 선택 및 차트 자동 표시
        this.setDefaultVisualization();
      });
    }
  },

  /**
   * 기본 시각화 유형 선택 및 차트 자동 표시
   */
  setDefaultVisualization: function () {
    // 기본 시각화 유형 '시간대별 주문 접수'로 설정
    const selectElement = document.getElementById("vizChartType");
    selectElement.value = "time";

    // 필터 값 설정
    this.filters.chartType = "time";

    // 필터 적용 후 차트 자동 생성
    setTimeout(() => {
      this.generateCharts();
    }, 100);
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
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // 날짜 필터에 설정
    document.getElementById("vizStartDate").value = formatDate(lastWeek);
    document.getElementById("vizEndDate").value = formatDate(today);

    // 필터 상태에 저장
    this.filters.startDate = formatDate(lastWeek);
    this.filters.endDate = formatDate(today);
  },

  /**
   * 이벤트 리스너 등록
   */
  registerEventListeners: function () {
    // 차트 유형 선택 드롭다운
    document.getElementById("vizChartType").addEventListener("change", (e) => {
      this.handleChartTypeChange(e.target.value);
    });

    // 필터 적용 버튼
    document
      .getElementById("applyVizFilterBtn")
      .addEventListener("click", () => {
        this.generateCharts();
      });

    // 날짜 필터
    document.getElementById("vizStartDate").addEventListener("change", (e) => {
      this.filters.startDate = e.target.value;
    });

    document.getElementById("vizEndDate").addEventListener("change", (e) => {
      this.filters.endDate = e.target.value;
    });

    // 부서 필터
    document
      .getElementById("vizDepartmentFilter")
      .addEventListener("change", (e) => {
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
    document.getElementById("chartPlaceholder").style.display = "flex";
    document.getElementById("chartContainerWrapper").style.display = "none";

    // 부서별 차트 컨테이너 초기화
    document.getElementById("departmentChartsContainer").style.display = "none";
    document.getElementById("mainChartContainer").style.display = "none";
  },

  /**
   * 차트 생성
   */
  generateCharts: function () {
    // 필수 필드 검증
    if (!this.filters.chartType) {
      messageUtils.warning("차트 유형을 선택해주세요.");
      return;
    }

    if (!this.filters.startDate || !this.filters.endDate) {
      messageUtils.warning("기간을 선택해주세요.");
      return;
    }

    // 차트 표시 영역 업데이트
    document.getElementById("chartPlaceholder").style.display = "none";
    document.getElementById("chartContainerWrapper").style.display = "block";

    // 로딩 표시
    document.getElementById("timeChartLoading").style.display = "block";

    // 선택된 차트 유형에 따라 다른 차트 렌더링
    if (this.filters.chartType === "time") {
      // 시간대별 주문 접수 차트 표시
      document.getElementById("mainChartContainer").style.display = "block";
      document.getElementById("departmentChartsContainer").style.display =
        "none";
      this.renderTimeChart();
    } else if (this.filters.chartType === "dept-status") {
      // 부서별 배송 상태 분포 차트 표시
      document.getElementById("mainChartContainer").style.display = "none";
      document.getElementById("departmentChartsContainer").style.display =
        "block";
      this.renderDepartmentCharts();
    }
  },

  /**
   * 시간대별 주문 접수 차트 렌더링
   */
  renderTimeChart: function () {
    // 기존 차트 파괴
    if (this.charts.orderTimeChart) {
      this.charts.orderTimeChart.destroy();
    }

    // 시간대별 필터링된 데이터 가져오기
    const { startDate, endDate, department } = this.filters;
    const filteredData = this.getFilteredData(
      startDate,
      endDate,
      "create_time"
    );

    // 시간대별 부서별 주문 수 계산
    const timeData = this.calculateTimeBasedOrders(filteredData);

    // 부서별 색상 설정
    const deptColors = {
      CS: {
        backgroundColor: "rgba(24, 144, 255, 0.6)",
        borderColor: "rgba(24, 144, 255, 1)",
      },
      HES: {
        backgroundColor: "rgba(82, 196, 26, 0.6)",
        borderColor: "rgba(82, 196, 26, 1)",
      },
      LENOVO: {
        backgroundColor: "rgba(245, 34, 45, 0.6)",
        borderColor: "rgba(245, 34, 45, 1)",
      },
    };

    // 데이터셋 구성
    const datasets = [];

    // 필터링된 부서가 있으면 해당 부서만 표시, 없으면 모든 부서 표시
    const deptsToShow = department
      ? [department]
      : Object.keys(timeData).filter((dept) => dept !== "labels");

    // 각 부서별 데이터셋 생성
    deptsToShow.forEach((dept) => {
      if (dept !== "labels" && timeData[dept]) {
        datasets.push({
          label: `${dept} 부서`,
          data: timeData[dept],
          backgroundColor: deptColors[dept].backgroundColor,
          borderColor: deptColors[dept].borderColor,
          borderWidth: 2,
          borderRadius: 4,
        });
      }
    });

    // 데이터가 없는 경우 처리
    if (datasets.length === 0 || filteredData.length === 0) {
      document.getElementById("timeChartLoading").style.display = "none";
      const ctx = document.getElementById("orderTimeChart").getContext("2d");
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        "해당 기간에 데이터가 없습니다",
        ctx.canvas.width / 2,
        ctx.canvas.height / 2
      );
      return;
    }

    // 차트 생성
    const ctx = document.getElementById("orderTimeChart").getContext("2d");
    this.charts.orderTimeChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: timeData.labels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `기간: ${startDate} ~ ${endDate}`,
            font: { size: 16 },
            padding: { bottom: 20 },
          },
          legend: {
            position: "top",
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            titleFont: { size: 14 },
            bodyFont: { size: 13 },
            padding: 12,
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: ${context.parsed.y}건`;
              },
            },
          },
          datalabels: {
            align: "center",
            anchor: "end",
            formatter: function (value) {
              return value > 0 ? value : "";
            },
            font: {
              weight: "bold",
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
            ticks: {
              precision: 0,
              font: {
                size: 12,
              },
            },
            title: {
              display: true,
              text: "접수 건수",
              font: {
                size: 14,
                weight: "bold",
              },
            },
          },
          x: {
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
            ticks: {
              font: {
                size: 12,
              },
            },
            title: {
              display: true,
              text: "시간대",
              font: {
                size: 14,
                weight: "bold",
              },
            },
          },
        },
      },
    });

    // 로딩 표시 숨기기
    document.getElementById("timeChartLoading").style.display = "none";
  },

  /**
   * 부서별 배송 상태 분포 차트 렌더링
   */
  renderDepartmentCharts: function () {
    // 기존 차트 파괴
    if (this.charts.csChartCanvas) this.charts.csChartCanvas.destroy();
    if (this.charts.hesChartCanvas) this.charts.hesChartCanvas.destroy();
    if (this.charts.lenovoChartCanvas) this.charts.lenovoChartCanvas.destroy();

    // 필터링된 데이터 가져오기 - ETA 기준
    const { startDate, endDate } = this.filters;
    const filteredData = this.getFilteredData(startDate, endDate, "eta");

    // 부서별 데이터 분리
    const csData = filteredData.filter((item) => item.department === "CS");
    const hesData = filteredData.filter((item) => item.department === "HES");
    const lenovoData = filteredData.filter(
      (item) => item.department === "LENOVO"
    );

    // 각 부서별 상태 데이터 계산
    const csStatusData = this.calculateStatusDistribution(csData);
    const hesStatusData = this.calculateStatusDistribution(hesData);
    const lenovoStatusData = this.calculateStatusDistribution(lenovoData);

    // 차트 색상
    const statusColors = {
      PENDING: "rgba(250, 219, 20, 0.7)",
      IN_PROGRESS: "rgba(24, 144, 255, 0.7)",
      COMPLETE: "rgba(82, 196, 26, 0.7)",
      ISSUE: "rgba(245, 34, 45, 0.7)",
      CANCEL: "rgba(89, 89, 89, 0.7)",
      NO_DATA: "rgba(200, 200, 200, 0.7)",
    };

    // CS 부서 차트
    this.charts.csChartCanvas = this.renderDepartmentPieChart(
      "csChartCanvas",
      csStatusData,
      statusColors,
      "상태 분포 - CS"
    );

    // HES 부서 차트
    this.charts.hesChartCanvas = this.renderDepartmentPieChart(
      "hesChartCanvas",
      hesStatusData,
      statusColors,
      "상태 분포 - HES"
    );

    // LENOVO 부서 차트
    this.charts.lenovoChartCanvas = this.renderDepartmentPieChart(
      "lenovoChartCanvas",
      lenovoStatusData,
      statusColors,
      "상태 분포 - LENOVO"
    );

    // 로딩 표시 숨기기
    document.getElementById("timeChartLoading").style.display = "none";
  },

  /**
   * 부서별 파이 차트 렌더링
   */
  renderDepartmentPieChart: function (
    canvasId,
    statusData,
    statusColors,
    title
  ) {
    const ctx = document.getElementById(canvasId).getContext("2d");

    // 상태별 표시 텍스트
    const statusLabels = {
      PENDING: "대기",
      IN_PROGRESS: "진행",
      COMPLETE: "완료",
      ISSUE: "이슈",
      CANCEL: "취소",
      NO_DATA: "데이터 없음",
    };

    // 차트 데이터 준비
    const labels = Object.keys(statusData).map(
      (key) => statusLabels[key] || key
    );
    const data = Object.values(statusData);
    const backgroundColor = Object.keys(statusData).map(
      (key) => statusColors[key]
    );

    // 차트 생성
    return new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: backgroundColor,
            borderColor: "white",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 15,
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: "bold" },
            padding: { bottom: 10 },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return `${label}: ${value}건 (${percentage}%)`;
              },
            },
          },
          datalabels: {
            formatter: function (value, context) {
              const total = context.dataset.data.reduce(
                (sum, val) => sum + val,
                0
              );
              const percentage = Math.round((value / total) * 100);
              return value > 0 ? `${value}건\n(${percentage}%)` : "";
            },
            color: "white",
            font: {
              weight: "bold",
              size: 11,
            },
            textAlign: "center",
          },
        },
        // 데이터가 없는 경우 처리
        elements: {
          arc: {
            borderWidth: 1,
          },
        },
      },
    });
  },

  /**
   * 필터링된 데이터 가져오기
   * @param {string} startDate 시작 날짜
   * @param {string} endDate 종료 날짜
   * @param {string} dateField 날짜 필드 (create_time 또는 eta)
   */
  getFilteredData: function (startDate, endDate, dateField = "create_time") {
    // 날짜 객체로 변환
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // 종료일 마지막 시간으로 설정

    // 대시보드 데이터에서 필터링
    return TMS.store.dashboardData.filter((item) => {
      if (!item[dateField]) return false;

      const date = new Date(item[dateField]);
      if (isNaN(date.getTime())) return false;

      return date >= start && date <= end;
    });
  },

  /**
   * 시간대별 주문 수 계산
   */
  calculateTimeBasedOrders: function (data) {
    // 시간대 라벨 정의 (시간대별 구분에 따라)
    const timeLabels = [
      "09:00~10:00",
      "10:00~11:00",
      "11:00~12:00",
      "12:00~13:00",
      "13:00~14:00",
      "14:00~15:00",
      "15:00~16:00",
      "16:00~17:00",
      "17:00~18:00",
      "18:00~20:00",
      "20:00~00:00",
      "00:00~09:00",
    ];

    // 부서별 시간대 데이터 초기화
    const deptData = {
      CS: Array(timeLabels.length).fill(0),
      HES: Array(timeLabels.length).fill(0),
      LENOVO: Array(timeLabels.length).fill(0),
      labels: timeLabels,
    };

    // 데이터 집계
    data.forEach((item) => {
      if (item.create_time && item.department) {
        const createTime = new Date(item.create_time);
        const hour = createTime.getHours();
        let timeIndex;

        // 시간대 인덱스 결정
        if (hour >= 9 && hour < 18) {
          // 9시~18시는 1시간 단위
          timeIndex = hour - 9; // 9시는 인덱스 0
        } else if (hour >= 18 && hour < 20) {
          // 18시~20시
          timeIndex = 9;
        } else if (hour >= 20 && hour < 24) {
          // 20시~00시
          timeIndex = 10;
        } else {
          // 00시~9시
          timeIndex = 11;
        }

        // 해당 부서와 시간대 집계
        if (deptData[item.department]) {
          deptData[item.department][timeIndex]++;
        }
      }
    });

    return deptData;
  },

  /**
   * 상태별 분포 계산
   */
  calculateStatusDistribution: function (data) {
    // 상태별 데이터 초기화
    const distribution = {
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETE: 0,
      ISSUE: 0,
      CANCEL: 0,
    };

    // 데이터에서 상태별 건수 집계
    data.forEach((item) => {
      if (item.status && distribution[item.status] !== undefined) {
        distribution[item.status]++;
      }
    });

    // 데이터가 있는 상태만 추출
    const result = {};
    for (const [key, value] of Object.entries(distribution)) {
      if (value > 0) {
        result[key] = value;
      }
    }

    // 데이터가 없는 경우 기본값 제공
    if (Object.keys(result).length === 0) {
      result.NO_DATA = 1;
    }

    return result;
  },
};

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", function () {
  // Chart.js 데이터라벨 플러그인 등록 (숫자 표시를 위함)
  Chart.register(ChartDataLabels);

  // 페이지 초기화
  VisualizationPage.init();
});
