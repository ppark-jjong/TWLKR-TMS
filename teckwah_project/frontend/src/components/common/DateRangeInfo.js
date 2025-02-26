// frontend/src/components/common/DateRangeInfo.js
import React from 'react';
import { Typography, Spin } from 'antd';
import { FONT_STYLES } from '../../utils/Constants';

const { Text } = Typography;

/**
 * 날짜 범위 정보 표시 컴포넌트
 * @param {Object} props
 * @param {Object} props.dateRange - 날짜 범위 정보 객체 (oldest_date, latest_date)
 * @param {boolean} props.loading - 로딩 상태
 */
const DateRangeInfo = ({ dateRange, loading }) => {
  if (loading) {
    return (
      <Text type="secondary" style={FONT_STYLES.BODY.MEDIUM}>
        <Spin size="small" style={{ marginRight: '8px' }} />
        데이터 조회 중...
      </Text>
    );
  }

  if (!dateRange || (!dateRange.oldest_date && !dateRange.latest_date)) {
    return (
      <Text type="secondary" style={FONT_STYLES.BODY.MEDIUM}>
        데이터가 없습니다
      </Text>
    );
  }

  return (
    <Text type="secondary" style={FONT_STYLES.BODY.MEDIUM}>
      조회 가능 기간: {dateRange.oldest_date} ~ {dateRange.latest_date}
    </Text>
  );
};

export default DateRangeInfo;
