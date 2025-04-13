import apiClient from "./Client";

/**
 * 인수인계/공지사항 목록 조회 API
 * @param {Object} params - 조회 파라미터
 * @param {string} params.type - 조회 타입 (notice/normal)
 * @param {number} params.page - 페이지 번호
 * @param {number} params.limit - 페이지 사이즈
 * @returns {Promise<Object>} - 인수인계/공지사항 목록 응답 데이터
 */
export const getHandoverList = async (params) => {
  return await apiClient.get("/handover/list", { params });
};

/**
 * 인수인계/공지사항 상세 조회 API
 * @param {number} id - 인수인계 ID
 * @returns {Promise<Object>} - 인수인계/공지사항 상세 응답 데이터
 */
export const getHandoverDetail = async (id) => {
  return await apiClient.get(`/handover/${id}`);
};

/**
 * 인수인계/공지사항 생성 API
 * @param {Object} data - 인수인계/공지사항 생성 데이터
 * @param {string} data.title - 제목
 * @param {string} data.content - 내용
 * @param {boolean} data.is_notice - 공지 여부
 * @returns {Promise<Object>} - 인수인계/공지사항 생성 응답 데이터
 */
export const createHandover = async (data) => {
  return await apiClient.post("/handover", data);
};

/**
 * 인수인계/공지사항 수정 API
 * @param {number} id - 인수인계 ID
 * @param {Object} data - 인수인계/공지사항 수정 데이터
 * @param {string} data.title - 제목
 * @param {string} data.content - 내용
 * @param {boolean} data.is_notice - 공지 여부
 * @returns {Promise<Object>} - 인수인계/공지사항 수정 응답 데이터
 */
export const updateHandover = async (id, data) => {
  return await apiClient.patch(`/handover/${id}`, data);
};

/**
 * 인수인계/공지사항 삭제 API
 * @param {number} id - 인수인계 ID
 * @returns {Promise<Object>} - 인수인계/공지사항 삭제 응답 데이터
 */
export const deleteHandover = async (id) => {
  return await apiClient.delete(`/handover/${id}`);
};
