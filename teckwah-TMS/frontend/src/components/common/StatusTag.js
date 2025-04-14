/**
 * 상태 표시용 태그 컴포넌트
 */
import React from 'react';
import { Tag } from 'antd';

const StatusTag = ({ status }) => {
  // 상태별 색상 및 텍스트 설정
  const getStatusConfig = (status) => {
    switch (status) {
      case 'WAITING':
        return {
          color: 'blue',
          text: '대기'
        };
      case 'IN_PROGRESS':
        return {
          color: 'gold',
          text: '진행'
        };
      case 'COMPLETE':
        return {
          color: 'green',
          text: '완료'
        };
      case 'ISSUE':
        return {
          color: 'red',
          text: '이슈'
        };
      case 'CANCEL':
        return {
          color: 'gray',
          text: '취소'
        };
      case 'DELIVERY':
        return {
          color: 'cyan',
          text: '배송'
        };
      case 'RETURN':
        return {
          color: 'purple',
          text: '반품'
        };
      default:
        return {
          color: 'default',
          text: status
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Tag color={config.color}>
      {config.text}
    </Tag>
  );
};

export default StatusTag;
