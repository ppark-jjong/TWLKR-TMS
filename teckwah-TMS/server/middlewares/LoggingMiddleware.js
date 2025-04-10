const { v4: uuidv4 } = require('uuid');

/**
 * 요청 ID 생성 및 로깅 미들웨어
 * 각 요청에 고유 ID를 부여하고 요청/응답 정보를 로깅합니다.
 */
const requestLogger = (req, res, next) => {
  // 요청 ID 생성 및 할당
  const requestId = uuidv4();
  req.requestId = requestId;
  
  // 원본 응답 메소드를 저장
  const originalSend = res.send;
  
  // 응답 시작 시간 기록
  const startTime = Date.now();
  
  // 요청 정보 로깅
  console.log(`[${requestId}] ${req.method} ${req.url} 요청 수신`);
  
  // 응답 메소드 오버라이드
  res.send = function(body) {
    // 응답 시간 계산
    const responseTime = Date.now() - startTime;
    
    // 응답 정보 로깅 (에러 응답은 별도 처리)
    if (res.statusCode >= 400) {
      console.error(`[${requestId}] ${req.method} ${req.url} 응답 상태: ${res.statusCode} - ${responseTime}ms`);
    } else {
      console.log(`[${requestId}] ${req.method} ${req.url} 응답 상태: ${res.statusCode} - ${responseTime}ms`);
    }
    
    // 원본 응답 메소드 호출
    return originalSend.call(this, body);
  };
  
  // 요청 ID를 응답 헤더에 추가
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

module.exports = { requestLogger };