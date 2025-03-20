// src/hooks/useLock.js
import { useState, useEffect, useCallback, useRef } from 'react';
import message from '../utils/message';
import LockService from '../services/LockService';
import { MessageKeys } from '../utils/message';
import { useLogger } from '../utils/LogUtils';

/**
 * 비관적 락 관리를 위한 커스텀 훅
 * 백엔드 API의 비관적 락 메커니즘을 React 훅으로 래핑
 *
 * @param {Object} options - 옵션 객체
 * @param {string|number} options.dashboardId - 대시보드 ID
 * @param {string} options.lockType - 락 타입 (EDIT, STATUS, ASSIGN, REMARK)
 * @param {boolean} options.autoAcquire - 자동 락 획득 여부
 * @param {boolean} options.autoRelease - 컴포넌트 언마운트 시 자동 락 해제 여부
 * @param {Function} options.onLockSuccess - 락 획득 성공 시 콜백
 * @param {Function} options.onLockError - 락 획득 실패 시 콜백
 * @param {string} options.messageKey - 메시지 표시용 키
 * @returns {Object} - 락 관련 상태 및 함수들
 */
const useLock = (options = {}) => {
  const {
    dashboardId,
    lockType = 'EDIT',
    autoAcquire = false,
    autoRelease = true,
    onLockSuccess,
    onLockError,
    messageKey = MessageKeys.DASHBOARD.LOCK_ACQUIRE,
    renewInterval = 2 * 60 * 1000, // 기본 2분마다 갱신
    maxRetries = 3, // 최대 재시도 횟수
    retryDelay = 2000, // 재시도 간격 (ms)
  } = options;

  // 상태 관리
  const [hasLock, setHasLock] = useState(false);
  const [lockInfo, setLockInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 로거 초기화
  const logger = useLogger('useLock');

  // 락 타임아웃 추적을 위한 ref
  const lockTimeoutRef = useRef(null);
  const renewIntervalRef = useRef(null);
  const retryCountRef = useRef(0);
  const lastActionTimeRef = useRef(Date.now());
  const isMountedRef = useRef(true);
  const warningShownRef = useRef(false);

  /**
   * 락 획득 함수
   * @param {number} retryCount - 현재 재시도 횟수
   * @returns {Promise<boolean>} - 락 획득 성공 여부
   */
  const acquireLock = useCallback(
    async (retryCount = 0) => {
      if (!dashboardId) {
        logger.warn('락 획득 실패: 대시보드 ID가 없습니다.');
        return false;
      }

      try {
        setLoading(true);
        setError(null);
        message.loading('편집 모드 진입 중...', messageKey);

        logger.debug(
          `락 획득 시도: ID=${dashboardId}, 타입=${lockType}, 시도=${
            retryCount + 1
          }/${maxRetries}`
        );

        const lockResult = await LockService.acquireLock(dashboardId, lockType);

        if (!isMountedRef.current) return false;

        // 락 정보 설정
        setLockInfo(lockResult);
        setHasLock(true);
        lastActionTimeRef.current = Date.now();
        retryCountRef.current = 0; // 재시도 카운터 초기화
        warningShownRef.current = false; // 경고 플래그 초기화

        // 만료 시간 계산 (기본 5분)
        const expiresInMs = (lockResult.expires_in_seconds || 300) * 1000;
        const expiryTime = Date.now() + expiresInMs;

        // 만료 1분 전 경고 타이머 설정
        if (lockTimeoutRef.current) {
          clearTimeout(lockTimeoutRef.current);
        }

        lockTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && hasLock && !warningShownRef.current) {
            message.warning(
              '편집 시간이 1분 남았습니다. 작업을 완료하거나 연장하세요.'
            );
            warningShownRef.current = true;
          }
        }, expiresInMs - 60000); // 1분 전

        // 자동 갱신 타이머 설정
        setupRenewInterval();

        // 성공 메시지
        message.loadingToSuccess('편집 모드가 활성화되었습니다', messageKey);

        // 성공 콜백 호출
        if (onLockSuccess) {
          onLockSuccess(lockResult);
        }

        logger.info(
          `락 획득 성공: ID=${dashboardId}, 타입=${lockType}, 만료=${new Date(
            expiryTime
          ).toLocaleTimeString()}`
        );
        return true;
      } catch (error) {
        if (!isMountedRef.current) return false;

        logger.error(`락 획득 실패: ID=${dashboardId}`, error);
        setError(error);

        // 이미 락이 걸려있는 경우 (423 Locked)
        if (error.response?.status === 423) {
          const errorData = error.response.data;
          const detail = errorData?.error?.detail || errorData?.detail || {};
          const lockedBy = detail.locked_by || '다른 사용자';
          const lockType = detail.lock_type || '';

          const lockTypeText = getLockTypeText(lockType);
          const errorMessage = `현재 ${lockedBy}님이 이 데이터를 ${lockTypeText} 중입니다. 잠시 후 다시 시도해주세요.`;

          message.loadingToError(errorMessage, messageKey);
        } else {
          message.loadingToError('편집 모드 활성화에 실패했습니다', messageKey);
        }

        // 재시도 로직
        if (retryCount < maxRetries - 1) {
          logger.info(
            `락 획득 재시도 예정: ${retryDelay}ms 후 시도 ${
              retryCount + 2
            }/${maxRetries}`
          );

          // 재시도 간격 후 다시 시도
          setTimeout(() => {
            if (isMountedRef.current) {
              acquireLock(retryCount + 1);
            }
          }, retryDelay);

          return false;
        }

        // 최대 재시도 횟수 초과
        if (retryCount >= maxRetries - 1) {
          logger.warn(`최대 재시도 횟수(${maxRetries}) 초과`);
        }

        // 실패 콜백 호출
        if (onLockError) {
          onLockError(error);
        }

        return false;
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [
      dashboardId,
      lockType,
      messageKey,
      maxRetries,
      retryDelay,
      onLockSuccess,
      onLockError,
      hasLock,
      logger,
    ]
  );

  /**
   * 자동 갱신 인터벌 설정
   */
  const setupRenewInterval = useCallback(() => {
    if (renewIntervalRef.current) {
      clearInterval(renewIntervalRef.current);
    }

    // 주기적 락 갱신 인터벌 설정
    renewIntervalRef.current = setInterval(() => {
      if (hasLock) {
        // 마지막 활동으로부터 4분 이상 경과하지 않았으면 갱신
        const inactiveTime = Date.now() - lastActionTimeRef.current;
        const MAX_INACTIVE_TIME = 4 * 60 * 1000; // 4분

        if (inactiveTime < MAX_INACTIVE_TIME) {
          renewLock().catch((error) => {
            logger.error('자동 락 갱신 실패:', error);
          });
        } else {
          logger.info(
            `사용자 비활성 감지(${Math.round(
              inactiveTime / 1000
            )}초), 락 갱신 건너뜀`
          );
        }
      }
    }, renewInterval);

    logger.debug(`락 갱신 인터벌 설정: ${renewInterval}ms`);
  }, [hasLock, renewInterval, logger]);

  /**
   * 락 해제 함수
   * @returns {Promise<boolean>} - 락 해제 성공 여부
   */
  const releaseLock = useCallback(async () => {
    if (!dashboardId || !hasLock) return true;

    try {
      logger.info(`락 해제 요청: ID=${dashboardId}`);
      await LockService.releaseLock(dashboardId);

      if (!isMountedRef.current) return true;

      // 타이머 정리
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
        lockTimeoutRef.current = null;
      }

      // 갱신 인터벌 정리
      if (renewIntervalRef.current) {
        clearInterval(renewIntervalRef.current);
        renewIntervalRef.current = null;
      }

      // 상태 정리
      setHasLock(false);
      setLockInfo(null);
      warningShownRef.current = false;

      logger.debug('락 해제 성공');
      return true;
    } catch (error) {
      logger.error('락 해제 실패:', error);

      // 실패해도 클라이언트 측에서는 락 해제 처리
      if (isMountedRef.current) {
        setHasLock(false);
        setLockInfo(null);
      }

      return false;
    }
  }, [dashboardId, hasLock, logger]);

  /**
   * 락 갱신 함수
   * @returns {Promise<boolean>} - 락 갱신 성공 여부
   */
  const renewLock = useCallback(async () => {
    if (!dashboardId || !hasLock) return false;

    try {
      logger.debug(`락 갱신 시도: ID=${dashboardId}`);
      const refreshedLock = await LockService.renewLock(dashboardId);

      if (!isMountedRef.current) return false;

      // 락 정보 업데이트
      setLockInfo(refreshedLock);
      lastActionTimeRef.current = Date.now();
      warningShownRef.current = false; // 경고 플래그 초기화

      // 타이머 재설정
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }

      const expiresInMs = (refreshedLock.expires_in_seconds || 300) * 1000;
      const expiryTime = Date.now() + expiresInMs;

      lockTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && hasLock && !warningShownRef.current) {
          message.warning(
            '편집 시간이 1분 남았습니다. 작업을 완료하거나 연장하세요.'
          );
          warningShownRef.current = true;
        }
      }, expiresInMs - 60000); // 1분 전

      logger.debug(
        `락 갱신 성공: 만료=${new Date(expiryTime).toLocaleTimeString()}`
      );
      return true;
    } catch (error) {
      logger.error('락 갱신 실패:', error);

      // 갱신 실패 시 재획득 시도
      if (isMountedRef.current) {
        if (error.response?.status === 404 || error.response?.status === 410) {
          logger.warn('락이 더 이상 존재하지 않음, 재획득 시도');
          setHasLock(false);
          setLockInfo(null);

          // 존재하지 않는 락이면 재획득 시도
          return await acquireLock();
        }
      }

      return false;
    }
  }, [dashboardId, hasLock, acquireLock, logger]);

  /**
   * 락 상태 확인 함수
   * @returns {Promise<Object|null>} - 락 상태 정보 또는 null
   */
  const checkLockStatus = useCallback(async () => {
    if (!dashboardId) return null;

    try {
      const status = await LockService.checkLockStatus(dashboardId);

      if (!isMountedRef.current) return null;

      // 내가 가진 락이 아닌 경우 상태 업데이트
      if (status.is_locked) {
        if (hasLock && status.locked_by !== lockInfo?.locked_by) {
          logger.warn(
            `락 소유자 변경 감지: ${lockInfo?.locked_by} -> ${status.locked_by}`
          );
          setHasLock(false);
          setLockInfo(null);

          if (lockTimeoutRef.current) {
            clearTimeout(lockTimeoutRef.current);
            lockTimeoutRef.current = null;
          }

          if (renewIntervalRef.current) {
            clearInterval(renewIntervalRef.current);
            renewIntervalRef.current = null;
          }
        } else if (!hasLock) {
          // 현재 락이 없는데 다른 사용자가 락을 가지고 있는 경우
          setLockInfo(status);
        }
      } else if (hasLock) {
        // 서버에 락이 없는데 클라이언트가 락을 가지고 있다고 생각하는 경우 (락 해제된 상황)
        logger.warn(
          '서버에 락이 없지만 클라이언트는 락을 가지고 있다고 생각함, 상태 동기화'
        );
        setHasLock(false);
        setLockInfo(null);

        if (lockTimeoutRef.current) {
          clearTimeout(lockTimeoutRef.current);
          lockTimeoutRef.current = null;
        }

        if (renewIntervalRef.current) {
          clearInterval(renewIntervalRef.current);
          renewIntervalRef.current = null;
        }
      }

      return status;
    } catch (error) {
      logger.error('락 상태 확인 실패:', error);
      return null;
    }
  }, [dashboardId, hasLock, lockInfo, logger]);

  /**
   * 사용자 활동 기록 함수
   */
  const recordUserActivity = useCallback(() => {
    lastActionTimeRef.current = Date.now();
  }, []);

  /**
   * 강제 락 연장 함수 (수동 갱신)
   * @returns {Promise<boolean>} - 갱신 성공 여부
   */
  const extendLock = useCallback(async () => {
    if (!hasLock || !dashboardId) {
      logger.warn('연장할 락이 없습니다.');
      return false;
    }

    try {
      message.loading('편집 시간 연장 중...', `${messageKey}-extend`);
      const result = await renewLock();

      if (result) {
        message.loadingToSuccess(
          '편집 시간이 연장되었습니다',
          `${messageKey}-extend`
        );
        return true;
      } else {
        message.loadingToError(
          '편집 시간 연장에 실패했습니다',
          `${messageKey}-extend`
        );
        return false;
      }
    } catch (error) {
      logger.error('편집 시간 연장 실패:', error);
      message.loadingToError(
        '편집 시간 연장에 실패했습니다',
        `${messageKey}-extend`
      );
      return false;
    }
  }, [dashboardId, hasLock, messageKey, renewLock, logger]);

  /**
   * 락 타입에 따른 표시 텍스트 반환
   * @param {string} type - 락 타입
   * @returns {string} - 표시 텍스트
   */
  const getLockTypeText = useCallback((type) => {
    switch (type) {
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

  // 자동 락 획득 (컴포넌트 마운트 시)
  useEffect(() => {
    if (autoAcquire && dashboardId && !hasLock && !loading) {
      acquireLock();
    }
  }, [autoAcquire, dashboardId, hasLock, loading, acquireLock]);

  // 사용자 활동 모니터링
  useEffect(() => {
    if (hasLock) {
      // 사용자 활동 이벤트 리스너
      const handleUserActivity = () => {
        recordUserActivity();
      };

      // 이벤트 리스너 등록
      window.addEventListener('mousemove', handleUserActivity);
      window.addEventListener('keydown', handleUserActivity);
      window.addEventListener('click', handleUserActivity);

      return () => {
        // 이벤트 리스너 정리
        window.removeEventListener('mousemove', handleUserActivity);
        window.removeEventListener('keydown', handleUserActivity);
        window.removeEventListener('click', handleUserActivity);
      };
    }
  }, [hasLock, recordUserActivity]);

  // 컴포넌트 마운트/언마운트 핸들링
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // 타이머 정리
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
        lockTimeoutRef.current = null;
      }

      // 갱신 인터벌 정리
      if (renewIntervalRef.current) {
        clearInterval(renewIntervalRef.current);
        renewIntervalRef.current = null;
      }

      // 자동 락 해제
      if (autoRelease && hasLock) {
        releaseLock().catch((err) => {
          console.error('[useLock] 언마운트 시 락 해제 실패:', err);
        });
      }
    };
  }, [autoRelease, hasLock, releaseLock]);

  // 반환할 객체
  return {
    hasLock, // 락 보유 여부
    lockInfo, // 락 정보 객체
    loading, // 로딩 상태
    error, // 에러 정보
    acquireLock, // 락 획득 함수
    releaseLock, // 락 해제 함수
    renewLock, // 락 갱신 함수
    checkLockStatus, // 락 상태 확인 함수
    recordUserActivity, // 사용자 활동 기록 함수
    extendLock, // 강제 락 연장 함수
    getLockTypeText, // 락 타입 텍스트 변환 함수
  };
};

export default useLock;
