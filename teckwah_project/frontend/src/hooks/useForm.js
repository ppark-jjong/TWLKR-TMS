// src/hooks/useForm.js
import { useState, useCallback } from 'react';
import { Form } from 'antd';
import useAsync from './useAsync';
import ErrorHandler from '../utils/ErrorHandler';

/**
 * Ant Design Form과 통합된 폼 처리 커스텀 훅
 * @param {Object} options - 옵션 객체
 * @param {Function} options.onSubmit - 폼 제출 시 실행할 함수
 * @param {Function} options.validate - 추가 유효성 검증 함수
 * @param {Object} options.initialValues - 초기 폼 값
 * @param {string} options.messageKey - 메시지 서비스 키
 * @param {string} options.loadingMessage - 로딩 중 메시지
 * @param {string} options.successMessage - 성공 시 메시지
 * @param {string} options.errorMessage - 에러 시 메시지
 * @param {Function} options.onSuccess - 성공 시 콜백
 * @param {Function} options.onError - 에러 시 콜백
 * @returns {Object} 폼 관련 상태 및 함수
 */
export const useForm = (options = {}) => {
  const {
    onSubmit,
    validate,
    initialValues,
    messageKey,
    loadingMessage = '처리 중...',
    successMessage = '처리가 완료되었습니다',
    errorMessage = '처리 중 오류가 발생했습니다',
    onSuccess,
    onError,
    preventMultiple = true,
    form: externalForm,
  } = options;

  // 외부에서 Form 인스턴스를 주입받거나 내부에서 생성
  const [form] = externalForm ? [externalForm] : Form.useForm();
  const [formError, setFormError] = useState(null);

  // 폼 제출 처리 함수
  const handleSubmit = useCallback(
    async (values) => {
      if (!onSubmit) return null;

      // 추가 유효성 검증
      if (validate) {
        const errors = validate(values);
        if (errors && Object.keys(errors).length > 0) {
          // 폼 필드 에러 설정
          ErrorHandler.setFormErrors(form, errors);
          setFormError('입력 정보를 확인해주세요');
          return null;
        }
      }

      // 폼 에러 초기화
      setFormError(null);

      return await onSubmit(values);
    },
    [form, onSubmit, validate]
  );

  // 비동기 처리를 위한 useAsync 훅 사용
  const { loading, error, data, execute } = useAsync(handleSubmit, {
    messageKey,
    loadingMessage,
    successMessage,
    errorMessage,
    onSuccess: (result) => {
      if (onSuccess) {
        onSuccess(result);
      }
    },
    onError: (err) => {
      // 폼 에러 처리
      if (
        ErrorHandler.isValidationError &&
        ErrorHandler.isValidationError(err)
      ) {
        ErrorHandler.setFormErrors(form, err.response?.data?.detail);
      }

      setFormError(
        err.response?.data?.detail ||
          err.message ||
          '처리 중 오류가 발생했습니다'
      );

      if (onError) {
        onError(err);
      }
    },
    preventMultiple,
  });

  // 폼 제출 함수
  const submitForm = useCallback(async () => {
    try {
      const values = await form.validateFields();
      return await execute(values);
    } catch (err) {
      // Ant Design 폼 유효성 검증 실패
      setFormError('입력 정보를 확인해주세요');
      return null;
    }
  }, [form, execute]);

  // 폼 초기화
  const resetForm = useCallback(() => {
    form.resetFields();
    setFormError(null);
  }, [form]);

  // 폼 값 설정
  const setFormValues = useCallback(
    (values) => {
      form.setFieldsValue(values);
    },
    [form]
  );

  // 초기값 설정 (외부에서 변경될 수 있음)
  const setInitialValues = useCallback(
    (values) => {
      form.setFieldsValue(values);
    },
    [form]
  );

  return {
    form,
    loading,
    error: error || formError,
    data,
    submitForm,
    resetForm,
    setFormValues,
    setFormError,
    setInitialValues,
  };
};

export default useForm;
