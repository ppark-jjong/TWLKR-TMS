/**
 * 공통 유틸리티 함수 모음
 * 모든 페이지에서 재사용 가능한 헬퍼 함수들을 제공합니다.
 */
const Utils = {
    /**
     * 우편번호 포맷팅 (4자리 -> 5자리)
     * @param {string} code - 입력된 우편번호
     * @returns {string} - 포맷팅된 우편번호
     */
    formatPostalCode: function(code) {
        if (!code) return '';
        
        // 숫자만 추출
        const numericValue = code.replace(/[^\d]/g, '');
        
        // 4자리인 경우 앞에 0 추가
        if (numericValue.length === 4) {
            return '0' + numericValue;
        }
        
        return numericValue;
    },
    
    /**
     * 날짜 형식 변환 (YYYY-MM-DD HH:MM)
     * @param {string|Date} dateString - 변환할 날짜 문자열 또는 Date 객체
     * @returns {string} - 포맷팅된 날짜 문자열
     */
    formatDate: function(dateString) {
        if (!dateString) return '';
        
        const date = dateString instanceof Date ? dateString : new Date(dateString);
        
        // 유효한 날짜가 아니면 원래 값 반환
        if (isNaN(date.getTime())) return dateString;
        
        // YYYY-MM-DD HH:MM 포맷으로 변환
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    
    /**
     * 알림 메시지 표시 관련 유틸리티
     */
    alerts: {
        /**
         * 성공 메시지 표시
         * @param {string} message - 표시할 메시지
         * @param {number} duration - 표시 지속 시간 (밀리초)
         */
        showSuccess: function(message, duration = 3000) {
            Utils.alerts._showAlert(message, 'success', duration);
        },
        
        /**
         * 오류 메시지 표시
         * @param {string} message - 표시할 메시지
         * @param {number} duration - 표시 지속 시간 (0이면 수동으로 닫을 때까지 유지)
         */
        showError: function(message, duration = 0) {
            Utils.alerts._showAlert(message, 'error', duration);
        },
        
        /**
         * 경고 메시지 표시
         * @param {string} message - 표시할 메시지
         * @param {number} duration - 표시 지속 시간 (밀리초)
         */
        showWarning: function(message, duration = 5000) {
            Utils.alerts._showAlert(message, 'warning', duration);
        },
        
        /**
         * 정보 메시지 표시
         * @param {string} message - 표시할 메시지
         * @param {number} duration - 표시 지속 시간 (밀리초)
         */
        showInfo: function(message, duration = 3000) {
            Utils.alerts._showAlert(message, 'info', duration);
        },
        
        /**
         * 알림 메시지 내부 구현
         * @private
         */
        _showAlert: function(message, type, duration) {
            // 기존 알림이 있으면 제거
            const existingAlert = document.querySelector('.alert');
            if (existingAlert) {
                existingAlert.remove();
            }
            
            // 알림 요소 생성
            const alert = document.createElement('div');
            alert.className = `alert alert-${type}`;
            
            // 아이콘 선택
            let icon = 'info-circle';
            switch (type) {
                case 'success': icon = 'check-circle'; break;
                case 'error': icon = 'exclamation-circle'; break;
                case 'warning': icon = 'exclamation-triangle'; break;
            }
            
            // 내용 설정
            alert.innerHTML = `<i class="fa-solid fa-${icon}"></i><span>${message}</span>`;
            
            // 닫기 버튼 추가 (오류 메시지 또는 duration이 0인 경우에만)
            if (type === 'error' || duration === 0) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'close-btn';
                closeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
                closeBtn.addEventListener('click', function() {
                    alert.remove();
                });
                alert.appendChild(closeBtn);
            }
            
            // 알림 추가
            document.body.appendChild(alert);
            
            // 자동 제거 타이머 설정 (duration이 0보다 큰 경우에만)
            if (duration > 0) {
                setTimeout(() => {
                    if (alert && alert.parentNode) {
                        alert.remove();
                    }
                }, duration);
            }
        }
    },
    
    /**
     * 폼 관련 공통 기능
     */
    forms: {
        /**
         * 폼 비활성화/활성화
         * @param {HTMLFormElement} form - 대상 폼 요소
         * @param {boolean} disabled - 비활성화 여부
         * @param {string} loadingText - 로딩 중 표시할 텍스트 (optional)
         * @param {string} originalText - 원래 버튼 텍스트 (optional)
         */
        disable: function(form, disabled, loadingText, originalText) {
            if (!form) return;
            
            // 폼 내 모든 입력 요소 찾기
            const inputs = form.querySelectorAll('input, select, textarea, button');
            
            // 비활성화 상태 설정
            inputs.forEach(input => {
                input.disabled = disabled;
            });
            
            // 제출 버튼 업데이트 (제공된 경우)
            if (loadingText && originalText) {
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    if (disabled) {
                        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${loadingText}`;
                    } else {
                        submitBtn.innerHTML = originalText;
                    }
                }
            }
        },
        
        /**
         * 필수 입력 필드 검증
         * @param {HTMLFormElement} form - 검증할 폼
         * @returns {boolean} - 모든 필수 필드가 입력되었는지 여부
         */
        validateRequired: function(form) {
            if (!form) return false;
            
            // required 속성이 있는 모든 필드 검색
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;
            
            // 각 필수 필드 검증
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    // 오류 스타일 적용
                    field.classList.add('input-error');
                    
                    // 오류 메시지 표시 (필드 아래)
                    const fieldName = field.getAttribute('data-name') || field.name;
                    const errorSpan = document.createElement('span');
                    errorSpan.className = 'error-message';
                    errorSpan.textContent = `${fieldName}을(를) 입력해주세요.`;
                    
                    // 기존 오류 메시지 제거
                    const existingError = field.parentNode.querySelector('.error-message');
                    if (existingError) {
                        existingError.remove();
                    }
                    
                    // 새 오류 메시지 추가
                    field.parentNode.appendChild(errorSpan);
                    
                    // 입력 시 오류 스타일 제거
                    field.addEventListener('input', function() {
                        if (field.value.trim()) {
                            field.classList.remove('input-error');
                            const error = field.parentNode.querySelector('.error-message');
                            if (error) error.remove();
                        }
                    }, { once: true });
                }
            });
            
            return isValid;
        }
    },
    
    /**
     * API 요청 관련 공통 기능
     */
    api: {
        /**
         * GET 요청 수행
         * @param {string} url - 요청 URL
         * @param {Object} options - 추가 옵션
         * @returns {Promise<Object>} - 응답 데이터
         */
        get: async function(url, options = {}) {
            return Utils.api._request(url, { 
                method: 'GET', 
                ...options 
            });
        },
        
        /**
         * POST 요청 수행 (JSON 데이터)
         * @param {string} url - 요청 URL
         * @param {Object} data - 전송할 데이터
         * @param {Object} options - 추가 옵션
         * @returns {Promise<Object>} - 응답 데이터
         */
        post: async function(url, data, options = {}) {
            return Utils.api._request(url, { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                },
                body: JSON.stringify(data),
                ...options
            });
        },
        
        /**
         * 내부 요청 처리 함수
         * @private
         */
        _request: async function(url, options = {}) {
            try {
                const response = await fetch(url, {
                    ...options,
                    credentials: 'include'
                });
                
                // 세션 만료 체크 (401 상태 코드)
                if (response.status === 401) {
                    Utils.api._handleSessionExpired();
                    return null;
                }
                
                // 기타 오류 상태 처리
                if (!response.ok) {
                    return Utils.api._handleErrorResponse(response);
                }
                
                // 성공 응답 처리
                return await response.json();
            } catch (error) {
                Utils.alerts.showError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
                console.error('API 요청 오류:', error);
                return null;
            }
        },
        
        /**
         * 세션 만료 처리
         * @private
         */
        _handleSessionExpired: function() {
            Utils.alerts.showError('세션이 만료되었습니다. 다시 로그인해주세요.');
            
            // 현재 URL을 저장하여 로그인 후 돌아올 수 있도록 함
            const returnUrl = encodeURIComponent(window.location.pathname);
            
            // 잠시 후 로그인 페이지로 리다이렉트
            setTimeout(() => {
                window.location.href = `/login?return_to=${returnUrl}`;
            }, 1500);
        },
        
        /**
         * 오류 응답 처리
         * @private
         */
        _handleErrorResponse: async function(response) {
            let errorMessage = '요청 처리 중 오류가 발생했습니다.';
            
            try {
                const errorData = await response.json();
                if (errorData && errorData.message) {
                    errorMessage = errorData.message;
                }
                
                Utils.alerts.showError(errorMessage);
                return errorData;
            } catch (parseError) {
                Utils.alerts.showError(errorMessage);
                console.error('오류 응답 파싱 실패:', parseError);
                return null;
            }
        }
    },
    
    /**
     * 인증 및 사용자 관련 공통 기능
     */
    auth: {
        /**
         * 현재 로그인한 사용자 정보 반환
         * (세션에서 window._currentUser를 통해 전달됨)
         * @returns {Object|null} - 사용자 정보 또는 null
         */
        getCurrentUser: function() {
            // 서버에서 렌더링 시 window._currentUser에 사용자 정보를 초기화해야 함
            return window._currentUser || null;
        },
        
        /**
         * 현재 사용자가 관리자인지 확인
         * @returns {boolean} - 관리자 여부
         */
        isAdmin: function() {
            const user = Utils.auth.getCurrentUser();
            return user && user.user_role === 'ADMIN';
        },
        
        /**
         * 현재 사용자가 특정 리소스의 소유자인지 확인
         * @param {string} resourceOwner - 리소스 소유자 ID
         * @returns {boolean} - 소유자 여부
         */
        isOwner: function(resourceOwner) {
            const user = Utils.auth.getCurrentUser();
            return user && user.user_id === resourceOwner;
        }
    }
};

// 글로벌 스코프에 Utils 공개
window.Utils = Utils;