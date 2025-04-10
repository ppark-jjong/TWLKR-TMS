/**
 * 애플리케이션 전체에서 사용되는 공통 스타일
 * 인라인 스타일 제거하고 일관성 있는 디자인을 유지하기 위한 중앙 집중식 스타일 관리
 */

// 색상 팔레트
export const colors = {
  primary: "#1890ff",
  success: "#52c41a",
  warning: "#faad14",
  error: "#f5222d",
  dark: "#001529",
  light: "#f0f2f5",
  border: "#e8e8e8",
  text: {
    primary: "rgba(0, 0, 0, 0.85)",
    secondary: "rgba(0, 0, 0, 0.45)",
    disabled: "rgba(0, 0, 0, 0.25)",
  },
  background: {
    light: "#ffffff",
    dark: "#f0f2f5",
    hover: "rgba(24, 144, 255, 0.1)",
  },
  white: "#ffffff",
  black: "#000000",

  // 상태 표시 색상
  statusColors: {
    PENDING: "#faad14", // 대기 중 - 노란색
    ASSIGNED: "#52c41a", // 배차 완료 - 초록색
    IN_PROGRESS: "#1890ff", // 진행 중 - 파란색
    COMPLETE: "#52c41a", // 완료 - 초록색
    ISSUE: "#f5222d", // 이슈 - 빨간색
    CANCEL: "#d9d9d9", // 취소 - 회색
  },
};

// 그림자 효과
export const shadows = {
  small: "0 2px 8px rgba(0, 0, 0, 0.15)",
  medium: "0 4px 12px rgba(0, 0, 0, 0.15)",
  large: "0 8px 16px rgba(0, 0, 0, 0.15)",
};

// 간격
export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
};

// 반응형 브레이크포인트
export const breakpoints = {
  xs: "480px",
  sm: "576px",
  md: "768px",
  lg: "992px",
  xl: "1200px",
  xxl: "1600px",
};

// 컴포넌트 스타일
export const components = {
  card: {
    default: {
      borderRadius: "4px",
      boxShadow: shadows.small,
      marginBottom: spacing.md,
    },
    hoverable: {
      transition: "all 0.3s",
      "&:hover": {
        boxShadow: shadows.medium,
        transform: "translateY(-2px)",
      },
    },
  },
  button: {
    primary: {
      backgroundColor: colors.primary,
      color: colors.white,
      border: "none",
    },
    success: {
      backgroundColor: colors.success,
      color: colors.white,
      border: "none",
    },
    warning: {
      backgroundColor: colors.warning,
      color: colors.white,
      border: "none",
    },
    error: {
      backgroundColor: colors.error,
      color: colors.white,
      border: "none",
    },
  },
  table: {
    header: {
      backgroundColor: colors.background.light,
      fontWeight: "bold",
    },
    row: {
      hover: {
        backgroundColor: colors.background.hover,
      },
    },
  },
};

// 애니메이션
export const animations = {
  fadeIn: "fade-in 0.3s ease-in-out",
  slideIn: "slide-in 0.3s ease-in-out",
  pulse: "pulse 1.5s infinite",
};

// z-index 관리
export const zIndex = {
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
  notification: 1600,
};

export default {
  colors,
  shadows,
  spacing,
  breakpoints,
  components,
  animations,
  zIndex,
};
