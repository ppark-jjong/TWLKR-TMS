const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/Logger");

const loggerMiddleware = (req, res, next) => {
  // 요청 ID 생성
  const requestId = uuidv4();
  req.requestId = requestId;

  // 요청 로깅
  logger.info(`요청 시작: ${req.method} ${req.originalUrl}`, {
    requestId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  // 응답 완료 시간 측정을 위한 시작 시간
  const start = Date.now();

  // 응답 완료 이벤트 리스너
  res.on("finish", () => {
    const duration = Date.now() - start;

    // 응답 상태에 따른 로그 레벨 결정
    const logLevel =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    // 응답 로깅
    logger[logLevel](
      `요청 완료: ${req.method} ${req.originalUrl} ${res.statusCode}`,
      {
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseTime: duration,
      }
    );
  });

  next();
};

module.exports = loggerMiddleware;
