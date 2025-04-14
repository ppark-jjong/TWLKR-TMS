const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const session = require('express-session');
const { sequelize } = require('./config/Database');
const authRoutes = require('./routes/AuthRoutes');
const dashboardRoutes = require('./routes/DashboardRoutes');
const handoverRoutes = require('./routes/HandoverRoutes');
const userRoutes = require('./routes/UserRoutes');
const errorHandler = require('./middlewares/ErrorMiddleware');
const { requestLogger } = require('./middlewares/LoggingMiddleware');

// 환경변수 설정 - 단일 컨테이너 환경에 맞게 단순화
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const app = express();
const PORT = process.env.PORT || 8080;

// 미들웨어 적용 - 순서 최적화
// 1. 요청 로깅 (가장 먼저 적용)
app.use(requestLogger);

// 2. 보안 미들웨어 - 기본 설정으로 단순화
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production', // 프로덕션에서만 활성화
  })
);

// 3. CORS 설정 - 기본값 사용
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS,
    credentials: true,
  })
);

// 4. 기본 미들웨어
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 5. 세션 설정 - 메모리 스토어 사용 (루트 명세서 4.5 보안 설계 원칙에 따름)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'teckwah-tms-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // XSS 방지
      secure: process.env.NODE_ENV === 'production', // 프로덕션에서만 secure 활성화
      maxAge: 24 * 60 * 60 * 1000, // 24시간 (1일)
      path: '/',
      sameSite: 'lax', // 기본값으로 설정
    },
    name: 'teckwah.sid', // 세션 쿠키 이름 지정 (모든 로직에서 일관되게 사용)
  })
);

// 세션 디버깅 미들웨어 - 개발 환경에서만 활성화
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    if (req.session && req.session.user) {
      console.log(`세션 활성화 - 사용자: ${req.session.user.user_id}`);
    }
    next();
  });
}

// 세션 디버깅 미들웨어는 삭제 (과도한 로깅 방지)

// 6. 기본 보안 헤더 - 필수적인 것만 설정
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  return next();
});

// 6. API 라우트 - 더 명확한 라우팅 설정
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/handover', handoverRoutes);
app.use('/users', userRoutes);

// 라우팅 디버깅 코드 제거 (과도한 로깅 방지)

// 7. 간단한 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// 8. React 정적 파일 서빙 (모든 환경에서 활성화)
// 명시적인 MIME 타입 설정
const serveOptions = {
  setHeaders: (res, filePath) => {
    // 파일 확장자에 따라 적절한 MIME 타입 설정
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.js') {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (ext === '.css') {
      res.setHeader('Content-Type', 'text/css');
    } else if (ext === '.html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (ext === '.json') {
      res.setHeader('Content-Type', 'application/json');
    }
  },
};

// 빌드 디렉토리 검사 - 시작 시 한 번만 실행
// Docker 환경에서는 /app/frontend에 빌드 결과물이 복사됨
const staticPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '..', 'frontend') // Docker 환경
  : path.join(__dirname, '..', 'frontend/build'); // 로컬 개발 환경

console.log('===== 빌드 파일 검사 =====');
console.log(`정적 파일 경로: ${staticPath}`);
if (require('fs').existsSync(staticPath)) {
  console.log('빌드 디렉토리 존재함');
  const files = require('fs').readdirSync(staticPath);
  console.log('파일 목록:', files);
  
  // JS 파일 확인
  const jsFiles = files.filter(f => f.endsWith('.js'));
  console.log('JS 파일:', jsFiles);
  
  // CSS 파일 확인
  const cssFiles = files.filter(f => f.endsWith('.css'));
  console.log('CSS 파일:', cssFiles);
} else {
  console.error('빌드 디렉토리가 존재하지 않음! 경로를 확인해주세요.');
  console.log('현재 경로:', __dirname);
  console.log('찾는 경로:', staticPath);
}

// 정적 파일 제공 - Docker 환경을 고려한 경로 설정
app.use(express.static(staticPath, serveOptions));

// API 경로가 아닌 모든 요청은 React 앱으로 라우팅
app.get('*', (req, res) => {
  // 최소한의 로깅
  const isAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(req.path);
  
  // API 경로 테스트
  const isAPI = req.path.startsWith('/auth/') || req.path.startsWith('/dashboard/') || 
                req.path.startsWith('/handover/') || req.path.startsWith('/users/') ||
                req.path === '/health';
  
  // 정적 파일이나 API가 아닌 요청일 경우에만 로깅
  if (!isAsset && !isAPI) {
    console.log('SPA 라우팅 요청:', req.path);
    
    // 브라우저 정보 확인
    console.log('User-Agent:', req.headers['user-agent']);
  }
  
  // index.html 파일 전송 - Docker 환경을 고려한 경로
  const indexPath = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, '..', 'frontend', 'index.html') // Docker 환경
    : path.join(__dirname, '..', 'frontend/build', 'index.html'); // 로컬 개발 환경
  
  if (require('fs').existsSync(indexPath)) {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(indexPath);
  } else {
    console.error('index.html 파일을 찾을 수 없습니다! 경로를 확인해주세요.');
    console.log('현재 경로:', __dirname);
    console.log('찾는 경로:', indexPath);
    res.status(500).send('서버 오류: 프론트엔드 빌드 파일을 찾을 수 없습니다.');
  }
});

// 9. 에러 핸들러 (마지막에 위치)
app.use(errorHandler);

// 서버 시작 함수
async function startServer() {
  try {
    // 데이터베이스 연결 확인
    await sequelize.authenticate();
    console.log('데이터베이스 연결 성공');

    // 서버 시작
    app.listen(PORT, () => {
      console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
      console.log(`환경: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  }
}

// 서버 시작
startServer();
