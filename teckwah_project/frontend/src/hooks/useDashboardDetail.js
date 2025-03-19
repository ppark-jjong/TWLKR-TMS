// src/hooks/useDashboardDetail.js
import { useState, useEffect, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import DashboardService from '../services/DashboardService';
import LockService from '../services/LockService';
import message from '../utils/message';
import { MessageKeys } from '../utils/message';
import { useLogger } from '../utils/LogUtils';

/**
 * 대시보드 상세 정보 관리 커스텀 훅
 * 대시보드 조회, 수정, 락 관리, 메모 업데이트 기능 통합
 *
 * @param {Object} options - 훅 옵션
 * @param {number} options.dashboardId - 대시보드 ID
 * @param {Function} options.onSuccess - 성공 시 콜백
 * @param {Function} options.onError - 에러 시 콜백
 * @returns {Object} - 대시보드 상세 정보 관련 상태 및 함수
 */
const useDashboardDetail = ({ dashboardId, onSuccess, onError }) => {
  const logger = useLogger('useDashboardDetail');
  const { user, isAdmin } = useAuth();

  // 상태 관리
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState({
    fields: false,
    remark: false,
  });
  const [remarkContent, setRemarkContent] = useState('');
  const [lockInfo, setLockInfo] = useState(null);
  const [lockLoading, setLockLoading] = useState(false);

  // 이전 상태 참조 (취소 시 복원용)
  const prevStateRef = useRef({
    dashboard: null,
    remarkContent: '',
  });

  // 요청 상태 추적
  const requestInProgress = useRef(false);
  const lockCheckIntervalRef = useRef(null);

  /**
   * 대시보드 상세 정보 조회
   * @returns {Promise<Object>} - 대시보드 상세 정보
   */
  const fetchDashboardDetail = useCallback(async () => {
    if (!dashboardId || requestInProgress.current) return null;

    try {
      setLoading(true);
      requestInProgress.current = true;

      logger.info(`대시보드 상세 정보 조회: id=${dashboardId}`);
      const response = await DashboardService.getDashboardDetail(dashboardId);

      // 상태 업데이트
      setDashboard(response);

      // 메모 내용 설정 (첫 번째 메모 사용)
      if (response.remarks && response.remarks.length > 0) {
        setRemarkContent(response.remarks[0].content || '');
      }

      // 락 정보 설정
      if (response.is_locked && response.lock_info) {
        setLockInfo(response.lock_info);
      } else {
        setLockInfo(null);
      }

      // 이전 상태 저장 (취소 시 복원용)
      prevStateRef.current = {
        dashboard: { ...response },
        remarkContent:
          response.remarks && response.remarks.length > 0
            ? response.remarks[0].content || ''
            : '',
      };

      return response;
    } catch (err) {
      logger.error('대시보드 상세 정보 조회 실패:', err);
      setError(err.message || '상세 정보를 불러오는 중 오류가 발생했습니다');

      if (onError) {
        onError(err);
      }

      return null;
    } finally {
      setLoading(false);
      requestInProgress.current = false;
    }
  }, [dashboardId, logger, onError]);

  /**
   * 락 상태 확인
   * @returns {Promise<Object>} - 락 상태 정보
   */
  const checkLockStatus = useCallback(async () => {
    if (!dashboardId) return null;

    try {
      const lockStatus = await LockService.checkLockStatus(dashboardId);

      if (lockStatus && lockStatus.is_locked) {
        setLockInfo(lockStatus);
      } else {
        setLockInfo(null);
      }

      return lockStatus;
    } catch (err) {
      logger.error('락 상태 확인 실패:', err);
      return null;
    }
  }, [dashboardId, logger]);

  /**
   * 필드 편집 모드 시작
   * @returns {Promise<boolean>} - 락 획득 성공 여부
   */
  const startFieldsEdit = useCallback(async () => {
    if (!dashboardId || editMode.fields || editMode.remark) {
      return false;
    }

    try {
      setLockLoading(true);

      logger.info(`필드 편집 모드 시작: id=${dashboardId}`);
      const lockResult = await LockService.acquireLock(dashboardId, 'EDIT');

      if (lockResult) {
        setEditMode((prev) => ({ ...prev, fields: true }));
        setLockInfo(lockResult);

        // 락 갱신 인터벌 설정
        setupLockRenewInterval();

        return true;
      }

      return false;
    } catch (err) {
      logger.error('필드 편집 모드 시작 실패:', err);

      // 다른 사용자가 락을 소유한 경우 (423 Locked)
      if (err.response?.status === 423) {
        const lockedBy =
          err.response.data?.error?.detail?.locked_by || '다른 사용자';
        const lockType = err.response.data?.error?.detail?.lock_type || '';

        message.error(
          `현재 ${lockedBy}님이 이 데이터를 ${getLockTypeText(
            lockType
          )} 중입니다. 잠시 후 다시 시도해주세요.`
        );
      } else {
        message.error('편집 모드 활성화에 실패했습니다');
      }

      return false;
    } finally {
      setLockLoading(false);
    }
  }, [dashboardId, editMode, logger]);

  /**
   * 메모 편집 모드 시작
   * @returns {Promise<boolean>} - 락 획득 성공 여부
   */
  const startRemarkEdit = useCallback(async () => {
    if (!dashboardId || editMode.fields || editMode.remark) {
      return false;
    }

    try {
      setLockLoading(true);

      logger.info(`메모 편집 모드 시작: id=${dashboardId}`);
      const lockResult = await LockService.acquireLock(dashboardId, 'REMARK');

      if (lockResult) {
        setEditMode((prev) => ({ ...prev, remark: true }));
        setLockInfo(lockResult);

        // 락 갱신 인터벌 설정
        setupLockRenewInterval();

        return true;
      }

      return false;
    } catch (err) {
      logger.error('메모 편집 모드 시작 실패:', err);

      // 다른 사용자가 락을 소유한 경우 (423 Locked)
      if (err.response?.status === 423) {
        const lockedBy =
          err.response.data?.error?.detail?.locked_by || '다른 사용자';
        const lockType = err.response.data?.error?.detail?.lock_type || '';

        message.error(
          `현재 ${lockedBy}님이 이 데이터를 ${getLockTypeText(
            lockType
          )} 중입니다. 잠시 후 다시 시도해주세요.`
        );
      } else {
        message.error('메모 편집 모드 활성화에 실패했습니다');
      }

      return false;
    } finally {
      setLockLoading(false);
    }
  }, [dashboardId, editMode, logger]);

  /**
   * 필드 업데이트
   * @param {Object} fields - 업데이트할 필드
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  const updateFields = useCallback(
    async (fields) => {
      if (!dashboardId || !editMode.fields) {
        return null;
      }

      try {
        setLoading(true);

        logger.info(`대시보드 필드 업데이트: id=${dashboardId}`, fields);

        // 날짜 필드 처리
        const processedFields = { ...fields };
        if (processedFields.eta && typeof processedFields.eta === 'object') {
          if (processedFields.eta.format) {
            processedFields.eta = processedFields.eta.format();
          }
        }

        const updatedDashboard = await DashboardService.updateDashboardFields(
          dashboardId,
          processedFields
        );

        if (updatedDashboard) {
          // 상태 업데이트
          setDashboard(updatedDashboard);
          setEditMode((prev) => ({ ...prev, fields: false }));

          // 락 해제
          await releaseLock();

          // 성공 콜백
          if (onSuccess) {
            onSuccess(updatedDashboard);
          }

          message.success('필드가 업데이트되었습니다');
          return updatedDashboard;
        }

        return null;
      } catch (err) {
        logger.error('필드 업데이트 실패:', err);
        message.error('필드 업데이트 중 오류가 발생했습니다');

        if (onError) {
          onError(err);
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    [dashboardId, editMode.fields, logger, onSuccess, onError]
  );

  /**
   * 메모 업데이트
   * @returns {Promise<Object>} - 업데이트된 메모 정보
   */
  const updateRemark = useCallback(async () => {
    if (
      !dashboardId ||
      !editMode.remark ||
      !dashboard ||
      !dashboard.remarks ||
      dashboard.remarks.length === 0
    ) {
      return null;
    }

    try {
      setLoading(true);

      const remarkId = dashboard.remarks[0].remark_id;
      logger.info(`메모 업데이트: id=${dashboardId}, remarkId=${remarkId}`);

      const updatedRemark = await DashboardService.updateRemark(
        dashboardId,
        remarkId,
        remarkContent
      );

      if (updatedRemark) {
        // 대시보드 업데이트 (메모 포함)
        const updatedDashboard = {
          ...dashboard,
          remarks: [updatedRemark, ...dashboard.remarks.slice(1)],
        };

        setDashboard(updatedDashboard);
        setEditMode((prev) => ({ ...prev, remark: false }));

        // 락 해제
        await releaseLock();

        // 성공 콜백
        if (onSuccess) {
          onSuccess(updatedDashboard);
        }

        message.success('메모가 업데이트되었습니다');
        return updatedRemark;
      }

      return null;
    } catch (err) {
      logger.error('메모 업데이트 실패:', err);
      message.error('메모 업데이트 중 오류가 발생했습니다');

      if (onError) {
        onError(err);
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, [
    dashboardId,
    editMode.remark,
    dashboard,
    remarkContent,
    logger,
    onSuccess,
    onError,
  ]);

  /**
   * 락 해제
   * @returns {Promise<boolean>} - 락 해제 성공 여부
   */
  const releaseLock = useCallback(async () => {
    if (!dashboardId) return false;

    try {
      const result = await LockService.releaseLock(dashboardId);

      // 편집 모드 종료
      setEditMode({ fields: false, remark: false });
      setLockInfo(null);

      // 락 갱신 인터벌 정리
      if (lockCheckIntervalRef.current) {
        clearInterval(lockCheckIntervalRef.current);
        lockCheckIntervalRef.current = null;
      }

      return result;
    } catch (err) {
      logger.error('락 해제 실패:', err);
      return false;
    }
  }, [dashboardId, logger]);

  /**
   * 편집 취소
   */
  const cancelEdit = useCallback(async () => {
    // 이전 상태로 복원
    if (prevStateRef.current.dashboard) {
      setDashboard(prevStateRef.current.dashboard);
    }

    if (editMode.remark) {
      setRemarkContent(prevStateRef.current.remarkContent);
    }

    // 편집 모드 종료
    setEditMode({ fields: false, remark: false });

    // 락 해제
    await releaseLock();
  }, [editMode, releaseLock]);

  /**
   * 상태 변경
   * @param {string} status - 변경할 상태
   * @returns {Promise<Object>} - 업데이트된 대시보드 정보
   */
  const updateStatus = useCallback(
    async (status) => {
      if (!dashboardId) return null;

      try {
        setLoading(true);

        logger.info(`상태 업데이트: id=${dashboardId}, status=${status}`);
        const updatedDashboard = await DashboardService.updateStatus(
          dashboardId,
          status,
          isAdmin
        );

        if (updatedDashboard) {
          setDashboard(updatedDashboard);

          // 성공 콜백
          if (onSuccess) {
            onSuccess(updatedDashboard);
          }

          return updatedDashboard;
        }

        return null;
      } catch (err) {
        logger.error('상태 업데이트 실패:', err);

        if (onError) {
          onError(err);
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    [dashboardId, isAdmin, logger, onSuccess, onError]
  );

  /**
   * 락 갱신 인터벌 설정
   */
  const setupLockRenewInterval = useCallback(() => {
    // 기존 인터벌 정리
    if (lockCheckIntervalRef.current) {
      clearInterval(lockCheckIntervalRef.current);
    }

    // 2분마다 락 갱신
    lockCheckIntervalRef.current = setInterval(async () => {
      if (dashboardId && (editMode.fields || editMode.remark)) {
        try {
          await LockService.renewLock(dashboardId);
          logger.debug('락 갱신 성공');
        } catch (err) {
          logger.error('락 갱신 실패:', err);

          // 갱신 실패 시 알림
          message.warning(
            '편집 세션 갱신에 실패했습니다. 변경 사항을 저장하거나 편집을 취소하세요.'
          );
        }
      }
    }, 2 * 60 * 1000); // 2분 간격
  }, [dashboardId, editMode, logger]);

  /**
   * 락 타입에 따른 표시 텍스트 반환
   */
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

  // 락 상태 확인 인터벌 (30초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      if (dashboardId && !editMode.fields && !editMode.remark) {
        checkLockStatus();
      }
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, [dashboardId, editMode, checkLockStatus]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      // 편집 모드인 경우 락 해제
      if (dashboardId && (editMode.fields || editMode.remark)) {
        releaseLock().catch((err) => {
          logger.error('언마운트 시 락 해제 실패:', err);
        });
      }

      // 인터벌 정리
      if (lockCheckIntervalRef.current) {
        clearInterval(lockCheckIntervalRef.current);
      }
    };
  }, [dashboardId, editMode, releaseLock, logger]);

  // 초기 데이터 로드
  useEffect(() => {
    if (dashboardId) {
      fetchDashboardDetail();
    }
  }, [dashboardId, fetchDashboardDetail]);

  return {
    // 상태
    dashboard,
    loading,
    error,
    editMode,
    remarkContent,
    lockInfo,
    lockLoading,

    // 상태 설정 함수
    setRemarkContent,

    // 액션 함수
    fetchDashboardDetail,
    checkLockStatus,
    startFieldsEdit,
    startRemarkEdit,
    updateFields,
    updateRemark,
    releaseLock,
    cancelEdit,
    updateStatus,

    // 유틸리티 함수
    getLockTypeText,
  };
};

export default useDashboardDetail;
