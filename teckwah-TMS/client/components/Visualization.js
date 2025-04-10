import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Radio,
  DatePicker,
  Select,
  Button,
  Table,
  Spin,
  Alert,
  Space,
  Row,
  Col,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useQuery } from 'react-query';
import dayjs from 'dayjs';
import Chart from 'chart.js/auto';
import { getVisualizationData } from '../utils/Api';
import { STATUS_TEXT_MAP, STATUS_COLORS } from '../utils/Constants';

const { RangePicker } = DatePicker;

const Visualization = () => {
  // 상태 관리
  const [chartType, setChartType] = useState('time');
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(14, 'day'),
    dayjs(),
  ]);
  const [department, setDepartment] = useState('');
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // 데이터 조회
  const { data, isLoading, error, refetch } = useQuery(
    ['visualization', chartType, dateRange, department],
    () =>
      getVisualizationData({
        chart_type: chartType,
        start_date: dateRange[0]?.format('YYYY-MM-DD'),
        end_date: dateRange[1]?.format('YYYY-MM-DD'),
        department: department || undefined,
      }),
    {
      enabled: true,
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        if (data?.success && data?.data) {
          renderChart(data.data);
        }
      },
    }
  );

  // 컴포넌트 언마운트 시 차트 정리
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  // 차트 유형 변경 시 차트 다시 렌더링
  useEffect(() => {
    if (data?.success && data?.data) {
      renderChart(data.data);
    }
  }, [chartType, data]);

  // 필터 적용
  const handleApplyFilters = () => {
    refetch();
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setDateRange([dayjs().subtract(14, 'day'), dayjs()]);
    setDepartment('');
    setChartType('time');
  };

  // 차트 렌더링 함수
  const renderChart = (chartData) => {
    if (!chartRef.current || !chartData || chartData.length === 0) return;

    // 기존 차트 정리
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    let config;

    // 총계 데이터 제외
    const filteredData = chartData.filter((item) => item.label !== '총계');

    switch (chartType) {
      case 'time':
        config = createTimeBarChartConfig(filteredData);
        break;
      case 'status':
        config = createStatusPieChartConfig(filteredData);
        break;
      case 'department':
        config = createDepartmentChartConfig(filteredData);
        break;
      default:
        config = createTimeBarChartConfig(filteredData);
    }

    // 차트 생성
    chartInstance.current = new Chart(ctx, config);
  };

  // 시간대별 막대 차트 설정 생성
  const createTimeBarChartConfig = (chartData) => {
    const labels = chartData.map((item) => item.label);
    const data = chartData.map((item) => item.count);

    // 부서별 색상 설정
    const getBackgroundColor = () => {
      switch (department) {
        case 'CS':
          return 'rgba(54, 162, 235, 0.7)';
        case 'HES':
          return 'rgba(255, 159, 64, 0.7)';
        case 'LENOVO':
          return 'rgba(153, 102, 255, 0.7)';
        default:
          return 'rgba(75, 192, 192, 0.7)';
      }
    };

    return {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '배송 건수',
            data: data,
            backgroundColor: getBackgroundColor(),
            borderColor: getBackgroundColor().replace('0.7', '1'),
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
            display: true,
            text: '시간대별 배송 접수 건수',
          },
          tooltip: {
            callbacks: {
              afterLabel: function (context) {
                const percentage = parseFloat(
                  chartData[context.dataIndex].percentage
                );
                return `비율: ${percentage}%`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: '배송 건수',
            },
          },
          x: {
            title: {
              display: true,
              text: '시간대',
            },
          },
        },
      },
    };
  };

  // 상태별 파이 차트 설정 생성
  const createStatusPieChartConfig = (chartData) => {
    const labels = chartData.map((item) => item.label);
    const data = chartData.map((item) => item.count);

    // 상태별 색상 설정
    const backgroundColors = chartData.map((item) => {
      const status = item.rawLabel;
      switch (status) {
        case 'WAITING':
          return 'rgba(255, 205, 86, 0.7)'; // 노란색 (대기)
        case 'IN_PROGRESS':
          return 'rgba(54, 162, 235, 0.7)'; // 파란색 (진행)
        case 'COMPLETE':
          return 'rgba(75, 192, 192, 0.7)'; // 녹색 (완료)
        case 'ISSUE':
          return 'rgba(255, 99, 132, 0.7)'; // 빨간색 (이슈)
        case 'CANCEL':
          return 'rgba(201, 203, 207, 0.7)'; // 회색 (취소)
        default:
          return 'rgba(153, 102, 255, 0.7)'; // 보라색 (기타)
      }
    });

    return {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [
          {
            label: '배송 건수',
            data: data,
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map((color) =>
              color.replace('0.7', '1')
            ),
            borderWidth: 1,
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
          title: {
            display: true,
            text: '배송 상태 분포',
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const percentage = parseFloat(
                  chartData[context.dataIndex].percentage
                );
                return `${label}: ${value}건 (${percentage}%)`;
              },
            },
          },
        },
      },
    };
  };

  // 부서별 도넛 차트 설정 생성
  const createDepartmentChartConfig = (chartData) => {
    const labels = chartData.map((item) => item.label);
    const data = chartData.map((item) => item.count);

    // 부서별 색상 설정
    const backgroundColors = chartData.map((item) => {
      const dept = item.label;
      switch (dept) {
        case 'CS':
          return 'rgba(54, 162, 235, 0.7)'; // 파란색
        case 'HES':
          return 'rgba(255, 159, 64, 0.7)'; // 주황색
        case 'LENOVO':
          return 'rgba(153, 102, 255, 0.7)'; // 보라색
        default:
          return 'rgba(201, 203, 207, 0.7)'; // 회색
      }
    });

    return {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [
          {
            label: '배송 건수',
            data: data,
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map((color) =>
              color.replace('0.7', '1')
            ),
            borderWidth: 1,
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
          title: {
            display: true,
            text: '부서별 배송 현황',
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const percentage = parseFloat(
                  chartData[context.dataIndex].percentage
                );
                return `${label}: ${value}건 (${percentage}%)`;
              },
            },
          },
        },
      },
    };
  };

  // 상태별 현황 요약 테이블 컬럼 정의
  const getStatusColumns = () => {
    return [
      { title: '상태', dataIndex: 'label', key: 'label' },
      { title: '건수', dataIndex: 'count', key: 'count' },
      { title: '비율', dataIndex: 'percentage', key: 'percentage' },
    ];
  };

  // 부서별 현황 요약 테이블 컬럼 정의
  const getDepartmentColumns = () => {
    return [
      { title: '부서', dataIndex: 'label', key: 'label' },
      { title: '건수', dataIndex: 'count', key: 'count' },
      { title: '비율', dataIndex: 'percentage', key: 'percentage' },
      {
        title: '상태별 현황',
        dataIndex: 'statusCounts',
        key: 'statusCounts',
        render: (statusCounts) => {
          if (!statusCounts) return null;

          return (
            <div className="status-counts-container">
              {Object.entries(statusCounts).map(([status, details]) => {
                if (status === 'total') return null;
                return (
                  <div key={status} className="status-count-item">
                    <span>{STATUS_TEXT_MAP[status] || status}:</span>
                    <span>
                      {details.count}건 ({details.percentage})
                    </span>
                  </div>
                );
              })}
            </div>
          );
        },
      },
    ];
  };

  // 현재 차트 유형에 맞는 테이블 컬럼 가져오기
  const getColumns = () => {
    if (chartType === 'department') {
      return getDepartmentColumns();
    }
    return getStatusColumns();
  };

  // 테이블에 표시할 데이터
  const getTableData = () => {
    if (!data?.success || !data?.data) return [];
    return data.data;
  };

  return (
    <Card
      extra={
        <Button icon={<ReloadOutlined />} onClick={refetch} loading={isLoading}>
          새로고침
        </Button>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 필터링 영역 */}
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={24} md={8} lg={8}>
            <Radio.Group
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              style={{ display: 'flex', width: '100%' }}
            >
              <Radio.Button
                value="time"
                style={{ flex: 1, textAlign: 'center' }}
              >
                시간대별
              </Radio.Button>
              <Radio.Button
                value="status"
                style={{ flex: 1, textAlign: 'center' }}
              >
                상태별
              </Radio.Button>
              <Radio.Button
                value="department"
                style={{ flex: 1, textAlign: 'center' }}
              >
                부서별
              </Radio.Button>
            </Radio.Group>
          </Col>

          <Col xs={24} sm={24} md={8} lg={8}>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              allowClear={false}
              placeholder={['시작일', '종료일']}
            />
          </Col>

          <Col xs={24} sm={16} md={5} lg={5}>
            <Select
              placeholder="부서 선택"
              allowClear
              style={{ width: '100%' }}
              value={department}
              onChange={setDepartment}
              options={[
                { label: '전체', value: '' },
                { label: 'CS', value: 'CS' },
                { label: 'HES', value: 'HES' },
                { label: 'LENOVO', value: 'LENOVO' },
              ]}
            />
          </Col>

          <Col xs={24} sm={8} md={3} lg={3}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={handleApplyFilters} type="primary">
                적용
              </Button>
              <Button onClick={handleResetFilters}>초기화</Button>
            </Space>
          </Col>
        </Row>

        {/* 로딩 및 에러 표시 */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip="데이터를 불러오는 중..." />
          </div>
        ) : error || !data?.success ? (
          <Alert
            type="error"
            message="데이터를 불러오는 중 오류가 발생했습니다."
            description={data?.message || error?.message}
          />
        ) : (
          <>
            {/* 차트 영역 */}
            <div style={{ height: '400px', position: 'relative' }}>
              <canvas ref={chartRef} />
            </div>

            {/* 데이터 테이블 */}
            <Table
              dataSource={getTableData()}
              columns={getColumns()}
              rowKey="label"
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
            />
          </>
        )}
      </Space>
    </Card>
  );
};

export default Visualization;
