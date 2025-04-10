/**
 * Ant Design 테마 설정 파일
 * 애플리케이션 전체의 Ant Design 컴포넌트에 적용되는 테마 변수를 정의합니다.
 *
 * 공통 스타일 (commonStyles.js)와 일관성을 유지하도록 주의해야 합니다.
 */

import { colors, spacing } from './CommonStyles';

// 폰트 크기 정의
const fontSizes = {
  xs: '12px',
  sm: '14px',
  md: '16px',
  lg: '20px',
  xl: '24px',
  xxl: '30px',
};

// Ant Design 5.x의 테마 변수
// 참고: https://github.com/ant-design/ant-design/blob/master/components/style/themes/default.less
export const themeVariables = {
  // 색상 관련
  colorPrimary: colors.primary,
  colorSuccess: colors.success,
  colorWarning: colors.warning,
  colorError: colors.error,
  colorInfo: colors.primary,
  colorTextBase: colors.text.primary,
  colorBgBase: colors.white,
  colorBgContainer: colors.white,
  colorBgElevated: colors.white,
  colorBgLayout: colors.light,
  colorTextSecondary: colors.text.secondary,
  colorTextTertiary: colors.text.disabled,
  colorBorder: colors.border,
  colorBorderSecondary: '#f0f0f0',

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
  borderRadius: 4,
  borderRadiusLG: 8,
  borderRadiusSM: 2,
  controlHeight: 32,
  controlHeightLG: 40,
  controlHeightSM: 24,
  boxShadow:
    '0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',

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

  // 폰트 및 텍스트
  fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`,

  // 애니메이션 관련
  motionUnit: 0.1,
  motionBase: 0,
  motionEaseOutCirc: 'cubic-bezier(0.08, 0.82, 0.17, 1)',
  motionEaseInOutCirc: 'cubic-bezier(0.78, 0.14, 0.15, 0.86)',
  motionEaseOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  motionEaseInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  motionEaseOutBack: 'cubic-bezier(0.12, 0.4, 0.29, 1.46)',
  motionEaseInBack: 'cubic-bezier(0.71, -0.46, 0.88, 0.6)',
  motionEaseInQuint: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
  motionEaseOutQuint: 'cubic-bezier(0.23, 1, 0.32, 1)',
};

export default themeVariables;
