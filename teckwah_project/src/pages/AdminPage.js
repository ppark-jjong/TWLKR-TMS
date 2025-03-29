// src/pages/AdminPage.js
import React, { useState, useEffect } from 'react';
import { Card, Form, DatePicker, Button, Row, Col, message, Table, Space, Popconfirm, Tag, Divider } from 'antd';
import { DownloadOutlined, DeleteOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import locale from 'antd/es/date-picker/locale/ko_KR';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { downloadExcel, getDownloadDateRange, fetchDashboards, deleteDashboards, acquireLock } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import LockConflictModal from '../components/LockConflictModal';
import { isAdmin } from '../utils/authHelpers';

const { RangePicker } = DatePicker;

const AdminPage = () => {
  const queryClient = useQueryClient();
  const [downloadForm] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchParams, setSearchParams] = useState({
    page: 1,
    size: 10,
  });
  const [dateRangeInfo, setDateRangeInfo] = useState(null);
  const [lockConflictInfo, setLockConflictInfo] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // 날짜 범위 정보 조회
  const fetchDateRange = async () => {
    try {
      const response = await getDownloadDateRange();
      if (response.data.success) {
        setDateRangeInfo(response.data.data);
        
        // 초기 폼 값 설정
        const oldest = response.data.data.oldest_date;
        const latest = response.data.data.latest_date;
        
        downloadForm.setFieldsValue({
          date_range: [
            dayjs().subtract(7, 'day').isAfter(dayjs(oldest)) ? dayjs().subtract(7, 'day') : dayjs(oldest),
            dayjs(latest)
          ],
        });
      }
    } catch (error) {
      console.error('Date range fetch error:', error);
    }
  };

  // 대시보드 목록 조회
  const { data, isLoading, refetch } = useQuery(
    ['admin-dashboards', searchParams],
    () => fetchDashboards(searchParams),
    {
      keepPreviousData: true,
      onError: (error) => {
        message.error('데이터 로딩 중 오류가 발생했습니다');
        console.error('Dashboard fetch error:', error);
      }
    }
  );

  // 삭제 뮤테이션
  const deleteMutation = useMutation(
    (ids) => deleteDashboards(ids),
    {
      onSuccess: () => {
        message.success('선택한 항목이 삭제되었습니다');
        setSelectedRowKeys([]);
        queryClient.invalidateQueries('admin-dashboards');
      },
      onError: (error) => {
        message.error('삭제 중 오류가 발생했습니다');
        console.error('Delete error:', error);
      },
      onSettled: () => {
        setDeleteLoading(false);
      }
    }
  );

  // 관리자 권한 확인
  useEffect(() => {
    if (!isAdmin()) {
      message.error('관리자 권한이 필요합니다');
      window.location.href = '/dashboard';
      return;
    }
    
    fetchDateRange();
  }, []);

  // 엑셀 다운로드 처리
  const handleDownload = async () => {
    try {
      await downloadForm.validateFields();
      const values = downloadForm.getFieldsValue();
      
      if (!values.date_range) {
        message.error('날짜 범위를 선택해주세요');
        return;
      }
      
      // 날짜 범위 유효성 검사 (최대 3개월)
      const start = dayjs(values.date_range[0]);
      const end = dayjs(values.date_range[1]);
      const diff = end.diff(start, 'day');
      
      if (diff > 90) {
        message.error('최대 3개월 내의 데이터만 다운로드할 수 있습니다');
        return;
      }
      
      setDownloadLoading(true);
      
      try {
        const params = {
          start_date: start.format('YYYY-MM-DD'),
          end_date: end.format('YYYY-MM-DD'),
        };
        
        const response = await downloadExcel(params);
        
        // 파일 다운로드 처리
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `대시보드_데이터_${start.format('YYYYMMDD')}_${end.format('YYYYMMDD')}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        message.success('엑셀 파일 다운로드가 완료되었습니다');
      } catch (error) {
        console.error('Download error:', error);
        message.error('다운로드 중 오류가 발생했습니다');
      } finally {
        setDownloadLoading(false);
      }
    } catch (error) {
      message.error('입력 값을 확인해주세요');
    }
  };

  // 삭제 처리
  const handleDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('삭제할 항목을 선택해주세요');
      return;
    }
    
    setDeleteLoading(true);
    
    // 다중 락 획득 시도
    try {
      // 모든 선택된 항목에 대해 락 획득
      await Promise.all(
        selectedRowKeys.map(id => acquireLock(id, 'EDIT'))
      );
      
      // 락 획득 성공 시 삭제 처리
      deleteMutation.mutate(selectedRowKeys);
    } catch (error) {
      setDeleteLoading(false);
      console.error('Lock acquisition error:', error);
      
      if (error.response?.data?.error_code === 'LOCK_CONFLICT') {
        setLockConflictInfo(error.response.data.data);
        return;
      }
      
      message.error('락 획득 중 오류가 발생했습니다');
    }
  };

  // 락 취소
  const handleCancelLock = () => {
    setLockConflictInfo(null);
  };

  // 선택 행 변경
  const onSelectChange = (selectedKeys) => {
    setSelectedRowKeys(selectedKeys);
  };

  // 테이블 변경 (페이징)
  const handleTableChange = (pagination) => {
    setSearchParams({
      ...searchParams,
      page: pagination.current,
      size: pagination.pageSize,
    });
  };

  // 스테이터스 태그 색상 매핑
  const getStatusColor = (status) => {
    const colors = {
      'WAITING': 'blue',
      'IN_PROGRESS': 'orange',
      'COMPLETE': 'green',
      'ISSUE': 'red',
      'CANCEL': 'gray'
    };
    return colors[status] || 'default';
  };

  // 스테이터스 한글 변환 매핑
  const getStatusText = (status) => {
    const texts = {
      'WAITING': '대기',
      'IN_PROGRESS': '진행',
      'COMPLETE': '완료',
      'ISSUE': '이슈',
      'CANCEL': '취소'
    };
    return texts[status] || status;
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: '주문번호',
      dataIndex: 'order_no',
      key: 'order_no',
    },
    {
      title: '고객',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: '유형',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'DELIVERY' ? 'blue' : 'purple'}>
          {type === 'DELIVERY' ? '배송' : '회수'}
        </Tag>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '부서',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '창고',
      dataIndex: 'warehouse',
      key: 'warehouse',
    },
    {
      title: 'ETA',
      dataIndex: 'eta',
      key: 'eta',
      render: (eta) => eta ? dayjs(eta).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '생성일',
      dataIndex: 'create_time',
      key: 'create_time',
      render: (create_time) => create_time ? dayjs(create_time).format('YYYY-MM-DD') : '-',
    },
  ];

  return (
    <div>
      <Card title="관리자 기능">
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="엑셀 다운로드" bordered={false}>
              <Form form={downloadForm} layout="vertical">
                <Row gutter={16}>
                  <Col span={16}>
                    <Form.Item
                      name="date_range"
                      label="날짜 범위 (최대 3개월)"
                      rules={[{ required: true, message: '날짜 범위를 선택해주세요' }]}
                    >
                      <RangePicker
                        locale={locale}
                        style={{ width: '100%' }}
                        disabledDate={(current) => {
                          // 날짜 범위 제한
                          if (!dateRangeInfo || !current) return false;
                          
                          const oldest = dayjs(dateRangeInfo.oldest_date);
                          const latest = dayjs(dateRangeInfo.latest_date);
                          
                          return current.isBefore(oldest) || current.isAfter(latest);
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label=" " style={{ marginTop: 5 }}>
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleDownload}
                        loading={downloadLoading}
                        style={{ width: '100%' }}
                      >
                        엑셀 다운로드
                      </Button>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
              <div style={{ marginTop: 8, color: 'rgba(0, 0, 0, 0.45)' }}>
                * 최대 3개월 내의 데이터만 다운로드할 수 있습니다. 엑셀 파일에는 선택한 날짜 범위 내의 모든 주문 정보가 포함됩니다.
              </div>
            </Card>
          </Col>
          
          <Col span={24}>
            <Card title="데이터 삭제" bordered={false}>
              <div style={{ marginBottom: 16 }}>
                <Popconfirm
                  title="정말 삭제하시겠습니까?"
                  description="선택한 항목이 영구적으로 삭제됩니다."
                  icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
                  onConfirm={handleDelete}
                  okText="삭제"
                  cancelText="취소"
                  disabled={selectedRowKeys.length === 0}
                >
                  <Button
                    type="primary"
                    danger
                    icon={<DeleteOutlined />}
                    loading={deleteLoading}
                    disabled={selectedRowKeys.length === 0}
                  >
                    선택 항목 삭제 ({selectedRowKeys.length}건)
                  </Button>
                </Popconfirm>
                <span style={{ marginLeft: 8 }}>
                  {selectedRowKeys.length > 0 ? `${selectedRowKeys.length}건 선택됨` : ''}
                </span>
              </div>
              
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <Table
                  rowSelection={{
                    selectedRowKeys,
                    onChange: onSelectChange,
                  }}
                  columns={columns}
                  dataSource={data?.data?.data || []}
                  rowKey="dashboard_id"
                  pagination={{
                    current: searchParams.page,
                    pageSize: searchParams.size,
                    total: data?.data?.meta?.total || 0,
                  }}
                  onChange={handleTableChange}
                  size="middle"
                />
              )}
              <div style={{ marginTop: 8, color: 'rgba(0, 0, 0, 0.45)' }}>
                * 여기서 삭제된 데이터는 영구적으로 삭제되며 복구할 수 없습니다. 주의하세요.
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
      
      {/* 락 충돌 모달 */}
      <LockConflictModal
        visible={!!lockConflictInfo}
        lockInfo={lockConflictInfo}
        onRetry={() => {
          setLockConflictInfo(null);
          setTimeout(() => handleDelete(), 500);
        }}
        onCancel={handleCancelLock}
        confirmLoading={deleteLoading}
      />
    </div>
  );
};

export default AdminPage;