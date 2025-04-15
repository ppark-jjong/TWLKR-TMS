/**
 * 인수인계 페이지 컴포넌트
 */
import React, { useState, useEffect } from 'react';
import { 
  Button, Space, Table, Tooltip, message, Popconfirm, 
  Modal, Input, Form, Checkbox, Tag, Typography 
} from 'antd';
import { 
  PlusOutlined, DeleteOutlined, InfoCircleOutlined,
  PushpinOutlined
} from '@ant-design/icons';
import MainLayout from '../components/layout/MainLayout';
import { PageTitle, CustomTable, PageLoading, ErrorResult } from '../components/common';
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
    total: 0
  });
  
  // 모달 상태
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedHandover, setSelectedHandover] = useState(null);
  const [editMode, setEditMode] = useState(false); // 편집 모드 상태 추가
  
  // 폼 인스턴스
  const [form] = Form.useForm();
  
  // 데이터 불러오기
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize
      };
      
      const response = await HandoverService.getHandovers(params);
      
      if (response.success) {
        setData(response.data.items);
        setPagination({
          ...pagination,
          total: response.data.total
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
      total: pagination.total
    });
  };
  
  // 인수인계 상세 보기 (조회 시 락 획득 안함)
  const handleViewDetail = async (record) => {
    try {
      // 최신 데이터 조회 (락 없이)
      const response = await HandoverService.getHandover(record.handoverId);
      if (response.success) {
        setSelectedHandover(response.data);
        
        // 락 상태 확인만 표시
        if (response.lock_status && !response.lock_status.editable) {
          message.info(`현재 ${response.lock_status.locked_by || '다른 사용자'}가 편집 중입니다.`);
        }
      } else {
        setSelectedHandover(record);
      }
      
      setIsDetailModalVisible(true);
      setEditMode(false); // 초기에는 읽기 모드로 시작
    } catch (error) {
      console.error('인수인계 조회 오류:', error);
      message.error('인수인계 정보 로드 중 오류가 발생했습니다');
      // 오류가 발생해도 모달은 열어줌
      setSelectedHandover(record);
      setIsDetailModalVisible(true);
    }
  };
  
  // 수정 버튼 클릭 시 락 획득
  const handleEditHandoverClick = async (handoverId) => {
    try {
      // 락 획득 시도 - update_by와 update_at 필드는 백엔드에서 자동 업데이트
      const lockResponse = await HandoverService.lockHandover(handoverId);
      
      if (!lockResponse.success || !lockResponse.lock_status?.editable) {
        // 락 획득 실패 시 오류 메시지
        message.error(lockResponse.message || '현재 다른 사용자가 편집 중이라 수정할 수 없습니다.');
        return false;
      }
      
      // 락 획득 성공 시 수정 모드로 변경
      setEditMode(true);
      return true;
    } catch (error) {
      console.error('락 획득 오류:', error);
      message.error('수정 권한 획득 중 오류가 발생했습니다');
      return false;
    }
  };
  
  // 인수인계 삭제
  const handleDelete = async (handoverId) => {
    try {
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
  
  // 인수인계 생성
  const handleCreate = async (values) => {
    try {
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
  
  // 삭제 권한 확인
  const canDelete = (record) => {
    return currentUser?.userRole === 'ADMIN' || 
           record.updateBy === currentUser?.userId;
  };
  
  // 모달 닫기 (편집 모드인 경우에만 락 해제)
  const handleCloseDetailModal = async () => {
    if (selectedHandover && editMode) {
      try {
        await HandoverService.unlockHandover(selectedHandover.handoverId);
      } catch (error) {
        console.error('락 해제 오류:', error);
      }
      setEditMode(false);
    }
    setIsDetailModalVisible(false);
  };
  
  // 수정 완료 시 락 해제
  const handleUpdateComplete = async () => {
    if (selectedHandover) {
      try {
        await HandoverService.unlockHandover(selectedHandover.handoverId);
        message.success('수정이 완료되었습니다.');
        setEditMode(false);
        fetchData(); // 데이터 새로고침
      } catch (error) {
        console.error('락 해제 오류:', error);
        message.error('락 해제 중 오류가 발생했습니다');
      }
    }
  };
  
  // 테이블 컬럼 설정
  const columns = [
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text, record) => (
        <Space>
          {record.isNotice && (
            <Tag color="gold">공지</Tag>
          )}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '작성자',
      dataIndex: 'updateBy',
      key: 'updateBy',
      width: 120,
    },
    {
      title: '작성일',
      dataIndex: 'createAt',
      key: 'createAt',
      width: 170,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
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
              onConfirm={() => handleDelete(record.handoverId)}
              okText="삭제"
              cancelText="취소"
            >
              <Button 
                type="link" 
                size="small" 
                danger
              >
                삭제
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];
  
  // 행 클릭 설정
  const handleRowClick = (record) => {
    return {
      onClick: () => {
        handleViewDetail(record);
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
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginBottom: '16px' 
        }}>
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: '16px' 
      }}>
        {pageExtra}
      </div>
      
      <CustomTable
        dataSource={data}
        columns={columns}
        loading={loading}
        rowKey="handoverId"
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
      
      {/* 인수인계 생성 모달 */}
      <Modal
        title="새 인수인계 작성"
        open={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsCreateModalVisible(false)}>
            취소
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={() => form.submit()}
          >
            저장
          </Button>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ isNotice: false }}
        >
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
            name="isNotice"
            valuePropName="checked"
          >
            <Checkbox>공지사항으로 등록</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* 인수인계 상세 모달 */}
      <Modal
        title={
          <Space>
            {selectedHandover?.isNotice && (
              <Tag color="gold" icon={<PushpinOutlined />}>공지사항</Tag>
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
                handleDelete(selectedHandover.handoverId);
                setIsDetailModalVisible(false);
              }}
              okText="삭제"
              cancelText="취소"
            >
              <Button danger>
                삭제
              </Button>
            </Popconfirm>
          )
        ]}
        width={700}
      >
        {selectedHandover && (
          <>
            <div style={{ 
              borderBottom: '1px solid #f0f0f0', 
              padding: '0 0 8px', 
              marginBottom: 16 
            }}>
              <Space size="large">
                <span>
                  <strong>작성자:</strong> {selectedHandover.updateBy}
                </span>
                <span>
                  <strong>작성일:</strong> {dayjs(selectedHandover.createAt).format('YYYY-MM-DD HH:mm')}
                </span>
              </Space>
            </div>
            
            <Paragraph
              style={{ 
                whiteSpace: 'pre-wrap',
                minHeight: 200
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
