import React, { useEffect, useRef } from 'react';
import { Spin, Empty } from 'antd';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { DEPARTMENT_COLORS, TIME_LABELS } from '../../utils/constants';

/**
 * 시간대별 주문 접수 차트 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {Object} props.data - 차트 데이터
 * @param {boolean} props.loading - 로딩 상태
 */
const TimeChart = ({ data, loading }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

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
    const timeLabels = Object.keys(data).sort((a, b) => {
      // 숫자로 변환해서 정렬
      const aNum = parseInt(a.split('-')[0], 10);
      const bNum = parseInt(b.split('-')[0], 10);
      return aNum - bNum;
    });
    
    const datasets = [];

    // 부서별 데이터 추출
    if (data[timeLabels[0]] && typeof data[timeLabels[0]] === 'object') {
      const departments = ['CS', 'HES', 'LENOVO'].filter(
        dept => timeLabels.some(time => data[time][dept] !== undefined)
      );

      // 부서별 데이터셋 생성
      departments.forEach(dept => {
        const deptData = timeLabels.map(time => data[time][dept] || 0);
        
        datasets.push({
          label: dept,
          data: deptData,
          backgroundColor: DEPARTMENT_COLORS[dept] || '#999',
          borderColor: DEPARTMENT_COLORS[dept] || '#999',
          borderWidth: 1,
        });
      });
    } else {
      // 단일 데이터셋인 경우
      datasets.push({
        label: '주문 수',
        data: timeLabels.map(time => data[time] || 0),
        backgroundColor: '#1890ff',
        borderColor: '#1890ff',
        borderWidth: 1,
      });
    }

    // 차트 생성
    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: timeLabels.map(time => TIME_LABELS[time] || time),
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: {
                family: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
              }
            }
          },
          title: {
            display: true,
            text: '시간대별 주문 접수 현황',
            font: {
              size: 16,
              family: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
              weight: 'bold'
            },
            padding: {
              top: 10,
              bottom: 20
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.raw;
                return `${label}: ${value}건`;
              }
            }
          },
          datalabels: {
            display: function(context) {
              return context.dataset.data[context.dataIndex] > 0;
            },
            color: 'white',
            font: {
              weight: 'bold',
              size: 11,
            },
            formatter: function(value) {
              return value;
            },
            anchor: 'center',
            align: 'center',
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: '시간대',
              font: {
                size: 14,
                family: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
              }
            },
            ticks: {
              font: {
                family: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
              }
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '주문 건수',
              font: {
                size: 14,
                family: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
              }
            },
            ticks: {
              stepSize: 1,
              font: {
                family: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
              }
            }
          },
        },
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
      <div className="chart-empty-container" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="데이터가 없습니다" />
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '400px' }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.7)',
          zIndex: 1,
        }}>
          <Spin size="large" />
        </div>
      )}
      <canvas ref={chartRef} />
    </div>
  );
};

export default TimeChart;
