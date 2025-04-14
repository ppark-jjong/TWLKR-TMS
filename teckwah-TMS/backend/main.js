const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const session = require('express-session');
<<<<<<< HEAD
const fs = require('fs'); 
=======
>>>>>>> main
const { sequelize } = require('./config/Database');
const authRoutes = require('./routes/AuthRoutes');
const dashboardRoutes = require('./routes/DashboardRoutes');
const handoverRoutes = require('./routes/HandoverRoutes');
const userRoutes = require('./routes/UserRoutes');
const errorHandler = require('./middlewares/ErrorMiddleware');
const { requestLogger } = require('./middlewares/LoggingMiddleware');

<<<<<<< HEAD
// 환경변수 설정 - 통합된 .env 파일 사용 (루트 위치)
require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
=======
// 환경변수 설정 - 단일 컨테이너 환경에 맞게 단순화
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
>>>>>>> main
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
<<<<<<< HEAD
    origin: process.env.ALLOWED_ORIGINS || 'http://localhost:8080',
=======
    origin: process.env.ALLOWED_ORIGINS,
>>>>>>> main
    credentials: true,
  })
);

// 4. 기본 미들웨어
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 5. 세션 설정 - 메모리 스토어 사용
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'teckwah-tms-session-secret',
<<<<<<< HEAD
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // XSS 방지
      secure: process.env.NODE_ENV === 'production', // 프로덕션에서만 HTTPS 요구
=======
    resave: true, // 세션 만료 시간을 갱신하도록 true로 설정
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // XSS 방지
      secure: false, // 개발 환경에서는 false로 설정 (HTTPS 사용 안함)
>>>>>>> main
      maxAge: 24 * 60 * 60 * 1000, // 24시간 (1일)
      path: '/',
      sameSite: 'lax', // 기본값으로 설정
    },
<<<<<<< HEAD
    name: 'teckwah.sid', // 세션 쿠키 이름 지정
  })
);

// 6. 기본 보안 헤더 설정
=======
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
>>>>>>> main
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  return next();
});

<<<<<<< HEAD
// ======================================================
// 정적 파일 및 SPA 라우팅 설정
// ======================================================

// 파일 경로 설정 (도커 환경에 맞게 조정)
console.log(`현재 디렉토리: ${__dirname}`);

// 정적 파일 경로 - 개발 환경과 도커 환경 모두 지원
const publicPath = path.join(__dirname, '..', 'frontend', 'public');
const frontendPath = path.join(__dirname, '..', 'frontend');
console.log(`Frontend 경로: ${frontendPath}`);
console.log(`Public 경로: ${publicPath}`);

// public 폴더에 index.html이 있는지 확인
const indexPath = path.join(publicPath, 'index.html');
if (fs.existsSync(indexPath)) {
  console.log(`index.html 파일 확인: ${indexPath}`);
} else {
  console.error(`경고: index.html 파일 없음 - ${indexPath}`);
}

// 파비콘 직접 처리 (문제가 많이 발생하는 부분)
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(publicPath, 'favicon.ico');
  if (fs.existsSync(faviconPath)) {
    return res.sendFile(faviconPath);
  }
  return res.status(404).end();
});

// 정적 파일 서빙 (public 디렉토리만)
app.use(express.static(publicPath, {
  index: false, // index.html은 라우터에서 직접 처리
  setHeaders: (res, filePath) => {
    // 명시적인 MIME 타입 설정
=======
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
>>>>>>> main
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.js') {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (ext === '.css') {
      res.setHeader('Content-Type', 'text/css');
    } else if (ext === '.html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
<<<<<<< HEAD
    } else if (ext === '.json') {
      res.setHeader('Content-Type', 'application/json');
    } else if (ext === '.ico') {
      res.setHeader('Content-Type', 'image/x-icon');
    }
  }
}));

// ======================================================
// 인증 미들웨어
// ======================================================

// 인증 확인 미들웨어 - 로그인 상태 체크
const authCheck = (req, res, next) => {
  console.log(`인증 요청: ${req.path}, 세션ID: ${req.sessionID}`);
  
  // 인증이 필요없는 API 경로
  const publicPaths = ['/auth/login', '/auth/session', '/health'];
  if (publicPaths.includes(req.path)) {
    return next();
  }

  // 로그인 상태 확인
  if (!req.session || !req.session.user) {
    // API 요청인 경우 401 JSON 응답
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다',
        redirectTo: '/login'
      });
    }
    
    // 페이지 요청인 경우 로그인 페이지로 리다이렉션
    console.log(`인증 실패로 리다이렉션: ${req.path} -> /login`);
    return res.redirect('/login');
  }

  // 인증 성공
  next();
};

// ======================================================
// API 라우트 설정
// ======================================================

// 로그인 API는 인증 없이 접근 가능
app.use('/auth', authRoutes);

// 나머지 API는 인증 필요
app.use('/api/dashboard', authCheck, dashboardRoutes);
app.use('/api/handover', authCheck, handoverRoutes);
app.use('/api/users', authCheck, userRoutes);
app.use('/api/visualization', authCheck, require('./routes/VisualizationRoutes'));

// 헬스체크
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
=======
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
>>>>>>> main
});

// 이전 API 경로 지원 (하위 호환성)
app.use('/dashboard', (req, res, next) => {
  if (req.headers.accept?.includes('application/json')) {
    console.log(`레거시 API 요청 처리: /dashboard${req.path}`);
    return dashboardRoutes(req, res, next);
  }
  next(); // SPA 처리로 넘김
});
app.use('/handover', authCheck, handoverRoutes);
app.use('/users', authCheck, userRoutes);

// ======================================================
// 페이지 라우트 설정 (SPA)
// ======================================================

// 홈페이지 - 로그인 상태에 따라 리다이렉션
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    console.log('인증된 사용자: 대시보드로 이동');
    return res.redirect('/dashboard/list');
  }
  console.log('미인증 사용자: 로그인으로 이동');
  return res.redirect('/login');
});

// 로그인 페이지 (명시적 처리)
app.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    console.log('이미 로그인됨: 대시보드로 이동');
    return res.redirect('/dashboard/list');
  }
  
  console.log('로그인 페이지 요청');
  return res.sendFile(indexPath);
});

// 나머지 모든 경로는 SPA로 처리 (React Router가 담당)
app.get('*', (req, res, next) => {
  // API 요청 제외
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // 정적 파일 요청 제외
  if (path.extname(req.path)) {
    return next();
  }
  
  // SPA에서 처리할 경로인지 확인 (대시보드, 인수인계, 시각화, 사용자 관리 등)
  const spaRoutes = ['/dashboard', '/handover', '/visualization', '/users'];
  const isSpaRoute = spaRoutes.some(route => req.path.startsWith(route));
  
  if (isSpaRoute) {
    // 인증 확인
    if (!req.session || !req.session.user) {
      console.log(`인증되지 않은 페이지 접근: ${req.path} -> /login`);
      return res.redirect('/login');
    }
    
    console.log(`SPA 라우팅: ${req.path}`);
    return res.sendFile(indexPath);
  }
  
  // 처리되지 않은 경로
  console.log(`알 수 없는 경로: ${req.path}`);
  return res.sendFile(indexPath);
});

// ======================================================
// 오류 처리 및 서버 시작
// ======================================================

// 에러 핸들러 (항상 마지막에 위치)
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
