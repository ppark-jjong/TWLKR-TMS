import React, { useState } from "react";
import {
  Table,
  Badge,
  Tag,
  Button,
  Space,
  Tooltip,
  Typography,
  message,
} from "antd";
import { CopyOutlined, EyeOutlined } from "@ant-design/icons";
import {
  formatDate,
  getStatusInfo,
  getDepartmentLabel,
  getWarehouseLabel,
  getTypeLabel,
} from "../../utils/Helpers";

/**
 * 주문 목록 테이블 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {Array} props.data - 주문 목록 데이터
 * @param {boolean} props.loading - 로딩 상태
 * @param {Function} props.onRowClick - 행 클릭 이벤트 핸들러
 * @param {Function} props.onSelectionChange - 선택 변경 이벤트 핸들러
 * @param {Object} props.pagination - 페이지네이션 설정
 */
const OrdersTable = ({
  data,
  loading,
  onRowClick,
  onSelectionChange,
  pagination,
}) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  // 선택 행 변경 핸들러
  const handleSelectionChange = (selectedKeys) => {
    setSelectedRowKeys(selectedKeys);

    if (onSelectionChange) {
      onSelectionChange(selectedKeys);
    }
  };

  // 주문번호 복사 핸들러
  const handleCopyOrderId = (e, orderId) => {
    e.stopPropagation(); // 행 클릭 이벤트 버블링 방지

    // 클립보드에 복사
    navigator.clipboard
      .writeText(orderId)
      .then(() => {
        message.success(`주문번호 ${orderId}가 클립보드에 복사되었습니다.`);
      })
      .catch(() => {
        message.error("클립보드 복사에 실패했습니다.");
      });
  };

  // 테이블 컬럼 설정
  const columns = [
    {
      title: "주문번호",
      dataIndex: "order_no",
      key: "order_no",
      render: (text) => (
        <Space>
          <Typography.Text>{text}</Typography.Text>
          <Tooltip title="주문번호 복사">
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              onClick={(e) => handleCopyOrderId(e, text)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: "고객",
      dataIndex: "customer",
      key: "customer",
    },
    {
      title: "유형",
      dataIndex: "type",
      key: "type",
      render: (type) => getTypeLabel(type),
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const { label, color } = getStatusInfo(status);
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "부서",
      dataIndex: "department",
      key: "department",
      render: (department) => getDepartmentLabel(department),
    },
    {
      title: "창고",
      dataIndex: "warehouse",
      key: "warehouse",
      render: (warehouse) => getWarehouseLabel(warehouse),
    },
    {
      title: "ETA",
      dataIndex: "eta",
      key: "eta",
      render: (eta) => formatDate(eta, true),
    },
    {
      title: "배송기사",
      dataIndex: "driver_name",
      key: "driver_name",
      render: (driver_name) => driver_name || "-",
    },
    {
      title: "액션",
      key: "action",
      render: (_, record) => (
        <Tooltip title="상세보기">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onRowClick(record);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <Table
      rowKey="dashboard_id"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={pagination}
      rowSelection={{
        type: "checkbox",
        selectedRowKeys,
        onChange: handleSelectionChange,
      }}
      onRow={(record) => ({
        onClick: () => onRowClick(record),
        style: { cursor: "pointer" },
      })}
      size="middle"
      scroll={{ x: "max-content" }}
    />
  );
};

export default OrdersTable;
