import PropTypes from 'prop-types';

/**
 * 대시보드 항목 타입 정의 - 백엔드 응답 구조와 정확히 일치
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
 * 사용자 정보 타입 정의 - 백엔드 응답 구조와 정확히 일치
 */
export const UserType = PropTypes.shape({
  user_id: PropTypes.string.isRequired,
  user_name: PropTypes.string,
  user_department: PropTypes.string,
  user_role: PropTypes.oneOf(['ADMIN', 'USER']).isRequired,
});

/**
 * 페이지네이션 타입 정의 - 백엔드 응답 구조와 정확히 일치
 */
export const PaginationType = PropTypes.shape({
  current: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  total: PropTypes.number,
});

/**
 * 락 정보 타입 정의 - 백엔드 응답 구조와 정확히 일치
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
 * API 응답 데이터 구조 정의
 */
export const ApiResponseType = PropTypes.shape({
  success: PropTypes.bool.isRequired,
  message: PropTypes.string,
  data: PropTypes.any,
  meta: PropTypes.object,
});
