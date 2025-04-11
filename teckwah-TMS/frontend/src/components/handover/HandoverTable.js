import React from 'react';
import { Table, Typography, Tag, Tooltip } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { formatDate } from '../../utils/helpers';

const { Text, Paragraph } = Typography;

/**
 * 인수인계/공지사항 테이블 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {Array} props.data - 인수인계 목록 데이터
 * @param {boolean} props.loading - 로딩 상태
 * @param {Function} props.onRowClick - 행 클릭 이벤트 핸들러
 * @param {Object} props.pagination - 페이지네이션 설정
 * @param {boolean} props.isNotice - 공지사항 여부
 */
const HandoverTable = ({ data, loading, onRowClick, pagination, isNotice }) => {
  // 테이블 컬럼 설정
  const columns = [
    {
      title: '작성자',
      dataIndex: 'update_by',
      key: 'update_by',
      width: 100,
    },
    {
      title: '작성일시',
      dataIndex: 'create_at',
      key: 'create_at',
      width: 150,
      render: (text) => formatDate(text, true),
    },
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (text, record) => (
        <div>
          {isNotice && (
            <Tag color="blue" style={{ marginRight: 8 }}>
              공지
            </Tag>
          )}
          <Text ellipsis style={{ maxWidth: 180 }} title={text}>
            {text}
          </Text>
        </div>
      ),
    },
    {
      title: '내용',
      dataIndex: 'content',
      key: 'content',
      render: (text) => (
        <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
          {text}
        </Paragraph>
      ),
    },
    {
      title: '액션',
      key: 'action',
      width: 60,
      render: (_, record) => (
        <Tooltip title="상세보기">
          <EyeOutlined
            onClick={(e) => {
              e.stopPropagation();
              onRowClick(record);
            }}
            style={{ cursor: 'pointer' }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <Table
      rowKey="handover_id"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={pagination}
      onRow={(record) => ({
        onClick: () => onRowClick(record),
        style: { cursor: 'pointer' },
      })}
      size="middle"
    />
  );
};

export default HandoverTable;
