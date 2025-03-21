// src/components/admin/DataManagementTab.js
import React, { memo } from 'react';
import {
  Card,
  Space,
  Button,
  Typography,
  DatePicker,
  Row,
  Col,
  Statistic,
  Alert,
  Popconfirm,
} from 'antd';
import { ExportOutlined, ReloadOutlined } from '@ant-design/icons';
import { FONT_STYLES } from '../../utils/Constants';

const { Text } = Typography;
const { RangePicker } = DatePicker;

/**
 * 데이터 관리 탭 컴포넌트
 * 데이터 통계 표시, 내보내기, 정리 기능 제공
 */
const DataManagementTab = ({
  dataStats,
  loading,
  dataRange,
  onDateRangeChange,
  onDataExport,
  onDataCleanup,
}) => {
  return (
    <Card title="데이터 관리">
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 데이터 통계 카드 */}
        <Card type="inner" title="데이터 통계">
          <Row gutter={[24, 16]}>
            <Col span={6}>
              <Statistic
                title="전체 주문"
                value={dataStats.total_orders || 0}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="완료 주문"
                value={dataStats.completed_orders || 0}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="이슈 발생"
                value={dataStats.issues_count || 0}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="평균 처리 시간"
                value={dataStats.average_completion_time || 0}
                suffix="분"
              />
            </Col>
          </Row>
        </Card>

        {/* 데이터 내보내기 카드 */}
        <Card type="inner" title="데이터 내보내기">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text style={FONT_STYLES.BODY.MEDIUM}>
                내보낼 데이터 날짜 범위 선택:
              </Text>
              <div style={{ marginTop: 8 }}>
                <RangePicker
                  value={dataRange}
                  onChange={onDateRangeChange}
                  style={{ width: 300 }}
                />
              </div>
            </div>
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                icon={<ExportOutlined />}
                onClick={onDataExport}
                loading={loading}
              >
                CSV로 내보내기
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={() => message.info('Excel 내보내기 개발 중')}
                disabled={loading}
              >
                Excel로 내보내기
              </Button>
            </Space>
          </Space>
        </Card>

        {/* 데이터 정리 카드 */}
        <Card type="inner" title="데이터 정리">
          <Alert
            message="주의: 데이터 정리"
            description="오래된 데이터를 정리하면 되돌릴 수 없습니다. 필요한 데이터는 먼저 내보내기를 하세요."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Space>
            <Popconfirm
              title="90일 이상 된 데이터를 정리하시겠습니까?"
              description="이 작업은 되돌릴 수 없습니다."
              onConfirm={() => onDataCleanup(90)}
              okText="정리"
              cancelText="취소"
            >
              <Button danger>90일 이상 데이터 정리</Button>
            </Popconfirm>
            <Popconfirm
              title="180일 이상 된 데이터를 정리하시겠습니까?"
              description="이 작업은 되돌릴 수 없습니다."
              onConfirm={() => onDataCleanup(180)}
              okText="정리"
              cancelText="취소"
            >
              <Button danger>180일 이상 데이터 정리</Button>
            </Popconfirm>
            <Popconfirm
              title="모든 취소 상태 주문을 정리하시겠습니까?"
              description="이 작업은 되돌릴 수 없습니다."
              onConfirm={() => onDataCleanup('cancel')}
              okText="정리"
              cancelText="취소"
            >
              <Button danger>취소 상태 주문 정리</Button>
            </Popconfirm>
          </Space>
        </Card>
      </Space>
    </Card>
  );
};

// 성능 최적화를 위한 메모이제이션
export default memo(DataManagementTab);
