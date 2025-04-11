const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { sequelize } = require('./config/database');
const authRoutes = require('./routes/AuthRoutes');
const dashboardRoutes = require('./routes/DashboardRoutes');
const handoverRoutes = require('./routes/HandoverRoutes');
const userRoutes = require('./routes/UserRoutes');
const errorHandler = require('./middlewares/ErrorMiddleware');
const { requestLogger } = require('./middlewares/LoggingMiddleware');

// 환경변수 설정
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, '..', '.env') 
    : path.join(__dirname, '..', 'deploy', '.env'),
});

const app = express();
const PORT = process.env.PORT || 3000;

// 요청 로깅 미들웨어 (가장 먼저 적용)
app.use(requestLogger);

// 보안 미들웨어
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production', // 프로덕션에서만 활성화
  })
);

// CORS 설정
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
    credentials: true,
  })
);

// 기본 미들웨어
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 기본 보안 헤더
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  return next();
});

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// API 라우트
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/handover', handoverRoutes);
app.use('/users', userRoutes);

// React 정적 파일 서빙 (프로덕션 환경)
if (process.env.NODE_ENV === 'production') {
  // 정적 파일 제공
  app.use(express.static(path.join(__dirname, '..', 'frontend/build')));
  
  // API 경로가 아닌 모든 요청은 React 앱으로 라우팅
  app.get('*', (req, res, next) => {
    // API 경로가 아닌 경우에만 React 앱으로 라우팅
    if (!req.path.startsWith('/auth') && 
        !req.path.startsWith('/dashboard') && 
        !req.path.startsWith('/handover') && 
        !req.path.startsWith('/users') && 
        !req.path.startsWith('/health')) {
      res.sendFile(path.join(__dirname, '..', 'frontend/build', 'index.html'));
    } else {
      next();
    }
  });
}

// 에러 핸들러 (마지막에 위치)
app.use(errorHandler);

// 서버 시작
async function startServer() {
  try {
    // 데이터베이스 연결 확인
    await sequelize.authenticate();
    console.log('데이터베이스 연결 성공');

    // 개발환경에서만 모델과 테이블 동기화 (주의: 프로덕션에서는 사용하지 않음)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('모델과 테이블 동기화 완료');
    }

    app.listen(PORT, () => {
      console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
      console.log(`환경: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  }
}

startServer();
