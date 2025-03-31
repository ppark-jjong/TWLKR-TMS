/**
 * 대시보드 데이터 필터링 유틸리티
 * @param {Array} data - 원본 데이터 배열
 * @param {Object} filters - 필터 조건
 * @returns {Array} 필터링된 데이터 배열
 */
export const filterData = (data, filters) => {
  const { search_term, status, department, warehouse } = filters;

  return data.filter((item) => {
    // 검색어 필터링
    if (search_term) {
      const searchLower = search_term.toLowerCase();
      const searchableFields = [
        item.order_no,
        item.driver_name,
        item.driver_contact,
        item.recipient_name,
        item.recipient_address,
      ].filter(Boolean);

      const matchesSearch = searchableFields.some((field) =>
        field?.toLowerCase?.()?.includes?.(searchLower)
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
};

/**
 * 중복 없는 필터 옵션 목록 생성
 * @param {Array} data - 원본 데이터 배열
 * @param {String} field - 필터 필드명
 * @returns {Array} 고유한 옵션 목록
 */
export const getUniqueFilterOptions = (data, field) => {
  if (!data || !Array.isArray(data) || data.length === 0) return [];

  const options = new Set();

  data.forEach((item) => {
    if (item[field]) {
      options.add(item[field]);
    }
  });

  return Array.from(options).sort();
};
