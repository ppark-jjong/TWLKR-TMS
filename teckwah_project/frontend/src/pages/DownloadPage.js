// src/pages/DownloadPage.js - 간소화된 버전
import React, { useState, useCallback, useEffect } from 'react';
import {
  Layout,
  Card,
  DatePicker,
  Button,
  Space,
  Typography,
  Alert,
  message,
  Result,
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useDateRange } from '../utils/useDateRange';
import DownloadService from '../services/DownloadService';
import { useLogger } from '../utils/LogUtils';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import { FONT_STYLES } from '../utils/Constants';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/**
 * 간소화된 데이터 다운로드 페이지 컴포넌트
 * 관리자만 접근 가능하며 날짜 범위만 선택하여 Excel 다운로드 기능 제공
 */
const DownloadPage = () => {
  const logger = useLogger('DownloadPage');
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // 날짜 범위 관리 훅 사용
  const {
    dateRange,
    disabledDate,
    handleDateRangeChange,
    loading: dateRangeLoading,
  } = useDateRange(7); // 기본 7일 범위

  // 상태 관리
  const [loading, setLoading] = useState(false);

  // 관리자 권한 체크
  useEffect(() => {
    if (!isAdmin) {
      message.error('관리자만 접근 가능한 페이지입니다');
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  // 다운로드 처리 함수
  const handleDownload = useCallback(async () => {
    if (!dateRange || dateRange.length !== 2) {
      message.warning('날짜 범위를 선택해주세요');
      return;
    }

    try {
      setLoading(true);

      // 날짜 범위 포맷팅
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      logger.info(`Excel 다운로드 요청: ${startDate} ~ ${endDate}`);

      // Excel 다운로드 API 호출
      const blob = await DownloadService.downloadAsExcel(
        startDate,
        endDate,
        {}
      );
      const filename = `delivery_data_${startDate}_${endDate}.xlsx`;

      // 파일 다운로드 처리
      DownloadService.downloadFile(blob, filename);

      message.success('데이터 다운로드가 완료되었습니다');
    } catch (error) {
      logger.error('다운로드 처리 오류:', error);
      message.error('데이터 다운로드 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }, [dateRange, logger]);

  // 관리자가 아닌 경우 접근 거부 화면 표시
  if (!isAdmin) {
    return (
      <Result
        status="403"
        title="접근 권한 없음"
        subTitle="이 페이지는 관리자만 접근할 수 있습니다."
        extra={
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            대시보드로 돌아가기
          </Button>
        }
      />
    );
  }

  return (
    <Layout.Content style={{ padding: '24px', backgroundColor: 'white' }}>
      <Card
        bordered={false}
        title={
          <Title level={4} style={FONT_STYLES.TITLE.MEDIUM}>
            데이터 다운로드
          </Title>
        }
      >
        {/* 데이터 기간 선택 섹션 */}
        <Card
          type="inner"
          title="데이터 기간 선택"
          style={{ marginBottom: '16px' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text style={FONT_STYLES.BODY.MEDIUM}>
              다운로드할 데이터의 날짜 범위를 선택하세요:
            </Text>
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              style={{ width: '100%' }}
              size="large"
              allowClear={false}
              disabledDate={disabledDate}
              loading={dateRangeLoading}
              ranges={{
                오늘: [dayjs(), dayjs()],
                '최근 3일': [dayjs().subtract(2, 'day'), dayjs()],
                '최근 7일': [dayjs().subtract(6, 'day'), dayjs()],
                '최근 30일': [dayjs().subtract(29, 'day'), dayjs()],
              }}
            />

            <Alert
              message="알림"
              description="기간이 30일을 초과하는 경우 데이터 양에 따라 다운로드 시간이 오래 걸릴 수 있습니다."
              type="info"
              showIcon
              style={{ marginTop: '8px' }}
            />
          </Space>
        </Card>

        {/* 다운로드 버튼 */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Button
            type="primary"
            size="large"
            icon={<FileExcelOutlined />}
            onClick={handleDownload}
            loading={loading}
            disabled={!dateRange || dateRange.length !== 2 || dateRangeLoading}
          >
            Excel 다운로드
          </Button>
        </div>
      </Card>
    </Layout.Content>
  );
};

export default DownloadPage;
