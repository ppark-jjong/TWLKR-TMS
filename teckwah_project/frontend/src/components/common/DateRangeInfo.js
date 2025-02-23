// frontend/src/components/common/DateRangeInfo.js
import React from 'react';
import { Space, Typography } from 'antd';
import { FONT_STYLES } from '../../utils/Constants';

const { Text } = Typography;

const DateRangeInfo = ({ dateRange, loading }) => {
  if (loading) {
    return (
      <Text type="secondary" style={FONT_STYLES.BODY.MEDIUM}>
        조회 기간 로딩 중...
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
