import PropTypes from "prop-types";

/**
 * 대시보드 항목 타입 정의
 */
export const DashboardItemType = PropTypes.shape({
  dashboard_id: PropTypes.number.isRequired,
  customer_name: PropTypes.string,
  order_id: PropTypes.string,
  item_name: PropTypes.string,
  address: PropTypes.string,
  status: PropTypes.string.isRequired,
  eta: PropTypes.string,
  department: PropTypes.string,
  warehouse: PropTypes.string,
  driver_name: PropTypes.string,
  driver_contact: PropTypes.string,
  created_at: PropTypes.string,
  updated_at: PropTypes.string,
});

/**
 * 사용자 정보 타입 정의
 */
export const UserType = PropTypes.shape({
  user_id: PropTypes.string.isRequired,
  user_name: PropTypes.string,
  user_department: PropTypes.string,
  user_role: PropTypes.oneOf(["ADMIN", "USER"]).isRequired,
});

/**
 * 페이지네이션 타입 정의
 */
export const PaginationType = PropTypes.shape({
  current: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  total: PropTypes.number,
});

/**
 * 락 정보 타입 정의
 */
export const LockInfoType = PropTypes.shape({
  user_id: PropTypes.string.isRequired,
  lock_type: PropTypes.string.isRequired,
  acquired_at: PropTypes.string.isRequired,
  expiry_at: PropTypes.string.isRequired,
});

/**
 * 검색 파라미터 타입 정의
 */
export const SearchParamsType = PropTypes.shape({
  search_term: PropTypes.string,
  status: PropTypes.string,
  department: PropTypes.string,
  warehouse: PropTypes.string,
  date_range: PropTypes.arrayOf(PropTypes.object),
  start_date: PropTypes.string,
  end_date: PropTypes.string,
});

/**
 * API 응답 데이터 형식 정의 (런타임 체크용)
 * @param {any} data - API 응답 데이터
 * @param {string} type - 데이터 타입 ('dashboard', 'user', 'lock' 등)
 * @returns {boolean} 유효한 데이터인지 여부
 */
export const validateApiData = (data, type) => {
  if (!data) return false;

  switch (type) {
    case "dashboard":
      return (
        typeof data.dashboard_id === "number" && typeof data.status === "string"
      );
    case "user":
      return (
        typeof data.user_id === "string" &&
        ["ADMIN", "USER"].includes(data.user_role)
      );
    case "lock":
      return (
        typeof data.user_id === "string" &&
        typeof data.lock_type === "string" &&
        typeof data.acquired_at === "string"
      );
    default:
      return false;
  }
};

/**
 * 오류 객체의 유형을 확인하는 유틸리티 함수
 * @param {Error} error - 오류 객체
 * @returns {string} 오류 유형 ('network', 'auth', 'validation', 'server', 'unknown')
 */
export const getErrorType = (error) => {
  if (!error) return "unknown";

  if (!error.response) return "network";

  const status = error.response.status;

  if (status === 401 || status === 403) return "auth";
  if (status === 400 || status === 422) return "validation";
  if (status >= 500) return "server";

  return "unknown";
};
