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
    resave: true, // 세션 만료 시간을 갱신하도록 true로 설정
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // XSS 방지
      secure: false, // 개발 환경에서는 false로 설정 (HTTPS 사용 안함)
      maxAge: 24 * 60 * 60 * 1000, // 24시간 (1일)
      path: '/',
      sameSite: 'lax', // 기본값으로 설정
    },
    name: 'teckwah.sid', // 세션 쿠키 이름 지정 (모든 로직에서 일관되게 사용)
  })
);

// 세션 요청 확인용 디버깅 미들웨어 추가
app.use((req, res, next) => {
  // API 요청만 간략히 로깅
  if (
    req.path.startsWith('/auth/') ||
    req.path.startsWith('/dashboard/') ||
    req.path.startsWith('/handover/') ||
    req.path.startsWith('/users/')
  ) {
    console.log(`API 요청: ${req.method} ${req.path}`);
  }

  next();
});

// 6. 기본 보안 헤더 - 필수적인 것만 설정
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  return next();
});

// 7. 정적 파일 서빙 설정
const staticPath = path.join(__dirname, '..', 'frontend');

// 정적 파일 존재 여부 확인
if (!require('fs').existsSync(staticPath)) {
  console.error('오류: 정적 파일 디렉토리가 존재하지 않습니다.');
  process.exit(1);
} else {
  console.log('정적 파일 경로 확인 완료:', staticPath);
}

// 정적 파일 서빙 옵션
const serveOptions = {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.js') {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (ext === '.css') {
      res.setHeader('Content-Type', 'text/css');
    } else if (ext === '.html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (ext === '.ico') {
      res.setHeader('Content-Type', 'image/x-icon');
    }
  },
  // favicon.ico 요청이 정적 파일로 처리되도록 index 옵션 추가
  index: ['index.html', 'favicon.ico'],
};

// 정적 파일 먼저 서빙 - API 라우트보다 앞에 위치
app.use(express.static(staticPath, serveOptions));

// 루트 경로 리다이렉트 - 정적 파일 다음에 위치
app.get('/', (req, res) => {
  return res.redirect('/dashboard/list');
});

// API 라우트 설정
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/handover', handoverRoutes);
app.use('/users', userRoutes);

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// API 경로가 아닌 모든 요청은 React 앱으로 라우팅
app.get('*', (req, res) => {
  // API나 애셋 파일 확인
  const isAsset =
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(req.path);

  // API 경로 확인
  const isAPI =
    req.path.startsWith('/auth/') ||
    req.path.startsWith('/dashboard/') ||
    req.path.startsWith('/handover/') ||
    req.path.startsWith('/users/') ||
    req.path === '/health';

  // index.html 파일 전송 (SPA 라우팅)
  if (!isAsset && !isAPI) {
    console.log('SPA 라우팅 요청:', req.path);

    const indexPath = path.join(__dirname, '..', 'frontend', 'index.html');

    if (require('fs').existsSync(indexPath)) {
      // HTML 파일로 명시적 설정 및 캐싱 비활성화
      res.set({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });

      // 파일 전송
      return res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('index.html 전송 오류:', err);
          return res.status(500).send('서버 오류가 발생했습니다.');
        }
      });
    } else {
      console.error('index.html 파일을 찾을 수 없습니다');
      return res
        .status(500)
        .send('서버 오류: 프론트엔드 파일을 찾을 수 없습니다.');
    }
  }

  // API 또는 애셋 요청이면 다음 라우터로 진행 (404로 처리될 것)
  res.status(404).send('Not Found');
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
