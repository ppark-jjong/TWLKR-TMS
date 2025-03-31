// src/hooks/useDashboardData.js
import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDashboards, safeApiCall } from "../utils/api";
import { message } from "antd";
import { filterData, getUniqueFilterOptions } from "../utils/filterUtils";
import { handleApiError } from "../utils/errorHandlers";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * 현재 날짜에서 7일 전 날짜를 계산하는 함수
 * @returns {string} YYYY-MM-DD 형식의 날짜 문자열
 */
const getOneWeekAgo = () => {
  return dayjs().subtract(7, "day").format("YYYY-MM-DD");
};

/**
 * 현재 날짜를 계산하는 함수
 * @returns {string} YYYY-MM-DD 형식의 날짜 문자열
 */
const getCurrentDate = () => {
  return dayjs().format("YYYY-MM-DD");
};

/**
 * 날짜가 유효한지 확인하는 함수 (미래 날짜 방지)
 * @param {string} dateStr - 검증할 날짜 (YYYY-MM-DD 형식)
 * @returns {string} 유효한 날짜 (미래인 경우 현재 날짜로 변경)
 */
const validateDate = (dateStr) => {
  if (!dateStr) return "";

  try {
    const inputDate = dayjs(dateStr);
    const today = dayjs().startOf("day");

    // 미래 날짜인 경우 현재 날짜로 변환
    if (inputDate.isAfter(today)) {
      return today.format("YYYY-MM-DD");
    }

    return dateStr;
  } catch (error) {
    console.error("날짜 변환 오류:", error);
    return "";
  }
};

/**
 * 대시보드 데이터 관리 훅
 * - 검색 파라미터 관리
 * - 날짜 파라미터 관리
 * - 필터링 관리
 * @param {string} userRole - 사용자 권한
 * @returns {Object} - 데이터 관리 객체
 */
