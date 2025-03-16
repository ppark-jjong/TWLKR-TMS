// src/hooks/useModal.js
import { useState, useCallback } from 'react';

/**
 * 모달 상태 관리를 위한 커스텀 훅
 * @param {Object} options - 옵션 객체
 * @param {boolean} options.initialVisible - 초기 가시성 상태
 * @param {Object} options.initialData - 초기 데이터
 * @param {Function} options.onClose - 모달 닫기 시 콜백
 * @param {Function} options.afterClose - 모달 완전히 닫힌 후 콜백
 * @returns {Object} 모달 관련 상태 및 함수
 */
export const useModal = (options = {}) => {
  const {
    initialVisible = false,
    initialData = null,
    onClose,
    afterClose,
  } = options;

  const [visible, setVisible] = useState(initialVisible);
  const [modalData, setModalData] = useState(initialData);

  // 모달 열기
  const openModal = useCallback((data = null) => {
    setModalData(data);
    setVisible(true);
  }, []);

  // 모달 닫기
  const closeModal = useCallback(() => {
    if (onClose) {
      onClose();
    }
    setVisible(false);
  }, [onClose]);

  // 모달이 완전히 닫힌 후
  const handleAfterClose = useCallback(() => {
    if (afterClose) {
      afterClose();
    }
    setModalData(null);
  }, [afterClose]);

  return {
    visible,
    modalData,
    openModal,
    closeModal,
    setModalData,
    afterClose: handleAfterClose,
  };
};

export default useModal;
