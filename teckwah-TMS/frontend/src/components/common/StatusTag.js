/**
 * 상태 표시용 태그 컴포넌트
 * 중앙화된 상수를 사용하여 일관된 스타일 적용
 */
import React from 'react';
import { Tag } from 'antd';
import { STATUS_OPTIONS, TYPE_OPTIONS } from '../../constants';

/**
 * 상태 태그 컴포넌트
 * @param {Object} props
 * @param {string} props.status - 상태 코드 (WAITING, IN_PROGRESS 등)
 * @param {string} props.type - 태그 타입 (status 또는 orderType)
 * @param {boolean} props.showIcon - 아이콘 표시 여부
 * @param {Object} props.style - 추가 스타일
 */
const StatusTag = ({ 
  status, 
  type = 'status',
  showIcon = false,
  style = {}
}) => {
  // 타입에 따라 적절한 옵션 목록 선택
  const options = type === 'orderType' ? TYPE_OPTIONS : STATUS_OPTIONS;
  
  // 상태 옵션 찾기
  const option = options.find(opt => opt.value === status);
  
  // 옵션이 없으면 기본값 반환
  if (!option) {
    return <Tag color="default">{status || '-'}</Tag>;
  }
  
  // antd Tag 또는 커스텀 스타일 태그 선택
  if (type === 'custom') {
    return (
      <div
        style={{
          backgroundColor: option.color,
          color: option.textColor,
          padding: '2px 8px',
          borderRadius: '12px',
          display: 'inline-block',
          fontSize: '0.8rem',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          ...style
        }}
      >
        {showIcon && option.icon} {option.label}
      </div>
    );
  }
  
  // 기본 antd Tag 컴포넌트 사용
  return (
    <Tag color={option.tagColor} style={style}>
      {showIcon && option.icon} {option.label}
    </Tag>
  );
};

export default StatusTag;
