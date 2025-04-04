/**
 * 애플리케이션 전체에서 사용되는 공통 스타일
 * 인라인 스타일 제거하고 일관성 있는 디자인을 유지하기 위한 중앙 집중식 스타일 관리
 */

// 색상 팔레트
export const colors = {
  primary: '#1890ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#f5222d',
  background: '#f0f2f5',
  textPrimary: 'rgba(0, 0, 0, 0.85)',
  textSecondary: 'rgba(0, 0, 0, 0.45)',
  border: '#d9d9d9',
  white: '#ffffff',
  black: '#000000',
  
  // 상태 표시 색상
  statusColors: {
    PENDING: '#faad14',    // 대기 중 - 노란색
    ASSIGNED: '#52c41a',   // 배차 완료 - 초록색
    IN_PROGRESS: '#1890ff', // 진행 중 - 파란색
    COMPLETE: '#52c41a',   // 완료 - 초록색
    ISSUE: '#f5222d',       // 이슈 - 빨간색
    CANCEL: '#d9d9d9',     // 취소 - 회색
  }
};

// 여백 및 크기
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

// 폰트 크기
export const fontSizes = {
  xs: '12px',
  sm: '14px',
  md: '16px',
  lg: '20px',
  xl: '24px',
  xxl: '30px',
};

// 그림자 효과
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
};

// 반응형 브레이크 포인트
export const breakpoints = {
  xs: '480px',
  sm: '576px',
  md: '768px',
  lg: '992px',
  xl: '1200px',
  xxl: '1600px',
};

// 컴포넌트별 스타일
export const componentStyles = {
  // 카드 스타일
  card: {
    default: {
      borderRadius: '4px',
      boxShadow: shadows.sm,
      marginBottom: spacing.md,
    },
    hoverable: {
      transition: 'all 0.3s',
      '&:hover': {
        boxShadow: shadows.md,
        transform: 'translateY(-2px)',
      },
    },
  },
  
  // 버튼 스타일
  button: {
    sm: {
      fontSize: fontSizes.xs,
      padding: `${spacing.xs} ${spacing.sm}`,
    },
    md: {
      fontSize: fontSizes.sm,
      padding: `${spacing.sm} ${spacing.md}`,
    },
    lg: {
      fontSize: fontSizes.md,
      padding: `${spacing.md} ${spacing.lg}`,
    },
  },
  
  // 모달 스타일
  modal: {
    small: {
      width: '400px',
    },
    medium: {
      width: '600px',
    },
    large: {
      width: '800px',
    },
    xlarge: {
      width: '1000px',
    },
  },
  
  // 테이블 스타일
  table: {
    header: {
      backgroundColor: colors.background,
      fontWeight: 'bold',
    },
    row: {
      hover: {
        backgroundColor: '#f5f5f5',
      },
      stripe: {
        even: {
          backgroundColor: colors.white,
        },
        odd: {
          backgroundColor: '#fafafa',
        },
      },
    },
  },
  
  // 폼 스타일
  form: {
    label: {
      fontWeight: 'bold',
      marginBottom: spacing.xs,
    },
    item: {
      marginBottom: spacing.md,
    },
    error: {
      color: colors.error,
      marginTop: spacing.xs,
    },
  },
  
  // 레이아웃 스타일
  layout: {
    container: {
      padding: spacing.md,
      maxWidth: '1200px',
      margin: '0 auto',
    },
    section: {
      marginBottom: spacing.xl,
    },
    header: {
      padding: `${spacing.md} 0`,
      borderBottom: `1px solid ${colors.border}`,
      marginBottom: spacing.lg,
    },
    footer: {
      padding: `${spacing.lg} 0`,
      borderTop: `1px solid ${colors.border}`,
      marginTop: spacing.lg,
    },
  },
  
  // 로딩 스피너 스타일
  loading: {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
  },
};

// 미디어 쿼리 헬퍼 함수
export const mediaQuery = {
  xs: `@media (max-width: ${breakpoints.xs})`,
  sm: `@media (max-width: ${breakpoints.sm})`,
  md: `@media (max-width: ${breakpoints.md})`,
  lg: `@media (max-width: ${breakpoints.lg})`,
  xl: `@media (max-width: ${breakpoints.xl})`,
  xxl: `@media (max-width: ${breakpoints.xxl})`,
};

// 애니메이션
export const animations = {
  fadeIn: 'fade-in 0.3s ease-in-out',
  slideIn: 'slide-in 0.3s ease-in-out',
  pulse: 'pulse 1.5s infinite',
};

// z-index 값
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
  spacing,
  fontSizes,
  shadows,
  breakpoints,
  componentStyles,
  mediaQuery,
  animations,
  zIndex,
};
