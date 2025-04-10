const winston = require('winston');
const { format, transports } = winston;

// 로그 포맷 설정
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaString}`;
  })
);

// 로거 생성
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    // 콘솔 출력
    new transports.Console({
      format: format.combine(
        format.colorize(),
        logFormat
      )
    }),
    
    // 파일 로깅 (development 또는 production 환경에서만)
    ...(process.env.NODE_ENV !== 'test' ? [
      new transports.File({ 
        filename: 'logs/error.log', 
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new transports.File({ 
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ] : [])
  ]
});

// 개발 환경에서 디버그 목적으로 사용되는 간단 래퍼
const debug = (message, meta = {}) => {
  logger.debug(message, meta);
};

const info = (message, meta = {}) => {
  logger.info(message, meta);
};

const warn = (message, meta = {}) => {
  logger.warn(message, meta);
};

const error = (message, meta = {}) => {
  logger.error(message, meta);
};

module.exports = {
  debug,
  info,
  warn,
  error
};
