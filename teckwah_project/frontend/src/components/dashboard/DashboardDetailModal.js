// src/components/dashboard/DashboardDetailModal.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  Typography,
  Divider,
  Form,
  Row,
  Col,
  Button,
  Card,
  Space,
  Alert,
  Tooltip,
  Badge,
  Descriptions,
  Result,
} from 'antd';
import {
  EditOutlined,
  CloseOutlined,
  SaveOutlined,
  SyncOutlined,
  WarningOutlined,
  LockOutlined,
  UnlockOutlined,
  MailOutlined,
  CarOutlined,
  InfoCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  DEPARTMENT_TEXTS,
  TYPE_TEXTS,
  STATUS_TEXTS,
  STATUS_COLORS,
  WAREHOUSE_TEXTS,
  FONT_STYLES,
} from '../../utils/Constants';
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  formatPhoneNumber,
} from '../../utils/Formatter';
import DashboardService from '../../services/DashboardService';
import LockService from '../../services/LockService';
import useLock from '../../hooks/useLock';
import useAsync from '../../hooks/useAsync';
import message, { MessageKeys } from '../../utils/message';
import ErrorHandler from '../../utils/ErrorHandler';
import DashboardInfoSection, {
  SectionTitle,
  InfoItem,
} from './DashboardInfoSection';
import DashboardStatusControl from './DashboardStatusControl';
import DashboardDetailForm from './DashboardDetailForm';
import DashboardRemarkEditor from './DashboardRemarkEditor';
import { useLogger } from '../../utils/LogUtils';

const { Title, Text, Paragraph } = Typography;

/**
 * 향상된 대시보드 상세 정보 모달 컴포넌트
 * 낙관적/비관적 락 통합 및 사용자/관리자 권한 차별화
 */
