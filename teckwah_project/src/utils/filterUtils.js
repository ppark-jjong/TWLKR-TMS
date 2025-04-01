/**
 * 대시보드 데이터 필터링 유틸리티
 * @param {Array} data - 원본 데이터 배열
 * @param {Object} filters - 필터 조건
 * @returns {Array} 필터링된 데이터 배열
 */
export const filterData = (data, filters) => {
  // 개발 모드에서 데이터 로깅
  if (process.env.NODE_ENV === 'development') {
    console.group('filterData 함수 호출');
    console.log('입력 데이터:', {
      dataType: typeof data,
      isArray: Array.isArray(data),
      dataLength: Array.isArray(data) ? data.length : 'N/A',
      filters,
    });

    // 데이터 검증 로깅
    if (!data) {
      console.warn('data가 undefined/null입니다');
    } else if (!Array.isArray(data)) {
      console.warn('data가 배열이 아닙니다:', data);
    }

    // 필터 검증 로깅
    if (!filters) {
      console.warn('filters가 undefined/null입니다');
    }
    console.groupEnd();
  }

  // 데이터가 배열이 아니면 빈 배열 반환
  if (!data || !Array.isArray(data)) return [];

  // filters가 없는 경우 원본 데이터 반환
  if (!filters) return [...data];

  const { search_term, status, department, warehouse } = filters;

  try {
    // 필터링 시작 전 타이머 시작 (성능 모니터링)
    const startTime = performance.now();

    const result = data.filter((item) => {
      // item이 null 또는 undefined인 경우 제외
      if (!item) return false;

      // 검색어 필터링
      if (
        search_term &&
        typeof search_term === 'string' &&
        search_term.trim() !== ''
      ) {
        const searchLower = search_term.toLowerCase();

        // 안전하게 각 필드 접근 및 문자열 확인
        const order_no = typeof item.order_no === 'string' ? item.order_no : '';
        const driver_name =
          typeof item.driver_name === 'string' ? item.driver_name : '';
        const driver_contact =
          typeof item.driver_contact === 'string' ? item.driver_contact : '';
        const recipient_name =
          typeof item.recipient_name === 'string' ? item.recipient_name : '';
        const recipient_address =
          typeof item.recipient_address === 'string'
            ? item.recipient_address
            : '';

        // 빈 문자열이 아닌 필드만 포함
        const searchableFields = [
          order_no,
          driver_name,
          driver_contact,
          recipient_name,
          recipient_address,
        ].filter((field) => field !== '');

        // 검색할 필드가 없으면 검색 조건 충족하지 않음
        if (!searchableFields || searchableFields.length === 0) return false;

        // 어떤 필드라도 검색어를 포함하면 true
        const matchesSearch = searchableFields.some((field) =>
          field.toLowerCase().includes(searchLower)
        );

        if (!matchesSearch) return false;
      }

      // 상태 필터링
      if (status && item.status !== status) return false;

      // 부서 필터링
      if (department && item.department !== department) return false;

      // 창고 필터링
      if (warehouse && item.warehouse !== warehouse) return false;

      return true;
    });

    // 필터링 완료 후 타이머 종료 (성능 모니터링)
    const endTime = performance.now();

    // 개발 모드에서만 성능 정보 로깅
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `filterData 실행 시간: ${(endTime - startTime).toFixed(
          2
        )}ms, 결과 개수: ${result.length}/${data.length}`
      );
    }

    return result;
  } catch (error) {
    console.error('필터링 중 오류 발생:', error);
    // 개발 모드에서 더 자세한 오류 정보 출력
    if (process.env.NODE_ENV === 'development') {
      console.error('오류 세부 정보:', {
        message: error.message,
        stack: error.stack,
        filters,
        dataInfo: {
          length: Array.isArray(data) ? data.length : 'N/A',
          sample: Array.isArray(data) && data.length > 0 ? data[0] : null,
        },
      });
    }
    return [];
  }
};

/**
 * 중복 없는 필터 옵션 목록 생성
 * @param {Array} data - 원본 데이터 배열
 * @param {String} field - 필터 필드명
 * @returns {Array} 고유한 옵션 목록
 */
export const getUniqueFilterOptions = (data, field) => {
  // 데이터 배열 또는 필드가 유효하지 않으면 빈 배열 반환
  if (!data || !Array.isArray(data) || !field || typeof field !== 'string') {
    return [];
  }

  try {
    const options = new Set();

    data.forEach((item) => {
      // item이 객체이고, field 속성이 존재하고 문자열이나 숫자인 경우만 추가
      if (
        item &&
        typeof item === 'object' &&
        item[field] !== undefined &&
        item[field] !== null &&
        (typeof item[field] === 'string' || typeof item[field] === 'number')
      ) {
        options.add(item[field]);
      }
    });

    // 옵션을 배열로 변환하고 정렬
    return Array.from(options).sort((a, b) => {
      if (typeof a === 'string' && typeof b === 'string') {
        return a.localeCompare(b);
      }
      return String(a).localeCompare(String(b));
    });
  } catch (error) {
    console.error('필터 옵션 생성 중 오류:', error);
    return [];
  }
};
