/**
 * 락 관리 커스텀 훅
 * - 데이터 락 획득 및 해제 로직 추상화
 * - 재사용 가능한 락 관리 인터페이스 제공
 */
import { useState } from 'react';
import { message } from 'antd';
import logger from '../utils/logger';

const useLock = (service, resourceName = '항목') => {
  const [isLocked, setIsLocked] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [lockInfo, setLockInfo] = useState(null);
  
  /**
   * 락 획득 시도
   * @param {number|string} resourceId - 락을 획득할 리소스 ID
   * @param {Function} onSuccess - 락 획득 성공 시 콜백
   * @returns {boolean} 락 획득 성공 여부
   */
  const acquireLock = async (resourceId, onSuccess) => {
    if (!resourceId) {
      logger.warn('자원 ID가 없어 락 획득 실패');
      return false;
    }
    
    setIsLocking(true);
    
    try {
      logger.lock(`${resourceName} 락 획득 시도: ID=${resourceId}`);
      
      // 서비스의 락 획득 함수 호출 (lockXXX)
      const lockMethodName = Object.keys(service).find(key => 
        key.startsWith('lock') && typeof service[key] === 'function'
      );
      
      if (!lockMethodName) {
        logger.error(`서비스에 락 획득 메서드가 없습니다: ${Object.keys(service).join(', ')}`);
        message.error('락 기능을 사용할 수 없습니다');
        return false;
      }
      
      // 락 획득 호출
      const response = await service[lockMethodName](resourceId);
      
      // 락 획득 결과 처리
      if (response.success && response.lockStatus?.editable) {
        logger.lock(`${resourceName} 락 획득 성공: ID=${resourceId}`);
        setIsLocked(true);
        setLockInfo(response.lockStatus);
        
        // 성공 콜백 호출
        if (onSuccess && typeof onSuccess === 'function') {
          onSuccess();
        }
        
        return true;
      } else {
        // 락 획득 실패 시 메시지 표시
        const errorMsg = response.message || 
          `현재 다른 사용자가 편집 중이라 수정할 수 없습니다`;
        
        logger.lock(`${resourceName} 락 획득 실패: ID=${resourceId}, 사유=${errorMsg}`);
        message.error(errorMsg);
        
        return false;
      }
    } catch (error) {
      logger.error(`${resourceName} 락 획득 오류: ID=${resourceId}`, error);
      message.error(`수정 권한 획득 중 오류가 발생했습니다`);
      return false;
    } finally {
      setIsLocking(false);
    }
  };
  
  /**
   * 락 해제
   * @param {number|string} resourceId - 해제할 리소스 ID
   * @param {Function} onSuccess - 락 해제 성공 시 콜백
   */
  const releaseLock = async (resourceId, onSuccess) => {
    if (!resourceId || !isLocked) {
      return false;
    }
    
    try {
      logger.lock(`${resourceName} 락 해제 시도: ID=${resourceId}`);
      
      // 서비스의 락 해제 함수 호출 (unlockXXX)
      const unlockMethodName = Object.keys(service).find(key => 
        key.startsWith('unlock') && typeof service[key] === 'function'
      );
      
      if (!unlockMethodName) {
        logger.error(`서비스에 락 해제 메서드가 없습니다: ${Object.keys(service).join(', ')}`);
        message.error('락 해제 기능을 사용할 수 없습니다');
        return false;
      }
      
      // 락 해제 호출
      const response = await service[unlockMethodName](resourceId);
      
      // 락 해제 결과 처리
      if (response.success) {
        logger.lock(`${resourceName} 락 해제 성공: ID=${resourceId}`);
        setIsLocked(false);
        setLockInfo(null);
        
        // 성공 콜백 호출
        if (onSuccess && typeof onSuccess === 'function') {
          onSuccess();
        }
        
        return true;
      } else {
        logger.lock(`${resourceName} 락 해제 실패: ID=${resourceId}`);
        message.error(response.message || '락 해제 실패');
        return false;
      }
    } catch (error) {
      logger.error(`${resourceName} 락 해제 오류: ID=${resourceId}`, error);
      message.error(`락 해제 중 오류가 발생했습니다`);
      return false;
    }
  };
  
  return {
    isLocked,
    isLocking,
    lockInfo,
    acquireLock,
    releaseLock
  };
};

export default useLock;
