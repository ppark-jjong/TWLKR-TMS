import React, { useEffect, useRef } from "react";
import { Spin, Empty } from "antd";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { STATUS_COLORS } from "../../utils/Constants";

/**
 * 부서별 상태 분포 차트 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {string} props.title - 차트 제목
 * @param {Object} props.data - 차트 데이터
 * @param {boolean} props.loading - 로딩 상태
 */
const DepartmentChart = ({ title, data, loading }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // 상태에 따른 라벨 매핑
  const statusLabels = {
    WAITING: "대기",
    IN_PROGRESS: "진행",
    COMPLETE: "완료",
    ISSUE: "이슈",
    CANCEL: "취소",
  };

  // 차트 데이터 초기화 및 업데이트
  useEffect(() => {
    if (loading || !data || !chartRef.current) return;

    // Chart.js 등록
    Chart.register(ChartDataLabels);

    // 기존 차트 인스턴스 제거
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // 차트 데이터 구성
    const statuses = Object.keys(data);
    const values = Object.values(data);

    const chartData = {
      labels: statuses.map((status) => statusLabels[status] || status),
      datasets: [
        {
          data: values,
          backgroundColor: statuses.map((status) => STATUS_COLORS[status]),
          borderWidth: 1,
        },
      ],
    };

    // 총 건수 계산
    const total = values.reduce((sum, value) => sum + value, 0);

    // 차트 생성
    const ctx = chartRef.current.getContext("2d");
    chartInstance.current = new Chart(ctx, {
      type: "doughnut",
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              font: {
                family:
                  "Pretendard, -apple-system, BlinkMacSystemFont, sans-serif",
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.raw || 0;
                const percentage =
                  total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value}건 (${percentage}%)`;
              },
            },
          },
          datalabels: {
            display: function (context) {
              // 값이 0인 경우 라벨 표시 안 함
              return context.dataset.data[context.dataIndex] > 0;
            },
            color: "white",
            font: {
              weight: "bold",
              size: 12,
              family:
                "Pretendard, -apple-system, BlinkMacSystemFont, sans-serif",
            },
            formatter: function (value, context) {
              const percentage =
                total > 0 ? Math.round((value / total) * 100) : 0;
              return percentage >= 5 ? `${percentage}%` : "";
            },
          },
        },
        cutout: "65%",
        radius: "90%",
      },
    });

    // 컴포넌트 언마운트 시 차트 정리
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, loading]);

  // 데이터가 없는 경우
  if (!loading && (!data || Object.keys(data).length === 0)) {
    return (
      <div
        className="chart-empty-container"
        style={{
          height: "250px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Empty description="데이터가 없습니다" />
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "250px" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.7)",
            zIndex: 1,
          }}
        >
          <Spin size="large" />
        </div>
      )}
      <canvas ref={chartRef} />
    </div>
  );
};

export default DepartmentChart;
