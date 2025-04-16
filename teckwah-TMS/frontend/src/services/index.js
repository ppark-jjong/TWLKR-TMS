/**
 * 서비스 모듈 통합 내보내기
 */
import api from './api';
import AuthService from './AuthService';
import DashboardService from './DashboardService';
import HandoverService from './HandoverService';
import UserService from './UserService';
import VisualizationService from './VisualizationService';
// PostalCodeService는 삭제함 - 우편번호 처리 로직은 DashboardService에 통합됨

export {
  api,
  AuthService,
  DashboardService,
  HandoverService,
  UserService,
  VisualizationService
};
