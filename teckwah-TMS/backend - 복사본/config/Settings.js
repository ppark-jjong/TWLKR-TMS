// 통합 설정 파일
// 모든 설정은 .env 파일에서 로드됩니다.

// 앱 설정
module.exports = {
  // 서버 설정
  server: {
    port: process.env.PORT || 8000,
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    apiTimeout: parseInt(process.env.API_TIMEOUT || '10000', 10),
    projectName: process.env.PROJECT_NAME || '배송 실시간 관제 시스템'
  },
  
  // 인증 설정
  auth: {
    sessionSecret: process.env.SESSION_SECRET,
    sessionExpireHours: parseInt(process.env.SESSION_EXPIRE_HOURS || '24', 10)
  },
  
  // CORS 설정
  cors: {
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  
  // 로깅 설정
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    enableAccessLog: process.env.ENABLE_ACCESS_LOG === 'true',
    maxFiles: 5,
    maxSize: '5m'
  },
  
  // 락 관련 설정
  lock: {
    timeoutSeconds: parseInt(process.env.LOCK_TIMEOUT_SECONDS || '300', 10),
    cleanupIntervalMinutes: parseInt(process.env.LOCK_CLEANUP_INTERVAL_MINUTES || '10', 10),
    maxRetry: 0,  // 자동 재시도 없음 (사용자 명시적 액션만 허용)
    retryDelay: 0  // 재시도 지연 없음
  }
};