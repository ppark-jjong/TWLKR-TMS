// src/components/DashboardTable.js
import React, { useMemo, useState } from "react";
import { Table, Select, Tag, Typography, Space, Button, Tooltip } from "antd";
import { getStatusColor, getStatusText } from "../utils/permissionUtils";
import dayjs from "dayjs";
import {
  SortAscendingOutlined,
  SortDescendingOutlined,
  UnorderedListOutlined,
  EyeOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

/**
 * 대시보드 테이블 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {Array} props.data - 대시보드 데이터 배열
 * @param {boolean} props.loading - 로딩 상태
 * @param {Array} props.selectedRowKeys - 선택된 행 키 배열
 * @param {Function} props.onSelectChange - 선택 변경 핸들러
 * @param {Object} props.pagination - 페이지네이션 정보
 * @param {Function} props.onChange - 테이블 변경 핸들러
 * @param {string} props.userRole - 사용자 권한
 * @param {Function} props.onShowDetailModal - 상세 정보 모달 열기 함수
 */
const DashboardTable = ({
  data,
  loading,
  selectedRowKeys = [],
  onSelectChange,
  pagination,
  onPaginationChange,
  userRole = "USER",
  onShowStatusModal,
  onShowDetailModal,
  totalItems,
}) => {
  const [pageSize, setPageSize] = useState(pagination?.pageSize || 15);
  const [sortedInfo, setSortedInfo] = useState({});

  // 스타일 정의
  const styles = {
    tableContainer: {
      border: "1px solid #f0f0f0",
      borderRadius: "8px",
      overflow: "hidden",
      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
    },
    tableHeader: {
      backgroundColor: "#fafafa",
      fontWeight: 600,
    },
    headerCell: {
      padding: "12px 8px",
      fontSize: "14px",
      fontWeight: "600",
      color: "#262626",
    },
    tableRow: {
      cursor: "pointer",
      transition: "background-color 0.3s",
      "&:hover": {
        backgroundColor: "#f5f5f5",
      },
    },
    tableCell: {
      padding: "12px 8px",
      fontSize: "14px",
    },
    pagination: {
      marginTop: "16px",
      textAlign: "right",
    },
    tag: {
      fontWeight: "500",
      borderRadius: "4px",
    },
    tableOptions: {
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      marginBottom: "16px",
    },
    dropdown: {
      width: "120px",
      borderRadius: "6px",
    },
    viewButton: {
      borderRadius: "6px",
      marginLeft: "8px",
    },
  };

  // 페이지 크기 변경 핸들러
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    onPaginationChange && onPaginationChange(1, size);
  };

  // 페이지네이션 변경 핸들러
  const handleTableChange = (pagination, filters, sorter) => {
    setSortedInfo(sorter);
    onPaginationChange &&
      onPaginationChange(pagination.current, pagination.pageSize);
  };

  // 행 클릭 핸들러
  const handleRowClick = (record) => {
    onShowDetailModal && onShowDetailModal(record.dashboard_id);
  };

  // 필터 옵션 생성 헬퍼 함수
  const createFilterOptions = (fieldName) => {
    if (!data || !data.length) return [];

    const uniqueValues = [
      ...new Set(data.map((item) => item[fieldName]).filter(Boolean)),
    ];
    return uniqueValues.map((value) => ({ text: value, value }));
  };

  // 컬럼 설정
  const columns = useMemo(
    () => [
      {
        title: () => <div style={styles.headerCell}>부서</div>,
        dataIndex: "department",
        key: "department",
        width: 90,
        align: "center",
        render: (department) => <Text strong>{department}</Text>,
        sorter: (a, b) =>
          (a.department || "").localeCompare(b.department || ""),
        sortOrder: sortedInfo.columnKey === "department" && sortedInfo.order,
        filters: createFilterOptions("department"),
        onFilter: (value, record) => record.department === value,
      },
      {
        title: () => <div style={styles.headerCell}>유형</div>,
        dataIndex: "type",
        key: "type",
        width: 90,
        align: "center",
        render: (type) => (
          <Tag
            color={type === "DELIVERY" ? "blue" : "purple"}
            style={styles.tag}
          >
            {type === "DELIVERY" ? "배송" : "회수"}
          </Tag>
        ),
        filters: [
          { text: "배송", value: "DELIVERY" },
          { text: "회수", value: "RETURN" },
        ],
        onFilter: (value, record) => record.type === value,
      },
      {
        title: () => <div style={styles.headerCell}>창고</div>,
        dataIndex: "warehouse",
        key: "warehouse",
        width: 90,
        align: "center",
        render: (warehouse) => <Text>{warehouse || "-"}</Text>,
        sorter: (a, b) => (a.warehouse || "").localeCompare(b.warehouse || ""),
        sortOrder: sortedInfo.columnKey === "warehouse" && sortedInfo.order,
        filters: createFilterOptions("warehouse"),
        onFilter: (value, record) => record.warehouse === value,
      },
      {
        title: () => <div style={styles.headerCell}>주문번호</div>,
        dataIndex: "order_no",
        key: "order_no",
        width: 130,
        align: "center",
        render: (order_no) => (
          <Text strong style={{ fontFamily: "monospace" }}>
            {order_no}
          </Text>
        ),
        sorter: (a, b) => (a.order_no || "").localeCompare(b.order_no || ""),
        sortOrder: sortedInfo.columnKey === "order_no" && sortedInfo.order,
      },
      {
        title: () => <div style={styles.headerCell}>SLA</div>,
        dataIndex: "sla",
        key: "sla",
        width: 160,
        align: "center",
        render: (sla) => (
          <Text>{sla ? dayjs(sla).format("YYYY-MM-DD HH:mm") : "-"}</Text>
        ),
        sorter: (a, b) => {
          if (!a.sla && !b.sla) return 0;
          if (!a.sla) return -1;
          if (!b.sla) return 1;
          return dayjs(a.sla).unix() - dayjs(b.sla).unix();
        },
        sortOrder: sortedInfo.columnKey === "sla" && sortedInfo.order,
      },
      {
        title: () => <div style={styles.headerCell}>ETA</div>,
        dataIndex: "eta",
        key: "eta",
        width: 160,
        align: "center",
        render: (eta) => {
          const etaDate = eta ? dayjs(eta) : null;
          const now = dayjs();
          const isPast = etaDate && etaDate.isBefore(now);

          return (
            <Text
              style={{
                color: isPast ? "#f5222d" : "inherit",
                fontWeight: isPast ? "600" : "normal",
              }}
            >
              {etaDate ? etaDate.format("YYYY-MM-DD HH:mm") : "-"}
            </Text>
          );
        },
        sorter: (a, b) => {
          if (!a.eta && !b.eta) return 0;
          if (!a.eta) return -1;
          if (!b.eta) return 1;
          return dayjs(a.eta).unix() - dayjs(b.eta).unix();
        },
        sortOrder: sortedInfo.columnKey === "eta" && sortedInfo.order,
      },
      {
        title: () => <div style={styles.headerCell}>상태</div>,
        dataIndex: "status",
        key: "status",
        width: 100,
        align: "center",
        render: (status) => (
          <Tag color={getStatusColor(status)} style={styles.tag}>
            {getStatusText(status)}
          </Tag>
        ),
        filters: [
          { text: "대기중", value: "PENDING" },
          { text: "배차완료", value: "ASSIGNED" },
          { text: "진행중", value: "IN_PROGRESS" },
          { text: "완료", value: "COMPLETE" },
          { text: "이슈", value: "ISSUE" },
          { text: "취소", value: "CANCEL" },
        ],
        onFilter: (value, record) => record.status === value,
        sorter: (a, b) => (a.status || "").localeCompare(b.status || ""),
        sortOrder: sortedInfo.columnKey === "status" && sortedInfo.order,
      },
      {
        title: () => <div style={styles.headerCell}>지역</div>,
        dataIndex: "region",
        key: "region",
        width: 110,
        align: "center",
        render: (region) => <Text>{region || "-"}</Text>,
        filters: createFilterOptions("region"),
        onFilter: (value, record) => record.region === value,
      },
      {
        title: () => <div style={styles.headerCell}>배송기사</div>,
        dataIndex: "driver_name",
        key: "driver_name",
        width: 120,
        align: "center",
        render: (driver_name) => <Text>{driver_name || "-"}</Text>,
        filters: createFilterOptions("driver_name"),
        onFilter: (value, record) => record.driver_name === value,
      },
      {
        title: () => <div style={styles.headerCell}>보기</div>,
        key: "view",
        width: 70,
        fixed: "right",
        align: "center",
        render: (_, record) => (
          <Tooltip title="상세 정보 보기">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleRowClick(record);
              }}
              size="small"
            />
          </Tooltip>
        ),
      },
    ],
    [sortedInfo, data]
  );

  // 페이지네이션 설정 업데이트
  const updatedPagination = {
    total: totalItems,
    pageSize: pageSize,
    current: pagination?.current || 1,
    showSizeChanger: false,
    showTotal: (total) => `총 ${total}개 항목`,
    size: "default",
    showQuickJumper: true,
  };

  return (
    <div>
      <div style={styles.tableOptions}>
        <Space>
          <Text>표시 행 수:</Text>
          <Select
            value={pageSize}
            onChange={handlePageSizeChange}
            options={[
              { value: 15, label: "15행" },
              { value: 30, label: "30행" },
              { value: 50, label: "50행" },
            ]}
            style={styles.dropdown}
            size="middle"
            dropdownStyle={{ padding: "8px 0" }}
          />
        </Space>
      </div>

      <div style={styles.tableContainer}>
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: onSelectChange,
          }}
          columns={columns}
          dataSource={data}
          rowKey="dashboard_id"
          pagination={updatedPagination}
          onChange={handleTableChange}
          scroll={{ x: "max-content", y: "calc(100vh - 400px)" }}
          size="middle"
          loading={loading}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: {
              cursor: "pointer",
              backgroundColor: selectedRowKeys.includes(record.dashboard_id)
                ? "#f0f5ff"
                : undefined,
              transition: "background-color 0.3s",
            },
          })}
          sticky={{ offsetHeader: 0 }}
          bordered
          components={{
            header: {
              cell: (props) => (
                <th
                  {...props}
                  style={{
                    ...props.style,
                    backgroundColor: "#fafafa",
                    fontWeight: 600,
                  }}
                />
              ),
            },
          }}
        />
      </div>
    </div>
  );
};

export default DashboardTable;
