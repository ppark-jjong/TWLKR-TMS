const winston = require("winston");
const { format, transports } = winston;
const path = require("path");
const DailyRotateFile = require("winston-daily-rotate-file");

// 환경 변수 로드
require("dotenv").config({
  path: path.join(__dirname, "../../../deploy", ".env"),
});

// 로그 레벨 설정
const logLevel = process.env.LOG_LEVEL || "info";

// 로그 포맷 설정
const logFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }),
  format.splat(),
  format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    let metaStr = "";

    if (meta && Object.keys(meta).length) {
      if (meta.stack) {
        metaStr = `\n${meta.stack}`;
      } else {
        try {
          metaStr = `\n${JSON.stringify(meta, null, 2)}`;
        } catch (e) {
          metaStr = `\n[메타데이터 직렬화 실패]`;
        }
      }
    }

    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  })
);

// 로깅 옵션
const options = {
  file: {
    level: logLevel,
    dirname: path.join(__dirname, "../../../logs"),
    filename: "%DATE%-app.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
    format: logFormat,
  },
  console: {
    level: "debug",
    format: format.combine(format.colorize(), logFormat),
  },
  error: {
    level: "error",
    dirname: path.join(__dirname, "../../../logs"),
    filename: "%DATE%-error.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
    format: logFormat,
  },
};

// 로거 생성
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: "teckwah-dashboard" },
  transports: [
    // 일반 로그 파일 (일별 로테이션)
    new DailyRotateFile(options.file),

    // 에러 로그 파일 (일별 로테이션)
    new DailyRotateFile(options.error),

    // 콘솔 출력 (개발 환경)
    new transports.Console(options.console),
  ],
  exitOnError: false,
});

// Express 요청 로그 포맷
const requestLogger = (req, res, next) => {
  const start = new Date();

  // 응답 완료 이벤트에 로깅 추가
  res.on("finish", () => {
    const responseTime = new Date() - start;
    const { method, url, ip, headers, params, query, body } = req;

    // 중요한 정보 제외
    const safeBody = { ...body };
    if (safeBody.password) safeBody.password = "[REDACTED]";
    if (safeBody.refresh_token) safeBody.refresh_token = "[REDACTED]";

    const logData = {
      method,
      url,
      ip,
      requestId: req.requestId,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: headers["user-agent"],
      referer: headers.referer || "",
      userId: req.user ? req.user.user_id : "anonymous",
    };

    // 오류 발생 시 상세 정보 로깅
    if (res.statusCode >= 400) {
      logger.warn(`${method} ${url} ${res.statusCode}`, {
        ...logData,
        params,
        query,
        body: safeBody,
      });
    }
    // 성능 이슈 있는 요청 로깅
    else if (responseTime > 1000) {
      logger.warn(`느린 응답 ${method} ${url} (${responseTime}ms)`, logData);
    }
    // 일반 요청 로깅 (개발 환경에서만)
    else if (process.env.NODE_ENV === "development") {
      logger.info(`${method} ${url} ${res.statusCode}`, logData);
    }
  });

  next();
};

module.exports = {
  logger,
  requestLogger,
};
