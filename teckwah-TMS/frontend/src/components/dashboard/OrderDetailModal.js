import React from 'react';
import {
  Modal,
  Descriptions,
  Button,
  Space,
  Typography,
  Tag,
  Divider,
  Row,
  Col,
  Spin,
  message
} from 'antd';
import {
  EditOutlined,
  CarOutlined,
  SyncOutlined,
  CopyOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import {
  formatDate,
  getStatusInfo,
  getDepartmentLabel,
  getWarehouseLabel,
  getTypeLabel,
} from '../../utils/helpers';
import { isAdmin } from '../../utils/auth';

const { Text, Paragraph } = Typography;

/**
 * 주문 상세 정보 모달 컴포넌트
 * @param {Object} props - 컴포넌트 속성
 * @param {boolean} props.visible - 모달 표시 여부
 * @param {Function} props.onClose - 모달 닫기 콜백
 * @param {Object} props.data - 주문 상세 데이터
 * @param {Function} props.onEdit - 수정 버튼 클릭 콜백
 * @param {Function} props.onAssign - 배차 버튼 클릭 콜백
 * @param {Function} props.onStatusChange - 상태 변경 버튼 클릭 콜백
 * @param {boolean} props.loading - 로딩 상태
 */
const OrderDetailModal = ({
  visible,
  onClose,
  data,
  onEdit,
  onAssign,
  onStatusChange,
  loading,
}) => {
  // 주문번호 복사 핸들러
  const handleCopyOrderId = () => {
    if (!data?.order_no) return;
    
    navigator.clipboard.writeText(data.order_no)
      .then(() => {
        message.success(`주문번호 ${data.order_no}가 클립보드에 복사되었습니다.`);
      })
      .catch(() => {
        message.error('클립보드 복사에 실패했습니다.');
      });
  };

  // 데이터가 없는 경우
  if (!data) {
    return null;
  }

  const { label: statusLabel, color: statusColor } = getStatusInfo(data.status);

  return (
    <Modal
      title={
        <Space>
          <span>주문 상세 정보</span>
          <Tag color={statusColor}>{statusLabel}</Tag>
        </Space>
      }
      visible={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="close" onClick={onClose}>
          닫기
        </Button>,
        <Button
          key="status"
          type="primary"
          icon={<SyncOutlined />}
          onClick={() => onStatusChange(data)}
          ghost
        >
          상태 변경
        </Button>,
        <Button
          key="assign"
          type="primary"
          icon={<CarOutlined />}
          onClick={() => onAssign(data)}
          ghost
        >
          배차 처리
        </Button>,
        <Button
          key="edit"
          type="primary"
          icon={<EditOutlined />}
          onClick={() => onEdit(data)}
        >
          수정
        </Button>,
      ]}
    >
      <div style={{ position: 'relative', minHeight: '200px' }}>
        {loading ? (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.7)',
              zIndex: 1,
            }}
          >
            <Spin size="large" />
          </div>
        ) : (
          <>
            {/* 기본 정보 섹션 */}
            <Divider orientation="left">기본 정보</Divider>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="주문번호">
                    <Space>
                      <Text>{data.order_no}</Text>
                      <Button
                        type="text"
                        icon={<CopyOutlined />}
                        size="small"
                        onClick={handleCopyOrderId}
                      />
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="고객명">{data.customer}</Descriptions.Item>
                  <Descriptions.Item label="연락처">{data.contact || '-'}</Descriptions.Item>
                  <Descriptions.Item label="유형">{getTypeLabel(data.type)}</Descriptions.Item>
                </Descriptions>
              </Col>
              <Col span={12}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="부서">{getDepartmentLabel(data.department)}</Descriptions.Item>
                  <Descriptions.Item label="창고">{getWarehouseLabel(data.warehouse)}</Descriptions.Item>
                  <Descriptions.Item label="SLA">{data.sla}</Descriptions.Item>
                  <Descriptions.Item label="우편번호">{data.postal_code}</Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>

            {/* 배송 정보 섹션 */}
            <Divider orientation="left">배송 정보</Divider>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="ETA">{formatDate(data.eta, true)}</Descriptions.Item>
                  <Descriptions.Item label="생성 시간">{formatDate(data.create_time, true)}</Descriptions.Item>
                  <Descriptions.Item label="출발 시간">
                    {data.depart_time ? formatDate(data.depart_time, true) : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="완료 시간">
                    {data.complete_time ? formatDate(data.complete_time, true) : '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
              <Col span={12}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="배송기사">{data.driver_name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="기사 연락처">{data.driver_contact || '-'}</Descriptions.Item>
                  <Descriptions.Item label="배송거리">{data.distance ? `${data.distance}m` : '-'}</Descriptions.Item>
                  <Descriptions.Item label="예상소요시간">
                    {data.duration_time ? `${Math.floor(data.duration_time / 60)}분` : '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>

            {/* 주소 정보 */}
            <Divider orientation="left">주소 정보</Divider>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="지역">{data.region || '-'}</Descriptions.Item>
              <Descriptions.Item label="상세 주소">{data.address}</Descriptions.Item>
            </Descriptions>

            {/* 메모 */}
            <Divider orientation="left">메모</Divider>
            <div
              style={{
                background: '#f5f5f5',
                padding: '16px',
                borderRadius: '4px',
                minHeight: '80px',
              }}
            >
              {data.remark ? (
                <Paragraph style={{ whiteSpace: 'pre-line' }}>{data.remark}</Paragraph>
              ) : (
                <Text type="secondary">메모가 없습니다.</Text>
              )}
            </div>

            {/* 관리 정보 */}
            <Divider orientation="left">관리 정보</Divider>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="최종 수정자">{data.updated_by || '-'}</Descriptions.Item>
              <Descriptions.Item label="최종 수정일시">{formatDate(data.update_at, true)}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </div>
    </Modal>
  );
};

export default OrderDetailModal;
