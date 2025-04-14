const { v4: uuidv4 } = require('uuid');

/**
 * 간소화된 로깅 미들웨어 - 중요 API와 오류만 기록
 */
const requestLogger = (req, res, next) => {
  // 요청 ID 생성
  const requestId = uuidv4().substring(0, 8);
  req.requestId = requestId;
  
  // 원본 응답 메소드 저장
  const originalSend = res.send;
  
  // 응답 시작 시간 기록
  const startTime = Date.now();
  
  // 정적 파일이 아닌 API 요청인지 확인
  const isStaticFile = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(req.url);
  const isApiRoute = /^\/(auth|dashboard|handover|users)/i.test(req.url);
  
  // 응답 메소드 오버라이드 - 최소한의 로그만 출력
  res.send = function(body) {
    // 오류 응답만 로깅
    if (res.statusCode >= 400 && isApiRoute) {
      console.error(`오류: ${req.method} ${req.url} (${res.statusCode})`);
    }
    
    // 원본 응답 메소드 호출
    return originalSend.call(this, body);
  };
  
  // 요청 ID 헤더 추가
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

module.exports = { requestLogger };