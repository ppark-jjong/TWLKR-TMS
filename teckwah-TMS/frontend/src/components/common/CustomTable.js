/**
 * 커스텀 테이블 컴포넌트
 * - 페이지네이션, 선택 기능 등을 포함한 확장 테이블
 */
import React from 'react';
import { Table, Button, Space, Tooltip } from 'antd';
import { SettingOutlined, DownloadOutlined } from '@ant-design/icons';

const CustomTable = ({
  dataSource,
  columns,
  loading,
  rowKey = 'id',
  pagination,
  onChange,
  rowSelection,
  onRow,
  scroll,
  expandable,
  onColumnsChange,
  onExport,
  showSettings = true,
  showExport = true,
  showPagination = true,
  size = 'middle',
  bordered = true,
  summary
}) => {
  // 테이블 추가 기능
  const tableSettings = (
    <Space>
      {showSettings && (
        <Tooltip title="테이블 설정">
          <Button 
            icon={<SettingOutlined />} 
            onClick={onColumnsChange}
            type="text"
          />
        </Tooltip>
      )}
      
      {showExport && (
        <Tooltip title="다운로드">
          <Button 
            icon={<DownloadOutlined />} 
            onClick={onExport}
            type="text"
          />
        </Tooltip>
      )}
    </Space>
  );

  return (
    <div>
      {(showSettings || showExport) && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginBottom: 16 
        }}>
          {tableSettings}
        </div>
      )}
      
      <Table
        dataSource={dataSource}
        columns={columns}
        loading={loading}
        rowKey={rowKey}
        pagination={showPagination ? pagination : false}
        onChange={onChange}
        rowSelection={rowSelection}
        onRow={onRow}
        scroll={scroll}
        expandable={expandable}
        size={size}
        bordered={bordered}
        summary={summary}
      />
    </div>
  );
};

export default CustomTable;
