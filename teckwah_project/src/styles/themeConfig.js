/**
 * Ant Design 테마 설정 파일
 * 애플리케이션 전체의 Ant Design 컴포넌트에 적용되는 테마 변수를 정의합니다.
 * 
 * 공통 스타일 (commonStyles.js)와 일관성을 유지하도록 주의해야 합니다.
 */

import { colors, fontSizes, spacing } from './commonStyles';

// Ant Design 5.x의 테마 변수
// 참고: https://github.com/ant-design/ant-design/blob/master/components/style/themes/default.less
export const themeVariables = {
  // 색상 관련
  colorPrimary: colors.primary,
  colorSuccess: colors.success,
  colorWarning: colors.warning,
  colorError: colors.error,
  colorText: colors.textPrimary,
  colorTextSecondary: colors.textSecondary,
  
  // 여백 관련
  marginXS: spacing.xs,
  marginSM: spacing.sm,
  margin: spacing.md,
  marginMD: spacing.md,
  marginLG: spacing.lg,
  marginXL: spacing.xl,
  marginXXL: spacing.xxl,
  
  paddingXS: spacing.xs,
  paddingSM: spacing.sm,
  padding: spacing.md,
  paddingMD: spacing.md,
  paddingLG: spacing.lg,
  paddingXL: spacing.xl,
  
  // 폰트 크기
  fontSizeSM: fontSizes.sm,
  fontSize: fontSizes.md,
  fontSizeLG: fontSizes.lg,
  fontSizeXL: fontSizes.xl,
  
  // 기타
  borderRadius: '4px',
  borderRadiusLG: '8px',
  boxShadow: '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
  
  // 컴포넌트별 설정
  // 표 (Table) 관련
  tableHeaderBg: colors.background,
  tableHeaderColor: colors.textPrimary,
  tableHeaderSortActiveBg: '#e6f7ff',
  tableBodySortBg: '#fafafa',
  tableRowHoverBg: '#f5f5f5',
  
  // 버튼 (Button) 관련
  buttonPrimaryBg: colors.primary,
  buttonDefaultBg: colors.white,
  buttonDefaultBorderColor: colors.border,
  buttonFontWeight: 'normal',
  
  // 입력 필드 (Input) 관련
  inputBorderColor: colors.border,
  inputHoverBorderColor: colors.primary,
  inputBorderRadius: '4px',
  
  // 모달 (Modal) 관련
  modalHeaderBg: colors.white,
  modalBodyPadding: spacing.lg,
  modalFooterBg: colors.white,
  modalMaskBg: 'rgba(0, 0, 0, 0.45)',
  
  // 폼 (Form) 관련
  formItemMarginBottom: spacing.md,
  formLabelRequiredMarkColor: colors.error,
  
  // 알림 (Notification & Message) 관련
  notificationBg: colors.white,
  notificationPadding: spacing.md,
  messagePadding: `${spacing.sm} ${spacing.md}`,
};

export default themeVariables;