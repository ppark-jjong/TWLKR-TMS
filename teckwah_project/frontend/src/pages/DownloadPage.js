// src/pages/DownloadPage.js
import React, { useState, useCallback } from "react";
import {
  Layout,
  Card,
  DatePicker,
  Button,
  Space,
  Row,
  Col,
  Radio,
  Checkbox,
  Typography,
  Alert,
  message,
  Select,
} from "antd";
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useDateRange } from "../utils/useDateRange";
import DownloadService from "../services/DownloadService";
import { useLogger } from "../utils/LogUtils";
import dayjs from "dayjs";
import {
  TYPE_TYPES,
  TYPE_TEXTS,
  STATUS_TYPES,
  STATUS_TEXTS,
  DEPARTMENT_TYPES,
  DEPARTMENT_TEXTS,
  FONT_STYLES,
} from "../utils/Constants";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

/**
 * 데이터 다운로드 페이지 컴포넌트
 * 날짜 범위와 옵션을 선택하여 데이터를 다운로드할 수 있는 기능 제공
 */
const DownloadPage = () => {
  const logger = useLogger("DownloadPage");

  // 날짜 범위 관리 훅 사용
  const {
    dateRange,
    disabledDate,
    handleDateRangeChange,
    loading: dateRangeLoading,
  } = useDateRange(7); // 기본 7일 범위

  // 상태 관리
  const [fileType, setFileType] = useState("csv");
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: null,
    status: null,
    department: null,
    includeRemarks: true,
    includeDriverInfo: true,
  });

  // 필터 변경 핸들러
  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // 다운로드 처리 함수
  const handleDownload = useCallback(async () => {
    if (!dateRange || dateRange.length !== 2) {
      message.warning("날짜 범위를 선택해주세요");
      return;
    }

    try {
      setLoading(true);

      // 날짜 범위 포맷팅
      const startDate = dateRange[0].format("YYYY-MM-DD");
      const endDate = dateRange[1].format("YYYY-MM-DD");

      // 옵션 구성
      const options = {
        type: filters.type,
        status: filters.status,
        department: filters.department,
        include_remarks: filters.includeRemarks,
        include_driver_info: filters.includeDriverInfo,
      };

      logger.info("다운로드 요청:", {
        startDate,
        endDate,
        fileType,
        options,
      });

      // 파일 타입에 따른 다운로드 함수 호출
      let blob;
      let filename;

      if (fileType === "csv") {
        blob = await DownloadService.downloadAsCsv(startDate, endDate, options);
        filename = `delivery_data_${startDate}_${endDate}.csv`;
      } else {
        blob = await DownloadService.downloadAsExcel(
          startDate,
          endDate,
          options
        );
        filename = `delivery_data_${startDate}_${endDate}.xlsx`;
      }

      // 파일 다운로드 처리
      DownloadService.downloadFile(blob, filename);

      message.success("데이터 다운로드가 완료되었습니다");
    } catch (error) {
      logger.error("다운로드 처리 오류:", error);
      message.error("데이터 다운로드 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }, [dateRange, fileType, filters, logger]);

  // 상태에 따른 아이콘 선택
  const getFileIcon = () => {
    switch (fileType) {
      case "csv":
        return <FileTextOutlined />;
      case "excel":
        return <FileExcelOutlined />;
      default:
        return <DownloadOutlined />;
    }
  };

  return (
    <Layout.Content style={{ padding: "24px", backgroundColor: "white" }}>
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
          style={{ marginBottom: "16px" }}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Text style={FONT_STYLES.BODY.MEDIUM}>
              다운로드할 데이터의 날짜 범위를 선택하세요:
            </Text>
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              style={{ width: "100%" }}
              size="large"
              allowClear={false}
              disabledDate={disabledDate}
              loading={dateRangeLoading}
              ranges={{
                오늘: [dayjs(), dayjs()],
                "최근 3일": [dayjs().subtract(2, "day"), dayjs()],
                "최근 7일": [dayjs().subtract(6, "day"), dayjs()],
                "최근 30일": [dayjs().subtract(29, "day"), dayjs()],
              }}
            />

            <Alert
              message="알림"
              description="기간이 30일을 초과하는 경우 데이터 양에 따라 다운로드 시간이 오래 걸릴 수 있습니다."
              type="info"
              showIcon
              style={{ marginTop: "8px" }}
            />
          </Space>
        </Card>

        {/* 다운로드 옵션 섹션 */}
        <Card
          type="inner"
          title="다운로드 옵션"
          style={{ marginBottom: "16px" }}
        >
          <Row gutter={[24, 16]}>
            <Col span={24}>
              <Text style={FONT_STYLES.LABEL}>파일 형식:</Text>
              <div style={{ marginTop: "8px" }}>
                <Radio.Group
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  size="large"
                >
                  <Radio.Button value="csv">
                    <FileTextOutlined /> CSV
                  </Radio.Button>
                  <Radio.Button value="excel">
                    <FileExcelOutlined /> Excel
                  </Radio.Button>
                </Radio.Group>
              </div>
            </Col>

            <Col span={8}>
              <Text style={FONT_STYLES.LABEL}>종류 필터:</Text>
              <Select
                placeholder="모든 종류"
                style={{ width: "100%", marginTop: "8px" }}
                allowClear
                value={filters.type}
                onChange={(value) => handleFilterChange("type", value)}
              >
                {Object.entries(TYPE_TYPES).map(([key, value]) => (
                  <Option key={key} value={value}>
                    {TYPE_TEXTS[key]}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col span={8}>
              <Text style={FONT_STYLES.LABEL}>상태 필터:</Text>
              <Select
                placeholder="모든 상태"
                style={{ width: "100%", marginTop: "8px" }}
                allowClear
                value={filters.status}
                onChange={(value) => handleFilterChange("status", value)}
              >
                {Object.entries(STATUS_TYPES).map(([key, value]) => (
                  <Option key={key} value={value}>
                    {STATUS_TEXTS[key]}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col span={8}>
              <Text style={FONT_STYLES.LABEL}>부서 필터:</Text>
              <Select
                placeholder="모든 부서"
                style={{ width: "100%", marginTop: "8px" }}
                allowClear
                value={filters.department}
                onChange={(value) => handleFilterChange("department", value)}
              >
                {Object.entries(DEPARTMENT_TYPES).map(([key, value]) => (
                  <Option key={key} value={value}>
                    {DEPARTMENT_TEXTS[key]}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col span={24} style={{ marginTop: "8px" }}>
              <Checkbox
                checked={filters.includeRemarks}
                onChange={(e) =>
                  handleFilterChange("includeRemarks", e.target.checked)
                }
              >
                메모 정보 포함
              </Checkbox>
              <Checkbox
                checked={filters.includeDriverInfo}
                onChange={(e) =>
                  handleFilterChange("includeDriverInfo", e.target.checked)
                }
                style={{ marginLeft: "16px" }}
              >
                배송 담당자 정보 포함
              </Checkbox>
            </Col>
          </Row>
        </Card>

        {/* 다운로드 버튼 */}
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <Button
            type="primary"
            size="large"
            icon={getFileIcon()}
            onClick={handleDownload}
            loading={loading}
            disabled={!dateRange || dateRange.length !== 2 || dateRangeLoading}
          >
            {fileType === "csv" ? "CSV 다운로드" : "Excel 다운로드"}
          </Button>
        </div>
      </Card>
    </Layout.Content>
  );
};

export default DownloadPage;
