const { v4: uuidv4 } = require('uuid');

/**
 * 요청 ID 생성 및 로깅 미들웨어
 * 중요 요청만 간소화된 로그로 출력합니다.
 */
const requestLogger = (req, res, next) => {
  // 요청 ID 생성 및 할당
  const requestId = uuidv4();
  req.requestId = requestId;
  
  // 원본 응답 메소드를 저장
  const originalSend = res.send;
  
  // 응답 시작 시간 기록
  const startTime = Date.now();
  
  // 정적 파일이 아닌 요청만 로깅 (JS, CSS, 이미지, 아이콘 제외)
  const isStaticFile = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(req.url);
  const isApiRoute = /^\/(auth|dashboard|handover|users)/i.test(req.url);
  
  // API 요청만 간결하게 로깅 (세션 정보 없이)
  if (!isStaticFile && isApiRoute) {
    console.log(`[${requestId.substring(0, 8)}] ${req.method} ${req.url}`);
  }
  
  // 응답 메소드 오버라이드
  res.send = function(body) {
    // 응답 시간 계산
    const responseTime = Date.now() - startTime;
    
    // 에러 응답과 중요 API만 로깅
    if (res.statusCode >= 400) {
      console.error(`[${requestId.substring(0, 8)}] ${req.method} ${req.url} 오류: ${res.statusCode} (${responseTime}ms)`);
    } else if (!isStaticFile && isApiRoute && req.method !== 'GET') {
      // POST, PUT, DELETE 등의 변경 요청만 성공 로그 출력 (간결하게)
      console.log(`[${requestId.substring(0, 8)}] ${req.method} ${req.url} 완료: ${res.statusCode} (${responseTime}ms)`);
    }
    
    // 원본 응답 메소드 호출
    return originalSend.call(this, body);
  };
  
  // 요청 ID를 응답 헤더에 추가
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

module.exports = { requestLogger };