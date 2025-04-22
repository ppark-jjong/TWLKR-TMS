/**
 * 인수인계 페이지 컴포넌트
 */
import React, { useState, useEffect } from 'react';
import {
  Button,
  Space,
  Table,
  Tooltip,
  message,
  Popconfirm,
  Modal,
  Input,
  Form,
  Checkbox,
  Tag,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  PushpinOutlined,
} from '@ant-design/icons';
import MainLayout from '../components/layout/MainLayout';
import {
  PageTitle,
  CustomTable,
  PageLoading,
  ErrorResult,
} from '../components/common';
import { HandoverService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

const HandoverPage = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 모달 상태
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState(null);
  const [editMode, setEditMode] = useState(false); // 편집 모드 상태 추가

  // 폼 인스턴스
  const [form] = Form.useForm();

  // 데이터 불러오기 (camelCase 사용)
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
      };
      const response = await HandoverService.getHandovers(params);
      if (response.success) {
        setData(response.data.items); // items 내부는 HandoverResponse (camelCase)
        setPagination({
          ...pagination,
          total: response.data.total,
        });
      } else {
        setError(response.message || '데이터 조회 실패');
      }
    } catch (error) {
      console.error('데이터 조회 오류:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchData();
  }, [pagination.current, pagination.pageSize]);

  // 테이블 변경 처리 (페이지네이션)
  const handleTableChange = (pagination) => {
    setPagination({
      current: pagination.current,
      pageSize: pagination.pageSize,
      total: pagination.total,
    });
  };

  // 인수인계 상세 보기 (camelCase 사용)
  const handleViewDetail = async (record) => {
    try {
      const response = await HandoverService.getHandover(record.handoverId); // camelCase
      if (response.success) {
        setSelectedHandover(response.data);
        // 락 정보는 GetHandoverResponse 모델에 따라 data.lockedInfo 로 접근해야 함 (현재 모델에서 주석처리됨)
        // if (response.data.lockedInfo && !response.data.lockedInfo.editable) {
        //   message.info(`현재 ${response.data.lockedInfo.lockedBy || '다른 사용자'}가 편집 중입니다.`);
        // }
      } else {
        // 조회 실패 시 record 사용 (기존 record는 snake_case일 수 있으므로 변환 필요)
        // 여기서는 record를 바로 사용하지 않고 에러 처리를 강화
        message.error(response.message || '인수인계 정보 조회 실패');
        return; // 모달 열기 방지
      }
      setIsDetailModalVisible(true);
      setEditMode(false);
    } catch (error) {
      console.error('인수인계 조회 오류:', error);
      message.error('인수인계 정보 로드 중 오류가 발생했습니다');
    }
  };

  // 수정 버튼 클릭 시 락 획득 (camelCase 사용)
  const handleEditHandoverClick = async (handoverId) => {
    try {
      const lockResponse = await HandoverService.lockHandover(handoverId);
      // 응답 구조 변경됨 (LockResponse 사용)
      if (!lockResponse.success || !lockResponse.lockStatus?.editable) {
        message.error(
          lockResponse.message ||
            '현재 다른 사용자가 편집 중이라 수정할 수 없습니다.'
        );
        return false;
      }
      setEditMode(true);
      // 상세 보기 호출하여 최신 데이터 로드 및 편집 모드 유지
      await handleViewDetail({ handoverId }); // handleViewDetail 내부에서 모달 열림
      return true;
    } catch (error) {
      console.error('락 획득 오류:', error);
      message.error('수정 권한 획득 중 오류가 발생했습니다');
      return false;
    }
  };

  // 인수인계 삭제 (camelCase 사용)
  const handleDelete = async (handoverId) => {
    try {
      // TODO: 삭제 전 락 확인 로직 추가 (필요 시)
      const response = await HandoverService.deleteHandover(handoverId);
      if (response.success) {
        message.success('인수인계가 삭제되었습니다');
        fetchData();
      } else {
        message.error(response.message || '인수인계 삭제 실패');
      }
    } catch (error) {
      console.error('인수인계 삭제 오류:', error);
      message.error('인수인계 삭제 중 오류가 발생했습니다');
    }
  };

  // 인수인계 생성 (camelCase 사용)
  const handleCreate = async (values) => {
    try {
      // values 객체의 키가 isNotice (camelCase) 인지 확인
      const response = await HandoverService.createHandover(values);
      if (response.success) {
        message.success('인수인계가 생성되었습니다');
        form.resetFields();
        setIsCreateModalVisible(false);
        fetchData();
      } else {
        message.error(response.message || '인수인계 생성 실패');
      }
    } catch (error) {
      console.error('인수인계 생성 오류:', error);
      message.error('인수인계 생성 중 오류가 발생했습니다');
    }
  };

  // 삭제 권한 확인 (camelCase 사용)
  const canDelete = (record) => {
    // record가 null일 수 있음에 주의
    return (
      currentUser?.userRole === 'ADMIN' ||
      record?.updateBy === currentUser?.userId
    ); // camelCase
  };

  // 모달 닫기 (camelCase 사용)
  const handleCloseDetailModal = async () => {
    if (selectedHandover && editMode) {
      try {
        await HandoverService.unlockHandover(selectedHandover.handoverId); // camelCase
      } catch (error) {
        console.error('락 해제 오류:', error);
      }
    }
    // 상태 초기화
    setIsDetailModalVisible(false);
    setSelectedHandover(null);
    setEditMode(false);
  };

  // 수정 완료 시 락 해제 (camelCase 사용)
  const handleUpdateComplete = async () => {
    if (selectedHandover) {
      try {
        await HandoverService.unlockHandover(selectedHandover.handoverId); // camelCase
        message.success('수정이 완료되었습니다.');
        // 상태 초기화 및 모달 닫기
        setIsDetailModalVisible(false);
        setSelectedHandover(null);
        setEditMode(false);
        fetchData(); // 데이터 새로고침
      } catch (error) {
        console.error('락 해제 오류:', error);
        message.error('락 해제 중 오류가 발생했습니다');
      }
    }
  };

  // 테이블 컬럼 설정 (camelCase 사용)
  const columns = [
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text, record) => (
        <Space>
          {record.isNotice && ( // camelCase
            <Tag color="gold" icon={<PushpinOutlined />}>
              공지
            </Tag>
          )}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '작성자',
      dataIndex: 'updateBy', // camelCase
      key: 'updateBy',
      width: 120,
    },
    {
      title: '작성일',
      dataIndex: 'createAt', // camelCase
      key: 'createAt',
      width: 170,
      render: (date) => {
        try {
          return dayjs(date).format('YYYY-MM-DD HH:mm');
        } catch (error) {
          console.warn('날짜 변환 오류:', date, error);
          return date || '-';
        }
      },
    },
    {
      title: '작업',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleViewDetail(record)}
          >
            상세
          </Button>

          {canDelete(record) && (
            <Popconfirm
              title="이 인수인계를 삭제하시겠습니까?"
              onConfirm={() => handleDelete(record.handoverId)} // camelCase
              okText="삭제"
              cancelText="취소"
            >
              <Button type="link" size="small" danger>
                삭제
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 행 클릭 설정 (camelCase 사용)
  const handleRowClick = (record) => {
    return {
      onClick: () => {
        handleViewDetail(record); // record 객체는 이미 camelCase일 것임
      },
    };
  };

  // 에러 발생 시 재시도
  const handleRetry = () => {
    fetchData();
  };

  // 페이지 제목 우측 버튼
  const pageExtra = (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      onClick={() => setIsCreateModalVisible(true)}
    >
      새 인수인계
    </Button>
  );

  if (error) {
    return (
      <MainLayout>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '16px',
          }}
        >
          {pageExtra}
        </div>
        <ErrorResult
          status="error"
          title="데이터 로드 오류"
          subTitle={error}
          onRetry={handleRetry}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '16px',
        }}
      >
        {pageExtra}
      </div>

      <CustomTable
        dataSource={data}
        columns={columns}
        loading={loading}
        rowKey="handoverId" // camelCase
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `전체 ${total}개 항목`,
        }}
        onChange={handleTableChange}
        onRow={handleRowClick}
        showSettings={false}
        showExport={false}
      />

      {/* 인수인계 생성 모달 (Form 필드 이름 확인) */}
      <Modal
        title="새 인수인계 작성"
        open={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsCreateModalVisible(false)}>
            취소
          </Button>,
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            저장
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ isNotice: false }} // camelCase
        >
          {/* Form.Item name들은 그대로 유지해도 됨 (Ant Design 내부 처리) */}
          <Form.Item
            name="title"
            label="제목"
            rules={[{ required: true, message: '제목을 입력하세요' }]}
          >
            <Input placeholder="제목 입력" />
          </Form.Item>

          <Form.Item
            name="content"
            label="내용"
            rules={[{ required: true, message: '내용을 입력하세요' }]}
          >
            <TextArea rows={6} placeholder="내용 입력" />
          </Form.Item>

          <Form.Item
            name="isNotice" // camelCase
            valuePropName="checked"
          >
            <Checkbox>공지사항으로 등록</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      {/* 인수인계 상세 모달 (camelCase 사용) */}
      <Modal
        title={
          <Space>
            {selectedHandover?.isNotice && ( // camelCase
              <Tag color="gold" icon={<PushpinOutlined />}>
                공지사항
              </Tag>
            )}
            {selectedHandover?.title}
          </Space>
        }
        open={isDetailModalVisible}
        onCancel={handleCloseDetailModal}
        footer={[
          <Button key="close" onClick={handleCloseDetailModal}>
            닫기
          </Button>,
          canDelete(selectedHandover) && (
            <Popconfirm
              key="delete"
              title="이 인수인계를 삭제하시겠습니까?"
              onConfirm={() => {
                handleDelete(selectedHandover.handoverId); // camelCase
                // 모달 닫기는 handleDelete 성공 후 또는 여기서 명시적으로
                setIsDetailModalVisible(false);
                setSelectedHandover(null);
                setEditMode(false);
              }}
              okText="삭제"
              cancelText="취소"
            >
              <Button danger>삭제</Button>
            </Popconfirm>
          ),
        ]}
        width={700}
      >
        {selectedHandover && (
          <>
            <div
              style={{
                borderBottom: '1px solid #f0f0f0',
                padding: '0 0 8px',
                marginBottom: 16,
              }}
            >
              <Space size="large">
                <span>
                  <strong>작성자:</strong> {selectedHandover.updateBy}{' '}
                  {/* camelCase */}
                </span>
                <span>
                  <strong>작성일:</strong>{' '}
                  {dayjs(selectedHandover.createAt).format('YYYY-MM-DD HH:mm')}{' '}
                  {/* camelCase */}
                </span>
              </Space>
            </div>

            <Paragraph
              style={{
                whiteSpace: 'pre-wrap',
                minHeight: 200,
              }}
            >
              {selectedHandover.content}
            </Paragraph>
          </>
        )}
      </Modal>
    </MainLayout>
  );
};

export default HandoverPage;
