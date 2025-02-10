// src/utils/dateUtils.js
import { format, parse } from "date-fns";

/**
 * Date 객체를 YYYY-MM-DD 형식의 문자열로 변환
 * @param {Date} date - 변환할 날짜
 * @returns {string} 포맷된 날짜 문자열
 */
export const formatDate = (date) => {
  return format(date, "yyyy-MM-dd");
};

/**
 * Date 객체를 YYYY-MM-DD HH:mm 형식의 문자열로 변환
 * @param {Date} date - 변환할 날짜
 * @returns {string} 포맷된 날짜/시간 문자열
 */
export const formatDateTime = (date) => {
  return format(date, "yyyy-MM-dd HH:mm");
};

/**
 * YYYY-MM-DD 형식의 문자열을 Date 객체로 변환
 * @param {string} dateStr - 변환할 날짜 문자열
 * @returns {Date} 변환된 Date 객체
 */
export const parseDate = (dateStr) => {
  return parse(dateStr, "yyyy-MM-dd", new Date());
};

/**
 * YYYY-MM-DD HH:mm 형식의 문자열을 Date 객체로 변환
 * @param {string} dateTimeStr - 변환할 날짜/시간 문자열
 * @returns {Date} 변환된 Date 객체
 */
export const parseDateTime = (dateTimeStr) => {
  return parse(dateTimeStr, "yyyy-MM-dd HH:mm", new Date());
};