const DashboardDetailModal = ({
  visible, // 모달 표시 여부
  dashboard, // 대시보드 정보
  onCancel, // 취소 콜백
  onSuccess, // 성공 콜백
  isAdmin = false, // 관리자 여부
}) => {
  const logger = useLogger('DashboardDetailModal');
  const [form] = Form.useForm();
  const [editingFields, setEditingFields] = useState(false);
  const [editingRemark, setEditingRemark] = useState(false);
  const [currentDashboard, setCurrentDashboard] = useState(dashboard);
  const [remarkContent, setRemarkContent] = useState('');
  const lastUpdateRef = useRef(Date.now());

  // 낙관적 락을 위한 버전 관리
  const [currentVersion, setCurrentVersion] = useState(dashboard?.version || 1);

  // 모달 상태 관리
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);

  // 버전 불일치 알림 상태
  const [versionAlert, setVersionAlert] = useState({
    visible: false,
    message: '',
    latestVersion: null,
  });

  // 비관적 락 관리 커스텀 훅 사용
  const {
    hasLock,
    lockInfo,
    loading: lockLoading,
    error: lockError,
    acquireLock,
    releaseLock,
    renewLock,
    checkLockStatus,
  } = useLock({
    dashboardId: dashboard?.dashboard_id,
    lockType: 'EDIT',
    autoAcquire: false, // 수동 획득 모드
    autoRelease: true, // 컴포넌트 언마운트 시 자동 해제
    onLockSuccess: () => {
      logger.info('락 획득 성공');
      initFieldsForm();
      setEditingFields(true);
    },
    onLockError: (error) => {
      logger.error('락 획득 실패:', error);

      // 락 오류 상세 처리
      if (error.response?.status === 423) {
        const lockedBy =
          error.response?.data?.error?.detail?.locked_by || '다른 사용자';
        const lockType = error.response?.data?.error?.detail?.lock_type || '';
        let lockTypeText = getLockTypeText(lockType);

        message.error(
          `현재 ${lockedBy}님이 이 데이터를 ${lockTypeText} 중입니다. 잠시 후 다시 시도해주세요.`,
          'lock-error'
        );
      }
    },
    messageKey: MessageKeys.DASHBOARD.LOCK_ACQUIRE,
  });

  // 이전 상태 유지 (취소 시 복원용)
  const [previousState, setPreviousState] = useState({
    eta: null,
    customer: '',
    contact: '',
    address: '',
    postal_code: '',
    remark: '',
  });

  // 컴포넌트 마운트 또는 dashboard 변경 시 초기화
  useEffect(() => {
    if (dashboard) {
      logger.debug('대시보드 정보 수신:', dashboard);
      setCurrentDashboard(dashboard);
      setCurrentVersion(dashboard.version || 1);
      setRemarkContent(dashboard.remark || '');

      // 이전 상태 저장
      setPreviousState({
        eta: dashboard.eta ? dayjs(dashboard.eta) : null,
        customer: dashboard.customer || '',
        contact: dashboard.contact || '',
        address: dashboard.address || '',
        postal_code: dashboard.postal_code || '',
        remark: dashboard.remark || '',
      });

      // 버전 알림 초기화
      setVersionAlert({
        visible: false,
        message: '',
        latestVersion: null,
      });

      // 락 상태 확인
      checkLockStatus().catch((error) => {
        logger.error('락 상태 확인 실패:', error);
      });

      lastUpdateRef.current = Date.now();
    }
  }, [dashboard, checkLockStatus, logger]);

  // 락 자동 갱신 효과
  useEffect(() => {
    let renewInterval;

    if (hasLock) {
      logger.debug('락 자동 갱신 설정');

      // 2분마다 락 갱신
      renewInterval = setInterval(() => {
        renewLock().catch((error) => {
          logger.error('락 갱신 실패:', error);

          // 갱신 실패 시 사용자에게 알림
          message.warning(
            '편집 세션 갱신에 실패했습니다. 변경 사항을 저장하거나 편집을 취소하세요.',
            'lock-renew-error'
          );
        });
      }, 2 * 60 * 1000); // 2분 간격
    }

    return () => {
      if (renewInterval) {
        clearInterval(renewInterval);
        logger.debug('락 자동 갱신 정리');
      }
    };
  }, [hasLock, renewLock, logger]);

  // 모달 취소 시 편집 모드 및 락 정리
  const handleCancel = useCallback(async () => {
    // 변경 사항이 있는 경우 확인 요청
    if (
      (editingFields && isFormDirty) ||
      (editingRemark && remarkContent !== previousState.remark)
    ) {
      const confirmed = window.confirm(
        '저장되지 않은 변경 사항이 있습니다. 정말 닫으시겠습니까?'
      );
      if (!confirmed) return;
    }

    // 편집 모드 종료
    setEditingFields(false);
    setEditingRemark(false);

    // 락 해제 (필요한 경우)
    if (hasLock) {
      try {
        await releaseLock();
        logger.debug('모달 닫기 시 락 해제 성공');
      } catch (error) {
        logger.error('모달 닫기 시 락 해제 실패:', error);
      }
    }

    // 부모 컴포넌트의 취소 콜백 호출
    if (onCancel) {
      onCancel();
    }
  }, [
    editingFields,
    isFormDirty,
    editingRemark,
    remarkContent,
    previousState.remark,
    hasLock,
    releaseLock,
    onCancel,
    logger,
  ]);

  // 필드 수정을 위한 폼 초기화
  const initFieldsForm = useCallback(() => {
    form.setFieldsValue({
      eta: currentDashboard.eta ? dayjs(currentDashboard.eta) : null,
      customer: currentDashboard.customer || '',
      contact: currentDashboard.contact || '',
      address: currentDashboard.address || '',
      postal_code: currentDashboard.postal_code || '',
    });

    // 폼 변경 감지 초기화
    setIsFormDirty(false);
  }, [currentDashboard, form]);

  // 최신 데이터 재조회
  const refreshDashboardData = useCallback(async () => {
    try {
      setRefreshLoading(true);
      logger.info(
        `대시보드 상세 정보 새로고침: ID=${currentDashboard.dashboard_id}`
      );

      const refreshedData = await DashboardService.getDashboardDetail(
        currentDashboard.dashboard_id
      );

      if (refreshedData) {
        // 새로운 데이터로 상태 업데이트
        setCurrentDashboard(refreshedData);
        setCurrentVersion(refreshedData.version || 1);
        setRemarkContent(refreshedData.remark || '');

        // 이전 상태 업데이트
        setPreviousState({
          eta: refreshedData.eta ? dayjs(refreshedData.eta) : null,
          customer: refreshedData.customer || '',
          contact: refreshedData.contact || '',
          address: refreshedData.address || '',
          postal_code: refreshedData.postal_code || '',
          remark: refreshedData.remark || '',
        });

        // 버전 알림 초기화
        setVersionAlert({
          visible: false,
          message: '',
          latestVersion: null,
        });

        // 락 상태 확인
        await checkLockStatus();

        // 성공 메시지
        message.success('상세 정보가 업데이트되었습니다');
        lastUpdateRef.current = Date.now();

        // 부모 컴포넌트 성공 콜백
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      logger.error('상세 정보 새로고침 실패:', error);
      message.error('상세 정보 갱신 중 오류가 발생했습니다');
    } finally {
      setRefreshLoading(false);
    }
  }, [currentDashboard?.dashboard_id, checkLockStatus, onSuccess, logger]);

  // 필드 편집 시작
  const startEditingFields = useCallback(async () => {
    try {
      // 락 획득 시도
      logger.info(`필드 편집 모드 시작: ID=${currentDashboard.dashboard_id}`);
      await acquireLock();

      // 락 획득 성공 처리는 useLock 훅의 onLockSuccess에서 수행됨
    } catch (error) {
      // 락 획득 실패 처리는 useLock 훅의 onLockError에서 수행됨
      logger.error('필드 편집 시작 실패:', error);
    }
  }, [currentDashboard?.dashboard_id, acquireLock, logger]);

  // 필드 편집 취소
  const cancelEditingFields = useCallback(async () => {
    // 변경 사항이 있는 경우 확인 요청
    if (isFormDirty) {
      const confirmed = window.confirm(
        '저장되지 않은 변경 사항이 있습니다. 정말 취소하시겠습니까?'
      );
      if (!confirmed) return;
    }

    setEditingFields(false);
    form.resetFields();
    setIsFormDirty(false);

    // 락 해제
    try {
      await releaseLock();
      logger.debug('필드 편집 취소 시 락 해제 성공');
    } catch (error) {
      logger.error('필드 편집 취소 시 락 해제 실패:', error);
    }
  }, [isFormDirty, form, releaseLock, logger]);

  // 필드 저장 핸들러
  const handleFieldsUpdate = useCallback(async () => {
    try {
      setLocalLoading(true);

      // 폼 유효성 검증
      const values = await form.validateFields();
      logger.info('필드 업데이트 값:', values);

      // 필드 업데이트 데이터 준비
      const fieldsData = {
        eta: values.eta,
        customer: values.customer,
        contact: values.contact,
        address: values.address,
        postal_code: values.postal_code,
      };

      // 업데이트 API 호출 (낙관적 락 버전 포함)
      const updatedDashboard = await DashboardService.updateDashboardFields(
        currentDashboard.dashboard_id,
        fieldsData,
        currentVersion
      );

      // 성공 시 상태 업데이트
      setCurrentDashboard(updatedDashboard);
      setCurrentVersion(updatedDashboard.version || currentVersion + 1);
      setEditingFields(false);
      setIsFormDirty(false);

      // 락 해제
      await releaseLock();

      // 성공 메시지
      message.success('주문 정보가 업데이트되었습니다');

      // 부모 컴포넌트 성공 콜백
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      logger.error('필드 업데이트 실패:', error);

      // 낙관적 락 충돌 처리
      if (error.response?.status === 409) {
        // 서버 응답에서 최신 데이터 및 버전 정보 추출
        const latestData = error.response.data?.data;
        const newVersion = error.response.data?.version_info?.current_version;

        if (latestData) {
          // 최신 데이터로 UI 갱신
          setCurrentDashboard(latestData);
          setCurrentVersion(newVersion || latestData.version);

          // 충돌 알림 표시
          setVersionAlert({
            visible: true,
            message:
              '다른 사용자가 이미 이 정보를 수정했습니다. 최신 데이터로 갱신되었습니다.',
            latestVersion: newVersion || latestData.version,
          });

          // 편집 모드 종료
          setEditingFields(false);

          // 락 해제
          await releaseLock();
        }
      } else {
        // 일반 오류 처리
        message.error('데이터 업데이트 중 오류가 발생했습니다');
      }
    } finally {
      setLocalLoading(false);
    }
  }, [
    currentDashboard?.dashboard_id,
    currentVersion,
    form,
    releaseLock,
    onSuccess,
    logger,
  ]);

  // 메모 편집 시작
  const startEditingRemark = useCallback(async () => {
    try {
      // 락 획득 시도
      logger.info(`메모 편집 모드 시작: ID=${currentDashboard.dashboard_id}`);

      const lockAcquired = await LockService.acquireLock(
        currentDashboard.dashboard_id,
        'REMARK'
      );

      if (lockAcquired) {
        setEditingRemark(true);
        setRemarkContent(currentDashboard.remark || '');

        // 성공 메시지
        message.success('메모 편집 모드가 활성화되었습니다');
      }
    } catch (error) {
      logger.error('메모 편집 시작 실패:', error);

      // 비관적 락 에러 특수 처리
      if (error.response?.status === 423) {
        const lockedBy =
          error.response?.data?.error?.detail?.locked_by || '다른 사용자';
        message.error(
          `현재 ${lockedBy}님이 메모를 편집 중입니다. 잠시 후 다시 시도해주세요.`,
          'remark-lock-error'
        );
      } else {
        message.error('메모 편집 권한을 획득하지 못했습니다');
      }
    }
  }, [currentDashboard?.dashboard_id, logger]);

  // 메모 편집 취소
  const cancelEditingRemark = useCallback(async () => {
    // 변경 사항이 있는 경우 확인 요청
    if (remarkContent !== previousState.remark) {
      const confirmed = window.confirm(
        '저장되지 않은 메모 변경 사항이 있습니다. 정말 취소하시겠습니까?'
      );
      if (!confirmed) return;
    }

    setEditingRemark(false);
    setRemarkContent(previousState.remark || '');

    // 락 해제
    try {
      await LockService.releaseLock(currentDashboard.dashboard_id);
      logger.debug('메모 편집 취소 시 락 해제 성공');
    } catch (error) {
      logger.error('메모 편집 취소 시 락 해제 실패:', error);
    }
  }, [
    remarkContent,
    previousState.remark,
    currentDashboard?.dashboard_id,
    logger,
  ]);

  // 메모 저장 핸들러
  const handleRemarkUpdate = useCallback(async () => {
    try {
      setLocalLoading(true);
      logger.info('메모 업데이트 요청');

      // 메모 내용이 비어있지 않은지 확인
      if (!remarkContent.trim()) {
        message.warning('메모 내용을 입력해주세요');
        return;
      }

      // 업데이트 API 호출 (낙관적 락 버전 포함)
      const updatedDashboard = await DashboardService.updateRemark(
        currentDashboard.dashboard_id,
        remarkContent,
        currentVersion
      );

      // 성공 시 상태 업데이트
      setCurrentDashboard(updatedDashboard);
      setCurrentVersion(updatedDashboard.version || currentVersion + 1);
      setEditingRemark(false);

      // 락 해제
      await LockService.releaseLock(currentDashboard.dashboard_id);

      // 이전 상태 업데이트
      setPreviousState((prev) => ({
        ...prev,
        remark: remarkContent,
      }));

      // 성공 메시지
      message.success('메모가 업데이트되었습니다');

      // 부모 컴포넌트 성공 콜백
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      logger.error('메모 업데이트 실패:', error);

      // 낙관적 락 충돌 처리
      if (error.response?.status === 409) {
        // 서버 응답에서 최신 데이터 및 버전 정보 추출
        const latestData = error.response.data?.data;
        const newVersion = error.response.data?.version_info?.current_version;

        if (latestData) {
          // 최신 데이터로 UI 갱신
          setCurrentDashboard(latestData);
          setCurrentVersion(newVersion || latestData.version);
          setRemarkContent(latestData.remark || '');

          // 이전 상태 업데이트
          setPreviousState((prev) => ({
            ...prev,
            remark: latestData.remark || '',
          }));

          // 충돌 알림 표시
          setVersionAlert({
            visible: true,
            message:
              '다른 사용자가 이미 메모를 수정했습니다. 최신 데이터로 갱신되었습니다.',
            latestVersion: newVersion || latestData.version,
          });

          // 편집 모드 종료
          setEditingRemark(false);

          // 락 해제
          await LockService.releaseLock(currentDashboard.dashboard_id);
        }
      } else {
        // 일반 오류 처리
        message.error('메모 업데이트 중 오류가 발생했습니다');
      }
    } finally {
      setLocalLoading(false);
    }
  }, [
    currentDashboard?.dashboard_id,
    currentVersion,
    remarkContent,
    onSuccess,
    logger,
  ]);

  // 관리자 전용: 강제 락 해제
  const handleForceUnlock = useCallback(async () => {
    if (!isAdmin) return;

    try {
      logger.info(`강제 락 해제 요청: ID=${currentDashboard.dashboard_id}`);

      await LockService.forceReleaseLock(currentDashboard.dashboard_id);

      // 성공 메시지
      message.success('락이 강제로 해제되었습니다');

      // 락 상태 확인
      await checkLockStatus();

      // 데이터 새로고침
      await refreshDashboardData();
    } catch (error) {
      logger.error('강제 락 해제 실패:', error);
      message.error('강제 락 해제에 실패했습니다');
    }
  }, [
    isAdmin,
    currentDashboard?.dashboard_id,
    checkLockStatus,
    refreshDashboardData,
    logger,
  ]);

  // 상태 변경 핸들러
  const handleStatusChange = useCallback(
    (updatedDashboard) => {
      // 상태 업데이트
      setCurrentDashboard(updatedDashboard);
      setCurrentVersion(updatedDashboard.version);

      // 부모 컴포넌트 성공 콜백
      if (onSuccess) {
        onSuccess();
      }
    },
    [onSuccess]
  );

  // 락 타입에 따른 표시 텍스트 반환
  const getLockTypeText = useCallback((lockType) => {
    switch (lockType) {
      case 'EDIT':
        return '편집';
      case 'STATUS':
        return '상태 변경';
      case 'ASSIGN':
        return '배차';
      case 'REMARK':
        return '메모 작성';
      default:
        return '수정';
    }
  }, []);

  // 폼 필드 변경 감지
  useEffect(() => {
    const handleFieldsChange = () => {
      setIsFormDirty(true);
    };

    form.setFields([]);
    form.setFieldsValue({
      eta: currentDashboard.eta ? dayjs(currentDashboard.eta) : null,
      customer: currentDashboard.customer || '',
      contact: currentDashboard.contact || '',
      address: currentDashboard.address || '',
      postal_code: currentDashboard.postal_code || '',
    });

    form.getFieldInstance = () => true;

    const unsubscribe = form.subscribe(handleFieldsChange);

    return () => {
      unsubscribe();
    };
  }, [currentDashboard, form]);

  // 버전 충돌 알림 렌더링
  const renderVersionAlert = () => {
    if (!versionAlert.visible) return null;

    return (
      <Alert
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        message="데이터 버전 충돌"
        description={
          <>
            <Paragraph>{versionAlert.message}</Paragraph>
            <Paragraph>
              <Text strong>현재 버전: {versionAlert.latestVersion}</Text>
            </Paragraph>
          </>
        }
        action={
          <Button
            size="small"
            onClick={() =>
              setVersionAlert({
                visible: false,
                message: '',
                latestVersion: null,
              })
            }
          >
            확인
          </Button>
        }
        style={{ marginBottom: 16 }}
      />
    );
  };

  // 락 정보 알림 렌더링
  const renderLockInfo = () => {
    if (!lockInfo) return null;

    const lockTypeText = getLockTypeText(lockInfo.lock_type);
    const expiresAt = lockInfo.expires_at ? dayjs(lockInfo.expires_at) : null;
    const timeRemaining = expiresAt ? expiresAt.diff(dayjs(), 'minute') : 0;

    return (
      <Alert
        type="info"
        showIcon
        icon={<LockOutlined />}
        message="편집 세션 정보"
        description={
          <>
            <Paragraph>
              <Text>
                현재 <Text strong>{lockInfo.locked_by}</Text>님이 {lockTypeText}{' '}
                작업 중입니다.
              </Text>
            </Paragraph>
            {expiresAt && (
              <Paragraph>
                <Text>
                  세션 만료: {expiresAt.format('HH:mm:ss')} (남은 시간: 약{' '}
                  {timeRemaining}분)
                </Text>
              </Paragraph>
            )}
          </>
        }
        style={{ marginBottom: 16 }}
      />
    );
  };

  // 관리자 제어판 렌더링
  const renderAdminControls = () => {
    if (!isAdmin) return null;

    return (
      <Card
        size="small"
        title={<Text strong>관리자 제어판</Text>}
        extra={<Text type="secondary">버전: {currentVersion}</Text>}
        style={{ marginTop: 16, backgroundColor: '#fffbe6', marginBottom: 16 }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space wrap>
            <Tooltip title="모든 편집 락 강제 해제">
              <Button
                icon={<UnlockOutlined />}
                onClick={handleForceUnlock}
                danger
              >
                강제 락 해제
              </Button>
            </Tooltip>

            <Tooltip title="최신 데이터로 새로고침">
              <Button
                icon={<SyncOutlined spin={refreshLoading} />}
                onClick={refreshDashboardData}
                loading={refreshLoading}
              >
                데이터 새로고침
              </Button>
            </Tooltip>

            <Tooltip title="마지막 업데이트: ">
              <Text type="secondary">
                마지막 갱신: {dayjs(lastUpdateRef.current).format('HH:mm:ss')}
              </Text>
            </Tooltip>
          </Space>

          {lockInfo && (
            <Descriptions
              size="small"
              bordered
              column={1}
              style={{ marginTop: 8 }}
            >
              <Descriptions.Item label="락 소유자">
                {lockInfo.locked_by}
              </Descriptions.Item>
              <Descriptions.Item label="락 타입">
                {getLockTypeText(lockInfo.lock_type)}
              </Descriptions.Item>
              <Descriptions.Item label="만료 시간">
                {lockInfo.expires_at
                  ? dayjs(lockInfo.expires_at).format('HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Space>
      </Card>
    );
  };

  // 정보 섹션 데이터 구성
  const basicInfoItems = [
    { label: '부서', value: DEPARTMENT_TEXTS[currentDashboard.department] },
    { label: '종류', value: TYPE_TEXTS[currentDashboard.type] },
    { label: '출발 허브', value: WAREHOUSE_TEXTS[currentDashboard.warehouse] },
    { label: 'SLA', value: currentDashboard.sla },
  ];

  const timeInfoItems = [
    { label: '접수 시각', value: formatDateTime(currentDashboard.create_time) },
    { label: '출발 시각', value: formatDateTime(currentDashboard.depart_time) },
    {
      label: '완료 시각',
      value: formatDateTime(currentDashboard.complete_time),
    },
    {
      label: 'ETA',
      value: formatDateTime(currentDashboard.eta),
      highlight: true,
    },
  ];

  const driverInfoItems = [
    {
      label: '담당 기사',
      value: currentDashboard.driver_name,
      highlight: true,
    },
    {
      label: '기사 연락처',
      value: formatPhoneNumber(currentDashboard.driver_contact),
    },
  ];

  const deliveryInfoItems = [
    { label: '주소', value: currentDashboard.address },
    { label: '예상 거리', value: formatDistance(currentDashboard.distance) },
    {
      label: '예상 소요시간',
      value: formatDuration(currentDashboard.duration_time),
    },
  ];

  const receiverInfoItems = [
    { label: '수령인', value: currentDashboard.customer },
    { label: '연락처', value: formatPhoneNumber(currentDashboard.contact) },
  ];

  // 메모 섹션 렌더링
  const renderRemarkSection = () => {
    if (editingRemark) {
      return (
        <div style={{ marginTop: 24 }}>
          <SectionTitle>메모 편집</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <TextArea
              value={remarkContent}
              onChange={(e) => setRemarkContent(e.target.value)}
              rows={6}
              maxLength={2000}
              showCount
              style={{ width: '100%', padding: 12, borderRadius: 6 }}
              placeholder="메모를 입력하세요"
              disabled={localLoading}
            />
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleRemarkUpdate}
                loading={localLoading}
                size="large"
              >
                저장
              </Button>
              <Button
                icon={<CloseOutlined />}
                onClick={cancelEditingRemark}
                size="large"
                disabled={localLoading}
              >
                취소
              </Button>
            </Space>
          </div>
        </div>
      );
    }

    return (
      <div style={{ marginTop: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <SectionTitle>메모</SectionTitle>
          <Button
            icon={<EditOutlined />}
            onClick={startEditingRemark}
            size="middle"
          >
            메모 편집
          </Button>
        </div>
        <div
          style={{
            backgroundColor: '#fafafa',
            padding: 16,
            borderRadius: 6,
            minHeight: 120,
            maxHeight: 200,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {currentDashboard.remark || '메모 없음'}
        </div>
      </div>
    );
  };

  // 메인 렌더링
  return (
    <Modal
      title={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0',
            marginRight: '48px',
          }}
        >
          <div>
            <Text style={{ ...FONT_STYLES.TITLE.MEDIUM, marginRight: '12px' }}>
              주문번호: {currentDashboard.order_no}
            </Text>
            <Badge
              count={STATUS_TEXTS[currentDashboard.status]}
              style={{
                backgroundColor:
                  currentDashboard.status === 'WAITING'
                    ? '#1890ff'
                    : currentDashboard.status === 'IN_PROGRESS'
                    ? '#faad14'
                    : currentDashboard.status === 'COMPLETE'
                    ? '#52c41a'
                    : currentDashboard.status === 'ISSUE'
                    ? '#f5222d'
                    : '#d9d9d9',
              }}
            />
          </div>
          {!editingFields && (
            <DashboardStatusControl
              dashboard={currentDashboard}
              onStatusChange={handleStatusChange}
              isAdmin={isAdmin}
            />
          )}
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={1200}
      bodyStyle={{
        maxHeight: 'calc(90vh - 150px)',
        overflowY: 'auto',
        padding: '24px',
      }}
      maskClosable={!editingFields && !editingRemark}
      closable={!editingFields && !editingRemark}
      destroyOnClose={true}
    >
      {/* 버전 충돌 알림 */}
      {renderVersionAlert()}

      {/* 락 정보 알림 */}
      {hasLock && renderLockInfo()}

      {/* 관리자 제어판 */}
      {isAdmin && renderAdminControls()}

      {/* 편집 모드 */}
      {editingFields ? (
        <DashboardDetailForm
          form={form}
          loading={localLoading}
          onSave={handleFieldsUpdate}
          onCancel={cancelEditingFields}
        />
      ) : (
        <div style={{ padding: '0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '16px',
            }}
          >
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={startEditingFields}
            >
              정보 수정
            </Button>
          </div>

          <Row gutter={32}>
            <Col span={12}>
              <DashboardInfoSection title="기본 정보" items={basicInfoItems} />
              <DashboardInfoSection title="배송 시간" items={timeInfoItems} />
            </Col>

            <Col span={12}>
              <DashboardInfoSection
                title="배송 담당자"
                items={driverInfoItems}
              />
              <DashboardInfoSection
                title="배송 세부사항"
                items={deliveryInfoItems}
              />
              <DashboardInfoSection
                title="수령인 정보"
                items={receiverInfoItems}
              />
            </Col>
          </Row>

          <Divider />

          {/* 메모 섹션 */}
          {renderRemarkSection()}
        </div>
      )}
    </Modal>
  );
};

export default DashboardDetailModal;