const useDashboardData = (userRole = "USER") => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  // 초기 검색 상태 설정
  const [searchParams, setSearchParams] = useState({
    page: parseInt(queryParams.get("page") || "1", 10),
    size: parseInt(queryParams.get("size") || "10", 10),
    start_date: validateDate(queryParams.get("start_date")) || getOneWeekAgo(),
    end_date: validateDate(queryParams.get("end_date")) || getCurrentDate(),
    search_term: queryParams.get("search_term") || "",
    status: queryParams.get("status") || "",
    department: queryParams.get("department") || "",
    warehouse: queryParams.get("warehouse") || "",
  });

  // 날짜 파라미터
  const [dateParams, setDateParams] = useState({
    start_date: validateDate(queryParams.get("start_date")) || getOneWeekAgo(),
    end_date: validateDate(queryParams.get("end_date")) || getCurrentDate(),
  });

  // 필터 상태
  const [searchTerm, setSearchTerm] = useState(
    queryParams.get("search_term") || ""
  );
  const [statusFilter, setStatusFilter] = useState(
    queryParams.get("status") || ""
  );
  const [departmentFilter, setDepartmentFilter] = useState(
    queryParams.get("department") || ""
  );
  const [warehouseFilter, setWarehouseFilter] = useState(
    queryParams.get("warehouse") || ""
  );

  // URL 업데이트 함수
  const updateURL = useCallback(
    (params) => {
      const newParams = new URLSearchParams();

      // 필수 파라미터 설정
      if (params.page && params.page > 1) newParams.set("page", params.page);
      if (params.size && params.size !== 10) newParams.set("size", params.size);

      // 날짜 파라미터 설정 (미래 날짜 수정)
      if (params.start_date)
        newParams.set("start_date", validateDate(params.start_date));
      if (params.end_date)
        newParams.set("end_date", validateDate(params.end_date));

      // 검색 및 필터 파라미터 설정
      if (params.search_term) newParams.set("search_term", params.search_term);
      if (params.status) newParams.set("status", params.status);
      if (params.department) newParams.set("department", params.department);
      if (params.warehouse) newParams.set("warehouse", params.warehouse);

      // 현재 URL 유지하면서 쿼리 파라미터만 업데이트
      navigate(`${location.pathname}?${newParams.toString()}`, {
        replace: true,
      });
    },
    [location.pathname, navigate]
  );

  // 검색 처리 함수
  const handleSearch = useCallback(
    (values) => {
      try {
        let start_date = "";
        let end_date = "";

        // 날짜 범위 설정
        if (values.date_range && values.date_range.length === 2) {
          if (values.date_range[0]) {
            start_date = values.date_range[0].format("YYYY-MM-DD");
          }
          if (values.date_range[1]) {
            end_date = values.date_range[1].format("YYYY-MM-DD");
          }
        }

        // 날짜 유효성 검증
        start_date = validateDate(start_date) || getOneWeekAgo();
        end_date = validateDate(end_date) || getCurrentDate();

        // 시작일이 종료일보다 늦은 경우 교체
        if (dayjs(start_date).isAfter(dayjs(end_date))) {
          [start_date, end_date] = [end_date, start_date];
          message.info("시작일이 종료일보다 늦어 자동으로 조정되었습니다.");
        }

        // 검색 필터 설정
        const search_term = values.search_term || "";
        const status = values.status || "";
        const department = values.department || "";
        const warehouse = values.warehouse || "";

        // 필터 상태 업데이트
        setSearchTerm(search_term);
        setStatusFilter(status);
        setDepartmentFilter(department);
        setWarehouseFilter(warehouse);

        // 날짜 파라미터 업데이트
        setDateParams({
          start_date,
          end_date,
        });

        // 검색 파라미터 업데이트
        const newParams = {
          page: 1, // 검색 시 첫 페이지로 이동
          size: searchParams.size,
          start_date,
          end_date,
          search_term,
          status,
          department,
          warehouse,
        };

        setSearchParams(newParams);
        updateURL(newParams);
      } catch (error) {
        console.error("검색 처리 오류:", error);
        message.error("검색 처리 중 오류가 발생했습니다.");

        // 오류 발생 시 기본값으로 설정
        const defaultParams = {
          page: 1,
          size: 10,
          start_date: getOneWeekAgo(),
          end_date: getCurrentDate(),
        };

        setDateParams({
          start_date: defaultParams.start_date,
          end_date: defaultParams.end_date,
        });

        setSearchParams(defaultParams);
        updateURL(defaultParams);
      }
    },
    [searchParams.size, updateURL]
  );

  // 검색 초기화 함수
  const handleReset = useCallback(() => {
    const defaultParams = {
      page: 1,
      size: 10,
      start_date: getOneWeekAgo(),
      end_date: getCurrentDate(),
      search_term: "",
      status: "",
      department: "",
      warehouse: "",
    };

    // 필터 상태 초기화
    setSearchTerm("");
    setStatusFilter("");
    setDepartmentFilter("");
    setWarehouseFilter("");

    // 날짜 파라미터 초기화
    setDateParams({
      start_date: defaultParams.start_date,
      end_date: defaultParams.end_date,
    });

    setSearchParams(defaultParams);
    updateURL(defaultParams);
  }, [updateURL]);

  // 페이지 변경 처리
  const handlePageChange = useCallback(
    (page, pageSize) => {
      const newParams = {
        ...searchParams,
        page,
        size: pageSize,
      };

      setSearchParams(newParams);
      updateURL(newParams);
    },
    [searchParams, updateURL]
  );

  // 데이터 새로고침
  const refreshData = useCallback(() => {
    updateURL(searchParams);
  }, [searchParams, updateURL]);

  useEffect(() => {
    // URL 쿼리 파라미터 변경 감지
    const newPage = parseInt(queryParams.get("page") || "1", 10);
    const newSize = parseInt(queryParams.get("size") || "10", 10);

    if (newPage !== searchParams.page || newSize !== searchParams.size) {
      setSearchParams((prev) => ({
        ...prev,
        page: newPage,
        size: newSize,
      }));
    }
  }, [location.search, queryParams, searchParams.page, searchParams.size]);

  const queryClient = useQueryClient();

  // 권한에 따른 쿼리 키 설정
  const queryKey = userRole === "ADMIN" ? "admin-dashboards" : "dashboards";

  // 날짜 기준 데이터 조회
  const {
    data: rawData,
    isLoading,
    refetch,
    error,
  } = useQuery([queryKey, dateParams], () => fetchDashboards(dateParams), {
    keepPreviousData: true,
    onError: (error) => {
      // 422 에러가 발생한 경우 (미래 날짜 등)
      if (error.response?.status === 422) {
        // 현재 날짜로 자동 복구
        const today = getCurrentDate();
        const oneWeekAgo = getOneWeekAgo();

        message.warning("유효하지 않은 날짜입니다. 오늘 기준으로 설정합니다.");

        const newDateParams = {
          start_date: oneWeekAgo,
          end_date: today,
        };

        setDateParams(newDateParams);

        // 검색 파라미터도 함께 업데이트
        setSearchParams((prev) => ({
          ...prev,
          ...newDateParams,
        }));

        // URL도 업데이트
        updateURL({
          ...searchParams,
          ...newDateParams,
        });
      } else {
        handleApiError(error, {
          context: "데이터 로딩",
          showMessage: true,
        });
      }
    },
    retry: 1, // 1번만 재시도
  });

  // 클라이언트에서 필터링된 데이터
  const filteredData = useMemo(() => {
    const items = rawData?.data?.data || [];
    return filterData(items, {
      search_term: searchTerm,
      status: statusFilter,
      department: departmentFilter,
      warehouse: warehouseFilter,
    });
  }, [rawData, searchTerm, statusFilter, departmentFilter, warehouseFilter]);

  // 현재 페이지 데이터
  const paginatedData = useMemo(() => {
    const { page, size } = searchParams;
    const startIndex = (page - 1) * size;
    return filteredData.slice(startIndex, startIndex + size);
  }, [filteredData, searchParams]);

  // 필터 옵션 생성 (동적 필터 옵션)
  const filterOptions = useMemo(() => {
    const data = rawData?.data?.data || [];
    return {
      status: getUniqueFilterOptions(data, "status"),
      department: getUniqueFilterOptions(data, "department"),
      warehouse: getUniqueFilterOptions(data, "warehouse"),
    };
  }, [rawData]);

  // 데이터 유효성 검증
  const validateData = (data) => {
    if (!Array.isArray(data)) {
      console.warn("대시보드 데이터가 배열이 아닙니다:", data);
      return false;
    }

    // 최소한의 필수 필드가 있는지 확인
    const hasValidStructure = data.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof item.dashboard_id === "number" &&
        typeof item.status === "string"
    );

    if (!hasValidStructure) {
      console.warn(
        "일부 대시보드 데이터 항목이 유효하지 않은 구조를 가지고 있습니다:",
        data
      );
      return false;
    }

    return true;
  };

  // 데이터가 로드된 후 유효성 검증
  if (rawData?.data?.data && !validateData(rawData.data.data)) {
    message.warning(
      "일부 데이터가 예상된 형식과 일치하지 않습니다. 새로고침 해보세요."
    );
  }

  return {
    data: paginatedData,
    originalData: rawData?.data?.data || [],
    filteredData,
    totalItems: filteredData.length,
    isLoading,
    dateParams,
    searchParams,
    filterOptions,
    pagination: {
      ...searchParams,
      total: filteredData.length,
    },
    searchTerm,
    statusFilter,
    departmentFilter,
    warehouseFilter,
    handleSearch,
    handleReset,
    handlePageChange,
    refreshData,
    setDateParams,
  };
};

// PropTypes 정의
useDashboardData.propTypes = {
  userRole: PropTypes.oneOf(["ADMIN", "USER"]),
};

export default useDashboardData;
